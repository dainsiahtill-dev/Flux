import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximized: (cb: () => void) => ipcRenderer.on('window-maximized', cb),
  onRestored: (cb: () => void) => ipcRenderer.on('window-restored', cb),

  // Session 相关
  sendInput: (payload: any) => ipcRenderer.send('terminal-input', payload),
  resizeTerminal: (payload: any) => ipcRenderer.send('terminal-resize', payload),
  onTerminalData: (callback: (payload: { id: string; data: string }) => void) =>
    ipcRenderer.on('terminal-incoming', (_event, value) => callback(value)),
  initSession: (config: any) => ipcRenderer.send('session-init', config),
  closeSession: (payload: { id: string }) => ipcRenderer.send('session-close', payload),
  onSessionEnded: (callback: (payload: { id: string }) => void) =>
    ipcRenderer.on('session-ended', (_event, value) => callback(value)),
  onSessionStatus: (callback: (payload: { id: string; status: string; log?: string }) => void) =>
    ipcRenderer.on('session-status', (_event, value) => callback(value)),

  /** 读取主机列表 (Promise) */
  getHosts: () => ipcRenderer.invoke('hosts-get'),

  /** 保存主机列表 (fire and forget) */
  saveHosts: (hosts: any[]) => ipcRenderer.invoke('hosts-save', hosts),
})