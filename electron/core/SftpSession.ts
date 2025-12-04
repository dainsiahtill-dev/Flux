import { Client, SFTPWrapper } from 'ssh2'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { BaseSession, SessionOptions } from './BaseSession'

export class SftpSession extends BaseSession {
  private conn: Client
  private sftp: SFTPWrapper | null = null

  constructor(options: SessionOptions) {
    super(options)
    this.conn = new Client()
  }

  private resolvePath(filePath: string): string {
    if (!filePath) return ''
    let resolved = filePath
    if (resolved.startsWith('~')) {
      resolved = path.join(os.homedir(), resolved.slice(1))
    }
    return path.normalize(resolved)
  }

  private normalizeRemotePath(p?: string): string {
    if (!p || !p.trim()) return '/'
    const cleaned = p.replace(/\\/g, '/')
    if (cleaned === '.' || cleaned === './') return '/'
    if (cleaned.startsWith('~')) return cleaned // let server resolve ~
    return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
  }

  private ensureLocalDir(filePath: string) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  private async ensureRemoteDir(dirPath: string) {
    const normalized = this.normalizeRemotePath(dirPath).replace(/\\/g, '/')
    const parts = normalized.split('/').filter(Boolean)
    let current = '/'
    for (const part of parts) {
      current = current === '/' ? `/${part}` : `${current}/${part}`
      const exists = await new Promise<boolean>((resolve) => {
        this.sftp!.stat(current, (err) => {
          if (err) return resolve(false) // on any error try to create
          resolve(true)
        })
      })
      await new Promise<void>((resolve, reject) => {
        if (exists) return resolve()
        this.sftp!.mkdir(current, { mode: 0o755 }, (err) => {
          // code 11 already exists, code 4 generic failure (might exist), ignore both
          if (err && err.code !== 4 && err.code !== 11) return reject(err)
          resolve()
        })
      })
    }
  }

  private activeTransfers = new Map<string, { abort: () => void }>()

  cancelTransfer(transferId: string) {
    const transfer = this.activeTransfers.get(transferId)
    if (transfer) {
      transfer.abort()
      this.activeTransfers.delete(transferId)
    }
  }

  private async uploadEntry(localPath: string, remotePath: string, transferId?: string): Promise<void> {
    const stat = await fs.promises.stat(localPath)
    const remote = this.normalizeRemotePath(remotePath || '/').replace(/\\/g, '/')

    if (stat.isDirectory()) {
      await this.ensureRemoteDir(remote)
      const entries = await fs.promises.readdir(localPath)
      for (const entry of entries) {
        // Check cancellation before processing next file
        if (transferId && !this.activeTransfers.has(transferId)) {
          throw new Error('Transfer cancelled')
        }
        const localChild = path.join(localPath, entry)
        const remoteChild = remote === '/' ? `/${entry}` : `${remote}/${entry}`
        await this.uploadEntry(localChild, remoteChild, transferId)
      }
      return
    }

    await this.ensureRemoteDir(path.posix.dirname(remote))

    // Use streams for cancellation support
    const putFile = () => new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(localPath)
      const writeStream = this.sftp!.createWriteStream(remote)
      
      let transferred = 0
      const total = stat.size

      if (transferId) {
        this.activeTransfers.set(transferId, {
          abort: () => {
            readStream.destroy()
            writeStream.destroy()
            reject(new Error('Transfer cancelled'))
          }
        })
      }

      readStream.on('data', (chunk) => {
        transferred += chunk.length
        if (transferId) {
          const percent = total > 0 ? Math.round((transferred / total) * 100) : 0
          this.emit('transfer-progress', { id: transferId, transferred, total, percent })
        }
      })

      writeStream.on('close', () => {
        if (transferId) this.activeTransfers.delete(transferId)
        resolve()
      })

      writeStream.on('error', (err) => {
        if (transferId) this.activeTransfers.delete(transferId)
        reject(err)
      })

      readStream.pipe(writeStream)
    })

    try {
      await putFile()
    } catch (err: any) {
      if (err.message === 'Transfer cancelled') throw err
      if (err && err.code === 2) {
        // ensure dir then retry once
        await this.ensureRemoteDir(path.posix.dirname(remote))
        await putFile()
      } else {
        throw err
      }
    }
  }

  async init(config: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!config.user) {
        this.emitStatus('username-needed', 'Missing username credential. Waiting for input...')
        reject(new Error('Username needed'))
        return
      }

      if (config.authType === 'privateKey') {
        if (!config.privateKeyPath) {
          const msg = '❌ Private key path is not configured.'
          this.emitStatus('error', msg)
          reject(new Error(msg))
          return
        }

        const resolvedPath = this.resolvePath(config.privateKeyPath)
        this.emitStatus('connecting', `🔍 Locating Private Key at: "${resolvedPath}"`)

        if (!fs.existsSync(resolvedPath)) {
          const msg = `❌ File Not Found. Please check path: "${resolvedPath}"`
          this.emitStatus('error', msg)
          reject(new Error(msg))
          return
        }
        config.resolvedPrivateKeyPath = resolvedPath
      }

      this.emitStatus('connecting', `Starting SFTP connection to "${config.host}" port "${config.port}"`)

      this.conn.on('ready', () => {
        this.conn.sftp((err, sftp) => {
          if (err) {
            this.emitStatus('error', `Failed to open SFTP: ${err.message}`)
            reject(err)
            return
          }
          this.sftp = sftp
          this.emitStatus('connected', `🗂️ SFTP channel ready`)
          resolve()
        })
      })

      this.conn.on('close', () => {
        this.emit('exit')
      })

      this.conn.on('error', (err: any) => {
        this.emitStatus('error', `SFTP connection error: ${err.message}`)
        this.conn.end()
        reject(err)
      })

      const connectOptions: any = {
        host: config.host,
        port: parseInt(config.port) || 22,
        username: config.user,
        readyTimeout: 20000,
        keepaliveInterval: 10000,
      }

      if (config.authType === 'privateKey') {
        const keyPath = config.resolvedPrivateKeyPath
        this.emitStatus('connecting', `🔐 Reading private key...`)
        try {
          connectOptions.privateKey = fs.readFileSync(keyPath)
        } catch (fsErr: any) {
          reject(new Error(`Failed to read private key file: ${fsErr.message}`))
          return
        }
        if (config.password) {
          connectOptions.passphrase = config.password
        }
      } else {
        connectOptions.password = config.password
      }

      try {
        this.conn.connect(connectOptions)
      } catch (e: any) {
        reject(e)
        this.emitStatus('error', `❌ Init Error: ${e.message}`)
      }
    })
  }

  private emitStatus(status: string, log: string) {
    this.emit('status', { status, log })
  }

  async listDir(targetPath?: string) {
    if (!this.sftp) {
      throw new Error('SFTP not ready')
    }
    const pathToUse = this.normalizeRemotePath(targetPath)
    const attemptRead = (p: string): Promise<any> => new Promise((resolve, reject) => {
      this.sftp!.readdir(p, (err: any, list: any[]) => {
        if (err) {
          reject(err)
          return
        }
        const entries = list.map((item: any) => {
          // Treat symbolic links as directories to allow navigation/prevent accidental download
          // Ideally we should resolve the link target, but for listing performance we assume dir behavior for links
          const isDir = item.attrs.isDirectory() || item.attrs.isSymbolicLink()
          return {
            name: item.filename,
            type: isDir ? 'dir' : 'file',
            size: item.attrs.size,
            modified: (item.attrs.mtime || 0) * 1000,
            permissions: item.attrs.mode
          }
        })
        resolve({ path: p, entries })
      })
    })

    try {
      return await attemptRead(pathToUse)
    } catch (err: any) {
      // 如果路径不存在且不是根目录，尝试回退到根目录
      if (err?.code === 2 && pathToUse !== '/') {
        return await attemptRead('/')
      }
      throw err
    }
  }

  async uploadFile(localPath: string, remotePath: string, transferId?: string) {
    if (!this.sftp) throw new Error('SFTP not ready')
    await this.uploadEntry(localPath, remotePath, transferId)
  }

  async downloadFile(remotePath: string, localPath: string, transferId?: string) {
    if (!this.sftp) throw new Error('SFTP not ready')
    const remote = this.normalizeRemotePath(remotePath)
    let targetLocal = localPath

    const localStat = fs.existsSync(targetLocal) ? fs.statSync(targetLocal) : null
    if (localStat && localStat.isDirectory()) {
      targetLocal = path.join(targetLocal, path.basename(remote))
    }

    this.ensureLocalDir(targetLocal)

    // Get remote file size for progress
    const stat = await new Promise<any>((resolve, reject) => {
      this.sftp!.stat(remote, (err, stats) => {
        if (err) return reject(err)
        resolve(stats)
      })
    })

    return new Promise<void>((resolve, reject) => {
      const readStream = this.sftp!.createReadStream(remote)
      const writeStream = fs.createWriteStream(targetLocal)
      
      let transferred = 0
      const total = stat.size

      if (transferId) {
        this.activeTransfers.set(transferId, {
          abort: () => {
            readStream.destroy()
            writeStream.destroy()
            reject(new Error('Transfer cancelled'))
          }
        })
      }

      readStream.on('data', (chunk: any) => {
        transferred += chunk.length
        if (transferId) {
          const percent = total > 0 ? Math.round((transferred / total) * 100) : 0
          this.emit('transfer-progress', { id: transferId, transferred, total, percent })
        }
      })

      writeStream.on('close', () => {
        if (transferId) this.activeTransfers.delete(transferId)
        resolve()
      })

      readStream.on('error', (err: any) => {
        if (transferId) this.activeTransfers.delete(transferId)
        reject(err)
      })

      readStream.pipe(writeStream)
    })
  }

  async rename(oldPath: string, newPath: string) {
    if (!this.sftp) throw new Error('SFTP not ready')
    const oldP = this.normalizeRemotePath(oldPath)
    const newP = this.normalizeRemotePath(newPath)
    return new Promise<void>((resolve, reject) => {
      this.sftp!.rename(oldP, newP, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async createDir(path: string) {
    if (!this.sftp) throw new Error('SFTP not ready')
    const p = this.normalizeRemotePath(path)
    return new Promise<void>((resolve, reject) => {
      this.sftp!.mkdir(p, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  async delete(targetPath: string) {
    if (!this.sftp) throw new Error('SFTP not ready')
    const p = this.normalizeRemotePath(targetPath)
    
    const stat = await new Promise<any>((resolve, reject) => {
      this.sftp!.lstat(p, (err, stats) => {
        if (err) return reject(err)
        resolve(stats)
      })
    })

    if (stat.isDirectory()) {
      await this.deleteDir(p)
    } else {
      await new Promise<void>((resolve, reject) => {
        this.sftp!.unlink(p, (err) => {
          if (err) return reject(err)
          resolve()
        })
      })
    }
  }

  private async deleteDir(dirPath: string) {
    const list = await new Promise<any[]>((resolve, reject) => {
      this.sftp!.readdir(dirPath, (err, list) => {
        if (err) return reject(err)
        resolve(list)
      })
    })

    for (const item of list) {
      const fullPath = `${dirPath}/${item.filename}`
      const isDir = item.attrs.isDirectory()
      if (item.filename === '.' || item.filename === '..') continue
      
      if (isDir) {
        await this.deleteDir(fullPath)
      } else {
        await new Promise<void>((resolve, reject) => {
          this.sftp!.unlink(fullPath, (err) => {
            if (err) return reject(err)
            resolve()
          })
        })
      }
    }

    await new Promise<void>((resolve, reject) => {
      this.sftp!.rmdir(dirPath, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  write(_data: string): void { /* not used for SFTP */ }
  resize(_cols: number, _rows: number): void { /* not used for SFTP */ }
  kill(): void { this.conn.end(); this.sftp = null }
}
