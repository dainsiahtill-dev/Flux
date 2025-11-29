// electron/main.ts
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs'; // ✅ 必须引入 fs 模块用于读取文件
import { SessionManager } from './core/SessionManager'
import Store from 'electron-store'

// 1. 定义存储结构，增加 keys
interface StoreSchema {
  hosts: any[];
  keys: any[]; 
}

const store = new Store<StoreSchema>({
  defaults: {
    hosts: [],
    keys: [] 
  }
});

const sessionManager = new SessionManager();
// 屏蔽安全警告
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const windowSize = { width: 1200, height: 800 }

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

// --- ✅ Keys CRUD (新增) ---
ipcMain.handle('keys-get', () => store.get('keys'));
ipcMain.handle('keys-save', (_event, keys) => {
  store.set('keys', keys);
  return true;
});

// --- ✅ 文件操作 (新增) ---

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

// 2. 读取文件内容 (这是 readFile 的后端实现)
ipcMain.handle('file-read', async (_event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return '';
    // 读取文件内容并返回
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch (error: any) {
    console.error(`Error reading file ${filePath}:`, error);
    return `Error reading file: ${error.message}`;
  }
})