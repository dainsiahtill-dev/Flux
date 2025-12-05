import * as pty from '@karinjs/node-pty'
import * as os from 'os'
import * as fs from 'fs'
import { BaseSession, SessionOptions } from './BaseSession'

export class OpenSshSession extends BaseSession {
  private ptyProcess: any = null;

  constructor(options: SessionOptions) {
    super(options);
  }

  async init(config: any): Promise<void> {
    return new Promise((resolve, reject) => {
      // 1. 准备命令参数
      const args: string[] = [];
      
      // 端口
      if (config.port && config.port !== 22) {
        args.push('-p', config.port.toString());
      }

      // 私钥 (如果有)
      if (config.authType === 'privateKey' && config.privateKeyPath) {
        // 检查文件是否存在
        if (fs.existsSync(config.privateKeyPath)) {
            // 注意：Windows 下 OpenSSH 对权限敏感，有时需要处理，但通常直接传路径即可
            // 如果路径包含空格，node-pty 会处理，但最好确保路径干净
            args.push('-i', config.privateKeyPath);
        } else {
            this.emit('data', `\r\n\x1b[31mWarning: Private key not found at ${config.privateKeyPath}\x1b[0m\r\n`);
        }
      }

      // 强制伪终端分配 (Force pseudo-tty allocation)
      // 这能确保 ssh 即使在非交互模式下也表现得像个终端
      args.push('-tt');

      // 目标: user@host
      args.push(`${config.user}@${config.host}`);

      this.emit('status', { status: 'connecting', log: `Spawn: ssh ${args.join(' ')}` });

      try {
        // 2. 启动 PTY 进程
        // Windows 上通常调用 ssh.exe (System32 下)
        // Mac/Linux 调用 /usr/bin/ssh
        const shell = os.platform() === 'win32' ? 'ssh.exe' : 'ssh';
        
        this.ptyProcess = pty.spawn(shell, args, {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd: os.homedir(),
          env: process.env as any
        });

        // 3. 监听数据
        this.ptyProcess.onData((data: string) => {
          this.emit('data', data);
          
          // 简单的状态嗅探 (Native 模式很难精准，只能大概猜测)
          if (data.includes('password:') || data.includes('Password:')) {
             // 这里我们可以不触发弹窗，因为 Native SSH 会直接在终端里显示 prompt
             // 用户直接在终端输入即可
          }
        });

        this.ptyProcess.onExit((res: { exitCode: number, signal: number }) => {
          this.emit('exit');
          this.emit('status', { status: 'disconnected', log: `Process exited with code ${res.exitCode}` });
        });

        // Native 模式下，只要进程启动了，我们就认为“连接成功”
        // 具体的认证失败信息会直接打印在终端屏幕上，这正是我们想要的“原生反馈”
        this.emit('status', { status: 'connected', log: 'Native SSH process started.' });

        if (typeof config.initialCommand === 'string' && config.initialCommand.trim().length) {
          const payload = config.initialCommand.endsWith('\n') || config.initialCommand.endsWith('\r')
            ? config.initialCommand
            : `${config.initialCommand}\n`;
          setTimeout(() => this.ptyProcess?.write(payload), 300);
        }

        resolve();

      } catch (error: any) {
        this.emit('status', { status: 'error', log: `Failed to spawn ssh: ${error.message}` });
        reject(error);
      }
    });
  }

  write(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  kill(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
}