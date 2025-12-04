// electron/preload.ts
import { contextBridge, ipcRenderer, webUtils } from 'electron'

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
  fsStat: (path: string) => ipcRenderer.invoke('fs-stat', path),
  readDir: (path?: string) => ipcRenderer.invoke('fs-read-dir', path),
  sftpReadDir: (payload: { id: string, path?: string }) => ipcRenderer.invoke('sftp-read-dir', payload),
  sftpUpload: (payload: { id: string, localPath: string, remotePath: string, transferId?: string }) => ipcRenderer.invoke('sftp-upload', payload),
  sftpDownload: (payload: { id: string, remotePath: string, localPath: string, transferId?: string }) => ipcRenderer.invoke('sftp-download', payload),
  sftpRename: (payload: { id: string, oldPath: string, newPath: string }) => ipcRenderer.invoke('sftp-rename', payload),
  sftpCreateDir: (payload: { id: string, path: string }) => ipcRenderer.invoke('sftp-create-dir', payload),
  sftpDelete: (payload: { id: string, path: string }) => ipcRenderer.invoke('sftp-delete', payload),
  fsRename: (payload: { oldPath: string, newPath: string }) => ipcRenderer.invoke('fs-rename', payload),
  fsCreateDir: (payload: { path: string }) => ipcRenderer.invoke('fs-create-dir', payload),
  fsDelete: (payload: { path: string }) => ipcRenderer.invoke('fs-delete', payload),
  cancelTransfer: (payload: { id: string, transferId: string }) => ipcRenderer.send('sftp-cancel-transfer', payload),
  onTransferProgress: (callback: (payload: { sessionId: string, id: string, transferred: number, total: number, percent: number }) => void) =>
    ipcRenderer.on('transfer-progress', (_event, value) => callback(value)),
  
  // Utils
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
})
