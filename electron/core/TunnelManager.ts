import * as net from 'net'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Client, ConnectConfig } from 'ssh2'
import { SessionManager } from './SessionManager'

export type TunnelType = 'L' | 'R' | 'D'

export interface TunnelConfig {
  id: string
  name: string
  type: TunnelType
  description?: string
  hostId?: string
  bindHost?: string
  bindPort: number
  targetHost?: string
  targetPort?: number
  autoStart?: boolean
}

export interface StartTunnelPayload {
  config: TunnelConfig
  hostConfig: any
  sessionId?: string
}

interface ActiveTunnel {
  id: string
  config: TunnelConfig
  sessionId?: string
  status: 'starting' | 'active' | 'error'
  error?: string
  bytesUp: number
  bytesDown: number
  startedAt: number
  usingSharedConnection: boolean
  connection?: Client
  server?: net.Server
  remoteHandler?: (...args: any[]) => void
}

export interface ActiveTunnelSummary {
  id: string
  name: string
  type: TunnelType
  description?: string
  status: 'starting' | 'active' | 'error'
  error?: string
  bytesUp: number
  bytesDown: number
  startedAt: number
  bindHost?: string
  bindPort: number
  targetHost?: string
  targetPort?: number
  sessionId?: string
  hostId?: string
}

export class TunnelManager {
  private activeTunnels: Map<string, ActiveTunnel> = new Map()
  private sessionManager: SessionManager

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager
  }

  async checkPortAvailable(port: number, host = '127.0.0.1'): Promise<{ available: boolean; message?: string }> {
    return new Promise((resolve) => {
      const tester = net.createServer()
      tester.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve({ available: false, message: 'Port is already in use' })
        } else {
          resolve({ available: false, message: err.message })
        }
      })
      tester.once('listening', () => {
        tester.close(() => resolve({ available: true }))
      })
      tester.listen(port, host)
    })
  }

  async startTunnel(payload: StartTunnelPayload): Promise<ActiveTunnelSummary> {
    const { config, hostConfig, sessionId } = payload
    if (!config?.id) throw new Error('Tunnel config missing id')

    if (this.activeTunnels.has(config.id)) {
      await this.stopTunnel(config.id)
    }

    const bindHost = config.bindHost || (config.type === 'R' ? '0.0.0.0' : '127.0.0.1')
    const bindPort = Number(config.bindPort)
    const targetHost = config.targetHost || '127.0.0.1'
    const targetPort = config.targetPort ? Number(config.targetPort) : undefined

    if ((config.type === 'L' || config.type === 'R') && (!targetHost || !targetPort)) {
      throw new Error('Target host/port is required for this tunnel type')
    }

    if (config.type !== 'R') {
      const portCheck = await this.checkPortAvailable(bindPort, bindHost)
      if (!portCheck.available) {
        throw new Error(portCheck.message || 'Port not available')
      }
    }

    const entry: ActiveTunnel = {
      id: config.id,
      config: { ...config, bindHost, bindPort, targetHost, targetPort },
      sessionId,
      status: 'starting',
      bytesUp: 0,
      bytesDown: 0,
      startedAt: Date.now(),
      usingSharedConnection: false
    }

    this.activeTunnels.set(config.id, entry)

    try {
      const { client, usingShared } = await this.getConnection(hostConfig, sessionId)
      entry.connection = client
      entry.usingSharedConnection = usingShared

      if (!usingShared) {
        client.on('close', () => {
          if (this.activeTunnels.has(entry.id)) {
            entry.status = 'error'
            entry.error = 'SSH connection closed'
            this.stopTunnel(entry.id)
          }
        })
      }

      if (config.type === 'L') {
        entry.server = await this.startLocalForward(entry, client)
      } else if (config.type === 'D') {
        entry.server = await this.startDynamicForward(entry, client)
      } else {
        await this.startRemoteForward(entry, client)
      }

      entry.status = 'active'
      entry.error = undefined
      return this.toSummary(entry)
    } catch (err: any) {
      entry.status = 'error'
      entry.error = err?.message || 'Failed to start tunnel'
      await this.cleanupEntry(entry)
      this.activeTunnels.delete(config.id)
      throw err
    }
  }

  async stopTunnel(id: string): Promise<boolean> {
    const entry = this.activeTunnels.get(id)
    if (!entry) return false
    await this.cleanupEntry(entry)
    this.activeTunnels.delete(id)
    return true
  }

  listActive(): ActiveTunnelSummary[] {
    return Array.from(this.activeTunnels.values()).map((entry) => this.toSummary(entry))
  }

  async cleanupBySession(sessionId: string) {
    const targets = Array.from(this.activeTunnels.values()).filter((t) => t.sessionId === sessionId)
    for (const t of targets) {
      await this.stopTunnel(t.id)
    }
  }

  async stopAll() {
    const ids = Array.from(this.activeTunnels.keys())
    for (const id of ids) {
      await this.stopTunnel(id)
    }
  }

  private toSummary(entry: ActiveTunnel): ActiveTunnelSummary {
    return {
      id: entry.id,
      name: entry.config.name,
      type: entry.config.type,
      description: entry.config.description,
      status: entry.status,
      error: entry.error,
      bytesUp: entry.bytesUp,
      bytesDown: entry.bytesDown,
      startedAt: entry.startedAt,
      bindHost: entry.config.bindHost,
      bindPort: entry.config.bindPort,
      targetHost: entry.config.targetHost,
      targetPort: entry.config.targetPort,
      sessionId: entry.sessionId,
      hostId: entry.config.hostId
    }
  }

  private resolvePath(filePath: string): string {
    if (!filePath) return ''
    if (filePath.startsWith('~')) {
      return path.join(os.homedir(), filePath.slice(1))
    }
    return path.normalize(filePath)
  }

  private async getConnection(hostConfig: any, sessionId?: string): Promise<{ client: Client; usingShared: boolean }> {
    if (sessionId) {
      const shared = this.sessionManager.getSshClient(sessionId)
      if (shared) {
        return { client: shared, usingShared: true }
      }
    }

    const client = new Client()
    const connectOptions = await this.buildConnectOptions(hostConfig)

    return new Promise((resolve, reject) => {
      const onError = (err: any) => {
        client.removeAllListeners()
        reject(err)
      }
      client.once('ready', () => {
        client.off('error', onError)
        resolve({ client, usingShared: false })
      })
      client.once('error', onError)
      client.connect(connectOptions)
    })
  }

  private async buildConnectOptions(hostConfig: any): Promise<ConnectConfig> {
    if (!hostConfig) throw new Error('Host configuration is required')
    const { host, port, user, authType, privateKeyPath, password } = hostConfig
    if (!host || !user) {
      throw new Error('Host or username missing for tunnel')
    }

    const base: ConnectConfig = {
      host,
      port: parseInt(port, 10) || 22,
      username: user,
      readyTimeout: 20000,
      keepaliveInterval: 10000
    }

    if (authType === 'privateKey') {
      if (!privateKeyPath) throw new Error('Private key path required for key auth')
      const resolved = this.resolvePath(privateKeyPath)
      if (!fs.existsSync(resolved)) {
        throw new Error(`Private key not found: ${resolved}`)
      }
      base.privateKey = fs.readFileSync(resolved)
      if (password) {
        base.passphrase = password
      }
    } else {
      base.password = password
    }

    return base
  }

  private async startLocalForward(entry: ActiveTunnel, client: Client) {
    const { bindHost, bindPort, targetHost, targetPort } = entry.config
    return new Promise<net.Server>((resolve, reject) => {
      let resolved = false
      const server = net.createServer((socket) => {
        const srcAddr = socket.remoteAddress || '127.0.0.1'
        const srcPort = socket.remotePort || 0
        client.forwardOut(srcAddr, srcPort, targetHost || '127.0.0.1', targetPort || 22, (err, stream) => {
          if (err) {
            socket.destroy()
            return
          }
          socket.on('data', (chunk) => (entry.bytesUp += chunk.length))
          stream.on('data', (chunk: Buffer) => (entry.bytesDown += chunk.length))
          socket.pipe(stream).pipe(socket)
        })
      })

      server.on('error', (err) => {
        if (!resolved) {
          resolved = true
          reject(err)
        } else {
          entry.status = 'error'
          entry.error = err.message
        }
      })
      server.listen(bindPort, bindHost, () => {
        resolved = true
        resolve(server)
      })
    })
  }

  private handleSocksConnection(socket: net.Socket, client: Client, entry: ActiveTunnel) {
    const fail = () => socket.end(Buffer.from([0x05, 0x01]))

    socket.on('error', () => {})

    socket.once('data', (chunk) => {
      if (chunk.length < 2 || chunk[0] !== 0x05) return fail()
      const nmethods = chunk[1]
      const expectedLen = 2 + nmethods
      const rest = chunk.slice(expectedLen)
      socket.write(Buffer.from([0x05, 0x00]))

      const processRequest = (buf: Buffer) => {
        if (buf.length < 4 || buf[0] !== 0x05) return fail()
        if (buf[1] !== 0x01) return fail() // only CONNECT
        const atyp = buf[3]
        let addr = ''
        let port = 0
        let offset = 4

        if (atyp === 0x01) {
          if (buf.length < offset + 6) return fail()
          addr = `${buf[offset]}.${buf[offset + 1]}.${buf[offset + 2]}.${buf[offset + 3]}`
          offset += 4
        } else if (atyp === 0x03) {
          const len = buf[offset]
          offset += 1
          addr = buf.slice(offset, offset + len).toString()
          offset += len
        } else if (atyp === 0x04) {
          const raw = buf.slice(offset, offset + 16)
          const parts = []
          for (let i = 0; i < 16; i += 2) {
            parts.push(raw.readUInt16BE(i).toString(16))
          }
          addr = parts.join(':')
          offset += 16
        } else {
          return fail()
        }

        port = buf.readUInt16BE(offset)

        client.forwardOut(socket.remoteAddress || '127.0.0.1', socket.remotePort || 0, addr, port, (err, stream) => {
          if (err) return fail()

          const reply = Buffer.alloc(10)
          reply[0] = 0x05
          reply[1] = 0x00
          reply[2] = 0x00
          reply[3] = 0x01
          reply.writeUInt32BE(0, 4)
          reply.writeUInt16BE(entry.config.bindPort, 8)
          socket.write(reply)

          socket.on('data', (data) => (entry.bytesUp += data.length))
          stream.on('data', (data: Buffer) => (entry.bytesDown += data.length))

          stream.pipe(socket)
          socket.pipe(stream)
        })
      }

      if (rest.length > 0) {
        processRequest(rest)
      } else {
        socket.once('data', processRequest)
      }
    })
  }

  private async startDynamicForward(entry: ActiveTunnel, client: Client) {
    const { bindHost, bindPort } = entry.config
    return new Promise<net.Server>((resolve, reject) => {
      let resolved = false
      const server = net.createServer((socket) => this.handleSocksConnection(socket, client, entry))
      server.on('error', (err) => {
        if (!resolved) {
          resolved = true
          reject(err)
        } else {
          entry.status = 'error'
          entry.error = err.message
        }
      })
      server.listen(bindPort, bindHost, () => {
        resolved = true
        resolve(server)
      })
    })
  }

  private async startRemoteForward(entry: ActiveTunnel, client: Client) {
    const { bindHost, bindPort, targetHost, targetPort } = entry.config

    return new Promise<void>((resolve, reject) => {
      const handler = (info: any, accept: any, rejectConn: any) => {
        if (info.destPort !== bindPort) return
        const stream = accept()
        const target = net.connect(targetPort || 22, targetHost || '127.0.0.1', () => {
          stream.pipe(target)
          target.pipe(stream)
        })
        stream.on('data', (chunk: Buffer) => (entry.bytesUp += chunk.length))
        target.on('data', (chunk) => (entry.bytesDown += chunk.length))
        target.on('error', () => stream.end())
        stream.on('error', () => target.end())
      }

      client.on('tcp connection', handler)
      client.forwardIn(bindHost || '0.0.0.0', bindPort, (err) => {
        if (err) {
          client.removeListener('tcp connection', handler)
          reject(err)
        } else {
          entry.remoteHandler = handler
          resolve()
        }
      })
    })
  }

  private async cleanupEntry(entry: ActiveTunnel) {
    if (entry.server) {
      await new Promise<void>((resolve) => entry.server?.close(() => resolve()))
      entry.server = undefined
    }

    if (entry.config.type === 'R' && entry.connection) {
      await new Promise<void>((resolve) => {
        entry.connection?.unforwardIn(entry.config.bindHost || '0.0.0.0', entry.config.bindPort, () => resolve())
      })
      if (entry.remoteHandler) {
        entry.connection.removeListener('tcp connection', entry.remoteHandler)
      }
    }

    if (entry.connection && !entry.usingSharedConnection) {
      entry.connection.end()
    }
  }
}
