// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximized: (cb: () => void) => ipcRenderer.on('window-maximized', cb),
  onRestored: (cb: () => void) => ipcRenderer.on('window-restored', cb),

  // Session
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

  // Hosts
  getHosts: () => ipcRenderer.invoke('hosts-get'),
  saveHosts: (hosts: any[]) => ipcRenderer.invoke('hosts-save', hosts),

  // ✅ Keys & Files (确保这些 API 已暴露)
  getKeys: () => ipcRenderer.invoke('keys-get'),
  saveKeys: (keys: any[]) => ipcRenderer.invoke('keys-save', keys),
  openFileDialog: () => ipcRenderer.invoke('dialog-open-file'),
  readFile: (path: string) => ipcRenderer.invoke('file-read', path), 
})