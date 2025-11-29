// main.js (ES Module 版本)
import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { SessionManager } from './core/SessionManager'
import Store from 'electron-store'

interface StoreSchema {
  hosts: any[];
}
const store = new Store<StoreSchema>({
  defaults: {
    hosts: [] // 默认空列表
  }
});

const sessionManager = new SessionManager();
// 屏蔽安全警告
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// 兼容 ES Module 的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const windowSize = { width: 1200, height: 800 }

// 创建浏览器窗口
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

    // ✅ 窗口控制 IPC
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

    // development 模式
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // 开启调试台
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
    }
};
// Electron 会在初始化后并准备
app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {

    // 退出前清理所有会话
    sessionManager.killAll()

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ==========================================
//  IPC 路由 -> 转发给 SessionManager
// ==========================================

ipcMain.on('session-init', async (event, config) => {
  try {
    // 将 webContents 传给 Manager，方便它回传数据
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

// 获取所有主机
ipcMain.handle('hosts-get', () => {
  return store.get('hosts');
});

// 保存/覆盖所有主机 (接收整个数组)
ipcMain.handle('hosts-save', (_event, hosts) => {
    console.log('Saving hosts:', hosts);
  store.set('hosts', hosts);
  return true;
});