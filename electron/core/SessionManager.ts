import { WebContents } from 'electron'
import { BaseSession } from './BaseSession'
import { LocalSession } from './LocalSession'
import { SshSession } from './SshSession'
import { OpenSshSession } from './OpenSshSession' // 引入新类

export class SessionManager {
  private sessions: Map<string, BaseSession> = new Map();

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
      }
    }

    let session: BaseSession;

    if (type === 'local') {
      session = new LocalSession({ id, type });
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
    });
    session.on('error', (err) => {
      console.error(`[SessionManager] Session ${id} error:`, err);
    });

    this.sessions.set(id, session);

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
    }
  }
  killAll() {
    this.sessions.forEach(s => s.kill());
    this.sessions.clear();
  }
}