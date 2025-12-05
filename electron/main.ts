// electron/main.ts
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs'; // ?必须引入 fs 模块用于读取文件
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SessionManager } from './core/SessionManager'
import { TunnelManager } from './core/TunnelManager'
import Store from 'electron-store'
import { Client, ConnectConfig } from 'ssh2'

const execAsync = promisify(exec);

// 1. 定义存储结构，增?keys
interface StoreSchema {
  hosts: any[];
  keys: any[]; 
  tunnels: any[];
}

const store = new Store<StoreSchema>({
  defaults: {
    hosts: [],
    keys: [],
    tunnels: []
  }
});

const sessionManager = new SessionManager();
const tunnelManager = new TunnelManager(sessionManager);
sessionManager.setOnSessionExit((id: string) => tunnelManager.cleanupBySession(id));
// 屏蔽安全警告
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const windowSize = { width: 1200, height: 800 }

const resolveKeyPath = (p?: string) => {
  if (!p) return ''
  if (p.startsWith('~')) {
    return path.join(process.env.HOME || process.env.USERPROFILE || '', p.slice(1))
  }
  return path.normalize(p)
}

const execOnceViaSSH = (hostConfig: any, command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!hostConfig?.host || !hostConfig?.user) {
      return reject(new Error('Missing host credentials'))
    }
    const client = new Client()
    const connectOptions: ConnectConfig = {
      host: hostConfig.host,
      port: parseInt(hostConfig.port, 10) || 22,
      username: hostConfig.user,
      readyTimeout: 20000,
      keepaliveInterval: 10000
    }
    if (hostConfig.authType === 'privateKey') {
      const keyPath = resolveKeyPath(hostConfig.privateKeyPath)
      if (!fs.existsSync(keyPath)) {
        return reject(new Error(`Private key not found: ${keyPath}`))
      }
      connectOptions.privateKey = fs.readFileSync(keyPath)
      if (hostConfig.password) connectOptions.passphrase = hostConfig.password
    } else {
      connectOptions.password = hostConfig.password
    }

    client.on('ready', () => {
      client.exec(command, (err, stream) => {
        if (err) {
          client.end()
          return reject(err)
        }
        let stdout = ''
        let stderr = ''
        stream.on('data', (d) => stdout += d.toString())
        stream.stderr.on('data', (d) => stderr += d.toString())
        stream.on('close', (code: number) => {
          client.end()
          if (code === 0) resolve(stdout.trim())
          else reject(new Error(stderr || `Command failed with code ${code}`))
        })
      })
    }).on('error', (err) => {
      reject(err)
    }).connect(connectOptions)
  })
}

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: windowSize.width,
        height: windowSize.height,
        titleBarStyle: 'hidden',
        backgroundColor: '#050a0e',
        webPreferences: {
            preload: join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false,
        icon: join(__dirname, '../../src/assets/icon.png'),
        title: 'Flux Terminal',
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    // 窗口控制
    ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized())
    ipcMain.on('window-minimize', () => mainWindow.minimize())
    ipcMain.on('window-maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            mainWindow.maximize()
        }
    })
    ipcMain.on('window-close', () => mainWindow.close())

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
    }
};

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    sessionManager.killAll()
    tunnelManager.stopAll().catch(() => {})
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ==========================================
//  IPC 路由 (核心功能实现)
// ==========================================

// Session
ipcMain.on('session-init', async (event, config) => {
  try {
    await sessionManager.createSession(config, event.sender)
  } catch (error) {
    console.error('Failed to init session:', error)
  }
})

ipcMain.on('terminal-input', (event, { id, data }) => {
  sessionManager.write(id, data)
})

ipcMain.on('terminal-resize', (event, { id, cols, rows }) => {
  sessionManager.resize(id, cols, rows)
})

ipcMain.on('session-close', (event, { id }) => {
  sessionManager.kill(id)
})

// --- Hosts CRUD ---
ipcMain.handle('hosts-get', () => store.get('hosts'));
ipcMain.handle('hosts-save', (_event, hosts) => {
  store.set('hosts', hosts);
  return true;
});

// --- ?Keys CRUD (新增) ---
ipcMain.handle('keys-get', () => store.get('keys'));
ipcMain.handle('keys-save', (_event, keys) => {
  store.set('keys', keys);
  return true;
});

// --- Tunnels CRUD & controls ---
ipcMain.handle('tunnels-get', () => store.get('tunnels'));
ipcMain.handle('tunnels-save', (_event, tunnels) => {
  store.set('tunnels', tunnels);
  return true;
});

ipcMain.handle('tunnels-start', async (_event, payload) => {
  try {
    const data = await tunnelManager.startTunnel(payload);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to start tunnel' };
  }
});

ipcMain.handle('tunnels-stop', async (_event, id: string) => {
  const success = await tunnelManager.stopTunnel(id);
  return { success };
});

ipcMain.handle('tunnels-active', () => tunnelManager.listActive());

ipcMain.handle('tunnels-check-port', async (_event, payload: { port: number; host?: string }) => {
  return tunnelManager.checkPortAvailable(payload.port, payload.host);
});

ipcMain.handle('session-exec', async (_event, payload: { id: string, command: string }) => {
  try {
    const output = await sessionManager.execCommand(payload.id, payload.command);
    return { success: true, output };
  } catch (error) {
    const message = (error as any)?.message || 'Exec failed';
    return { success: false, error: message };
  }
});

ipcMain.handle('session-exec-detached', async (_event, payload: { hostConfig: any, command: string }) => {
  try {
    const output = await execOnceViaSSH(payload.hostConfig, payload.command);
    return { success: true, output };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Detached exec failed' };
  }
});

// --- ?文件操作 (新增) ---

// 1. 打开文件选择弹窗
ipcMain.handle('dialog-open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'showHiddenFiles'],
    filters: [
      { name: 'SSH Keys', extensions: ['pem', 'ppk', 'key', 'id_rsa', 'pub', ''] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (canceled) return null
  return filePaths[0]
})

// 2. 读取文件内容 (这是 readFile 的后端实?
ipcMain.handle('file-read', async (_event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    // 读取文件内容并返?
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch (error: any) {
    console.error(`Error reading file ${filePath}:`, error);
    return `Error reading file: ${error.message}`;
  }
})

// 3. 读取目录 (本地文件浏览)
ipcMain.handle('fs-stat', async (_event, filePath: string) => {
  try {
    const stat = await fs.promises.stat(filePath);
    return {
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      size: stat.size,
      modified: stat.mtimeMs
    };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('fs-read-dir', async (_event, dirPath?: string) => {
  try {
    if (dirPath === 'This PC') {
      if (process.platform === 'win32') {
        try {
          // Use PowerShell to list drives (more robust than wmic)
          const { stdout } = await execAsync('powershell -NoProfile -Command "[System.IO.DriveInfo]::GetDrives() | Select-Object -ExpandProperty Name"');
          const drives = stdout.split(/\r?\n/)
            .map(line => line.trim())
            .filter(value => /^[A-Za-z]:\\?$/.test(value))
            .map(value => value.replace(/\\$/, '')); // Ensure "C:" format
          
          return {
            path: 'This PC',
            entries: drives.map(drive => ({
              name: drive,
              type: 'dir',
              size: '-',
              modified: 0,
              badge: 'Drive'
            }))
          }
        } catch (e) {
          console.error('Failed to list drives', e);
          return { path: 'This PC', entries: [], error: 'Failed to list drives' }
        }
      }
    }

    const target = dirPath && dirPath.trim() ? dirPath : process.cwd();
    const resolved = path.resolve(target);
    const entries = await fs.promises.readdir(resolved, { withFileTypes: true });

    const payload = await Promise.all(entries.map(async (entry) => {
      const full = path.join(resolved, entry.name);
      const stat = await fs.promises.stat(full).catch(() => null);
      return {
        name: entry.name,
        type: (stat && stat.isDirectory()) ? 'dir' : 'file',
        size: stat ? (entry.isDirectory() ? '-' : stat.size) : '-',
        modified: stat ? stat.mtimeMs : 0,
        permissions: stat ? stat.mode : 0
      }
    }));

    return {
      path: resolved,
      entries: payload
    }
  } catch (error: any) {
    console.error('fs-read-dir error:', error);
    return { path: dirPath || '', entries: [], error: error.message }
  }
})

// 4. 读取远程 SFTP 目录
ipcMain.handle('sftp-read-dir', async (_event, payload: { id: string, path?: string }) => {
  try {
    const { id, path } = payload || { id: '', path: undefined };
    const result = await sessionManager.readSftpDir(id, path);
    return result;
  } catch (error: any) {
    console.error('sftp-read-dir error:', error);
    return { path: payload?.path || '', entries: [], error: error.message }
  }
})

// 5. SFTP 上传
ipcMain.handle('sftp-upload', async (_event, payload: { id: string, localPath: string, remotePath: string, transferId?: string }) => {
  try {
    await sessionManager.uploadSftp(payload.id, payload.localPath, payload.remotePath, payload.transferId);
    return { success: true };
  } catch (error: any) {
    console.error('sftp-upload error:', error);
    return { success: false, error: error.message }
  }
})

// 6. SFTP 下载
ipcMain.handle('sftp-download', async (_event, payload: { id: string, remotePath: string, localPath: string, transferId?: string }) => {
  try {
    await sessionManager.downloadSftp(payload.id, payload.remotePath, payload.localPath, payload.transferId);
    return { success: true };
  } catch (error: any) {
    console.error('sftp-download error:', error);
    return { success: false, error: error.message }
  }
})

// 7. 取消传输
ipcMain.on('sftp-cancel-transfer', (_event, payload: { id: string, transferId: string }) => {
  sessionManager.cancelTransfer(payload.id, payload.transferId);
})

// 8. SFTP Rename
ipcMain.handle('sftp-rename', async (_event, payload: { id: string, oldPath: string, newPath: string }) => {
  try {
    await sessionManager.renameSftp(payload.id, payload.oldPath, payload.newPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 9. SFTP Create Dir
ipcMain.handle('sftp-create-dir', async (_event, payload: { id: string, path: string }) => {
  try {
    await sessionManager.createDirSftp(payload.id, payload.path);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 10. SFTP Delete
ipcMain.handle('sftp-delete', async (_event, payload: { id: string, path: string }) => {
  try {
    await sessionManager.deleteSftp(payload.id, payload.path);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 11. Local Rename
ipcMain.handle('fs-rename', async (_event, payload: { oldPath: string, newPath: string }) => {
  try {
    await fs.promises.rename(payload.oldPath, payload.newPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 12. Local Create Dir
ipcMain.handle('fs-create-dir', async (_event, payload: { path: string }) => {
  try {
    await fs.promises.mkdir(payload.path, { recursive: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 13. Local Delete
ipcMain.handle('fs-delete', async (_event, payload: { path: string }) => {
  try {
    await fs.promises.rm(payload.path, { recursive: true, force: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

