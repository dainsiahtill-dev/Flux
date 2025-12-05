import { WebContents } from 'electron'
import { BaseSession } from './BaseSession'
import { LocalSession } from './LocalSession'
import { SshSession } from './SshSession'
import { OpenSshSession } from './OpenSshSession' // 引入新类
import { SftpSession } from './SftpSession'
import { Client } from 'ssh2'

export class SessionManager {
  private sessions: Map<string, BaseSession> = new Map();
  private sessionConfigs: Map<string, any> = new Map();
  private onSessionExit?: (id: string) => void;

  constructor() {}

  async createSession(config: any, sender: WebContents) {
    const { id, type, useNativeSSH } = config; // 获取 useNativeSSH
    console.log(`[SessionManager] Creating session ${id} (${type}) Native:${useNativeSSH}`);

    if (this.sessions.has(id)) {
      const oldSession = this.sessions.get(id);
      if (oldSession) {
        oldSession.removeAllListeners(); 
        oldSession.kill();
        this.sessions.delete(id);
        this.sessionConfigs.delete(id);
      }
    }

    let session: BaseSession;

    if (type === 'local') {
      session = new LocalSession({ id, type });
    } else if (type === 'sftp') {
      session = new SftpSession({ id, type });
    } else {
      // ✅ 路由逻辑：如果启用了 Native SSH，则使用 OpenSshSession
      if (useNativeSSH) {
        session = new OpenSshSession({ id, type });
      } else {
        session = new SshSession({ id, type });
      }
    }

    // ... 事件监听逻辑保持不变 (data, status, exit, error) ...
    session.on('data', (data) => {
      if (!sender.isDestroyed()) sender.send('terminal-incoming', { id, data });
    });
    session.on('status', (payload) => {
      if (!sender.isDestroyed()) sender.send('session-status', { id, ...payload });
    });
    session.on('exit', () => {
      if (!sender.isDestroyed()) sender.send('session-ended', { id });
      this.sessions.delete(id);
      this.sessionConfigs.delete(id);
      if (this.onSessionExit) this.onSessionExit(id);
    });
    session.on('error', (err) => {
      console.error(`[SessionManager] Session ${id} error:`, err);
    });
    session.on('transfer-progress', (payload) => {
      if (!sender.isDestroyed()) sender.send('transfer-progress', { sessionId: id, ...payload });
    });

    this.sessions.set(id, session);
    this.sessionConfigs.set(id, config);

    try {
      await session.init(config);
    } catch (e: any) {
      console.error(`[SessionManager] Failed to init session ${id}:`, e);
      if (!sender.isDestroyed()) {
        sender.send('session-status', { 
            id, 
            status: 'error', 
            log: `❌ Error: ${e.message}` 
        });
      }
    }
  }

  // ... write, resize, kill, killAll 保持不变 ...
  write(id: string, data: string) {
    const session = this.sessions.get(id);
    session?.write(data);
  }
  resize(id: string, cols: number, rows: number) {
    const session = this.sessions.get(id);
    session?.resize(cols, rows);
  }
  kill(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.kill(); 
      this.sessions.delete(id);
      this.sessionConfigs.delete(id);
      if (this.onSessionExit) this.onSessionExit(id);
    }
  }
  killAll() {
    this.sessions.forEach(s => s.kill());
    this.sessions.clear();
    this.sessionConfigs.clear();
  }

  async readSftpDir(id: string, remotePath?: string) {
    const session = this.sessions.get(id);
    if (!session || session.type !== 'sftp') {
      throw new Error('Session not found or not SFTP');
    }
    const sftpSession = session as SftpSession;
    return sftpSession.listDir(remotePath);
  }

  async uploadSftp(id: string, localPath: string, remotePath: string, transferId?: string) {
    const session = this.sessions.get(id);
    if (!session || session.type !== 'sftp') {
      throw new Error('Session not found or not SFTP');
    }
    const sftpSession = session as SftpSession;
    return sftpSession.uploadFile(localPath, remotePath, transferId);
  }

  async downloadSftp(id: string, remotePath: string, localPath: string, transferId?: string) {
    const session = this.sessions.get(id);
    if (!session || session.type !== 'sftp') {
      throw new Error('Session not found or not SFTP');
    }
    const sftpSession = session as SftpSession;
    return sftpSession.downloadFile(remotePath, localPath, transferId);
  }

  cancelTransfer(id: string, transferId: string) {
    const session = this.sessions.get(id);
    if (session && session.type === 'sftp') {
      (session as SftpSession).cancelTransfer(transferId);
    }
  }

  async renameSftp(id: string, oldPath: string, newPath: string) {
    const session = this.sessions.get(id);
    if (!session || session.type !== 'sftp') {
      throw new Error('Session not found or not SFTP');
    }
    const sftpSession = session as SftpSession;
    return sftpSession.rename(oldPath, newPath);
  }

  async createDirSftp(id: string, path: string) {
    const session = this.sessions.get(id);
    if (!session || session.type !== 'sftp') {
      throw new Error('Session not found or not SFTP');
    }
    const sftpSession = session as SftpSession;
    return sftpSession.createDir(path);
  }

  async deleteSftp(id: string, path: string) {
    const session = this.sessions.get(id);
    if (!session || session.type !== 'sftp') {
      throw new Error('Session not found or not SFTP');
    }
    const sftpSession = session as SftpSession;
    return sftpSession.delete(path);
  }

  getSessionConfig(id: string) {
    return this.sessionConfigs.get(id);
  }

  getSshClient(id: string): Client | null {
    const session = this.sessions.get(id);
    if (session && session instanceof SshSession) {
      return session.getClient();
    }
    return null;
  }

  async execCommand(id: string, command: string): Promise<string> {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Session not found');
    if (session instanceof SshSession) {
      return session.execCommand(command);
    }
    throw new Error('Exec not supported for this session type');
  }

  setOnSessionExit(cb: (id: string) => void) {
    this.onSessionExit = cb;
  }
}
