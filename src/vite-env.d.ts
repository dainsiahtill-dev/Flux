/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    // Session
    initSession: (config: any) => void;
    sendInput: (payload: any) => void;
    resizeTerminal: (payload: any) => void;
    closeSession: (payload: { id: string }) => void;
    onTerminalData: (callback: (payload: { id: string; data: string }) => void) => void;
    onSessionEnded: (callback: (payload: { id: string }) => void) => void;
    onSessionStatus: (callback: (payload: { id: string; status: string; log?: string }) => void) => void;

    // Window Controls
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximized: (callback: (event: any, isMax: boolean) => void) => void;
    onRestored: (callback: () => void) => void;

    // Data Persistence
    getHosts: () => Promise<any[]>;
    saveHosts: (hosts: any[]) => Promise<boolean>;
    // Keys Persistence
    getKeys: () => Promise<any[]>;
    saveKeys: (keys: any[]) => Promise<boolean>;
    openFileDialog: () => Promise<string | null>;
    readFile: (path: string) => Promise<string | null>;
    readDir: (path?: string) => Promise<{
      path: string;
      entries: { name: string; type: 'file' | 'dir'; size: number | string; modified: number }[];
      error?: string;
    }>;
    sftpReadDir: (payload: { id: string; path?: string }) => Promise<{
      path: string;
      entries: { name: string; type: 'file' | 'dir'; size: number | string; modified: number }[];
      error?: string;
    }>;
    sftpUpload: (payload: { id: string; localPath: string; remotePath: string }) => Promise<{ success: boolean; error?: string }>;
    sftpDownload: (payload: { id: string; remotePath: string; localPath: string }) => Promise<{ success: boolean; error?: string }>;
  }
}
