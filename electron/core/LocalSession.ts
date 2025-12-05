import * as pty from '@karinjs/node-pty'
import os from 'os'
import * as fs from 'fs'
import { BaseSession, SessionOptions } from './BaseSession'

export class LocalSession extends BaseSession {
  private ptyProcess: any = null;

  constructor(options: SessionOptions) {
    super(options);
  }

  async init(config: any = {}): Promise<void> {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const requestedCwd = typeof config?.cwd === 'string' && config.cwd.trim().length > 0
      ? config.cwd.trim()
      : ''
    const cwd = requestedCwd && fs.existsSync(requestedCwd)
      ? requestedCwd
      : os.homedir()
    
    try {
      this.ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd,
        env: process.env
      });

      console.log(`[LocalSession] Process started. PID: ${this.ptyProcess.pid}`);

      // 监听数据 -> 触发基类事件
      this.ptyProcess.onData((data: any) => {
        this.emit('data', data);
      });

      this.ptyProcess.onExit(() => {
        this.emit('exit');
      });

    } catch (error) {
      console.error('Failed to spawn local shell:', error);
      this.emit('error', error);
    }
  }

  write(data: string): void {
    this.ptyProcess?.write(data);
  }

  resize(cols: number, rows: number): void {
    try {
      this.ptyProcess?.resize(cols, rows);
    } catch (e) {
      // 忽略 resize 时的偶尔报错
    }
  }

  kill(): void {
    this.ptyProcess?.kill();
    this.ptyProcess = null;
  }
}