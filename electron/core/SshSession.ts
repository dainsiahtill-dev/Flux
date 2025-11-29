import { Client } from 'ssh2'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { BaseSession, SessionOptions } from './BaseSession'

export class SshSession extends BaseSession {
  private conn: Client;
  private stream: any = null;

  constructor(options: SessionOptions) {
    super(options);
    this.conn = new Client();
  }

  /**
   * 路径解析助手：处理 ~ 和 路径分隔符
   */
  private resolvePath(filePath: string): string {
    if (!filePath) return '';
    let resolved = filePath;
    if (resolved.startsWith('~')) {
      resolved = path.join(os.homedir(), resolved.slice(1));
    }
    return path.normalize(resolved);
  }

  async init(config: any): Promise<void> {
    return new Promise((resolve, reject) => {
      
      // 1. 基础检查
      if (!config.user) {
        this.emitStatus('username-needed', 'Missing username credential. Waiting for input...');
        reject(new Error('Username needed')); 
        return; 
      }

      // 2. 私钥检查 (Fail Fast - 快速失败机制)
      if (config.authType === 'privateKey') {
        if (!config.privateKeyPath) {
          const msg = '❌ Private key path is not configured.';
          this.emitStatus('error', msg);
          reject(new Error(msg));
          return;
        }

        const resolvedPath = this.resolvePath(config.privateKeyPath);
        // 打印一条真实的调试日志，确认我们到底读了哪个文件
        this.emitStatus('connecting', `🔍 Locating Private Key at: "${resolvedPath}"`);

        if (!fs.existsSync(resolvedPath)) {
          const msg = `❌ File Not Found. Please check path: "${resolvedPath}"`;
          this.emitStatus('error', msg);
          reject(new Error(msg));
          return;
        }

        // 将解析后的绝对路径存回 config，供后续使用
        config.resolvedPrivateKeyPath = resolvedPath;
      }

      // 3. 开始连接
      this.emitStatus('connecting', `Starting a new connection to: "${config.host}" port "${config.port}"`);

      // ==========================================
      // ✅ 监听握手 (Handshake) - SSH2 原生风格
      // ==========================================
      this.conn.on('handshake', (negotiated) => {
        this.emitStatus('connecting', `⚙️ Handshake finished`);
        this.emitStatus('connecting', `⚙️ Cipher: ${negotiated.kex.client_to_server_cipher_algorithm}`);
        this.emitStatus('connecting', `⚙️ Key Exchange: ${negotiated.kex.kex_algorithm}`);
        this.emitStatus('connecting', `⚙️ Host Key Algo: ${negotiated.kex.server_host_key_algorithm}`);
      });

      this.conn.on('ready', () => {
        this.emitStatus('connected', `👤 Connection to "${config.host}" established`);
        this.emitStatus('connected', `⚙️ Starting SSH session`);

        this.conn.shell((err, stream) => {
          if (err) {
            this.emit('error', 'Shell error: ' + err.message);
            reject(err);
            return;
          }
          this.stream = stream;
          resolve();

          stream.on('data', (data: any) => this.emit('data', data.toString()));
          stream.on('close', () => {
            this.conn.end();
            this.emit('exit');
          });
        });
      });

      this.conn.on('error', (err: any) => {
        // 专门捕获认证失败
        if (err.level === 'client-authentication') {
             this.emitStatus('password-needed', `👤 Authentication failed (Server said: Forbidden).`);
             
             // 根据当前的登录用户给出智能提示
             const hint = config.user === 'root' 
                ? 'Hint: Many cloud servers disable "root" login. Try "ubuntu" or "ec2-user".' 
                : 'Hint: Check if your Private Key matches this server.';
             this.emitStatus('password-needed', `⚙️ ${hint}`);
             
             this.conn.end();
             reject(new Error('Authentication failed')); 
        } else {
             this.emitStatus('error', `😨 Connection error: ${err.message}`);
             this.conn.end();
             reject(err);
        }
      });

      try {
        const connectOptions: any = {
          host: config.host,
          port: parseInt(config.port),
          username: config.user,
          readyTimeout: 20000,
          keepaliveInterval: 10000,
          tryKeyboard: true,
          
          // ✅ 底层调试日志 (帮助分析 Auth 失败原因)
          debug: (msg: string) => {
            // 过滤掉频繁的心跳日志
            if (msg.includes('DEBUG: Parser: IN_MSG')) {
                // 如果是认证失败包，打印出来
                if (msg.includes('USERAUTH_FAILURE')) {
                    this.emitStatus('connecting', `🔴 DEBUG: Server rejected auth: ${msg}`);
                }
            }
            // 记录尝试使用的认证方法
            if (msg.includes('DEBUG: Outgoing: Writing USERAUTH_REQUEST')) {
                 this.emitStatus('connecting', `🟡 DEBUG: Trying auth method...`);
            }
          },

          // 保持必要的安全性设置
          hostHash: 'sha256',
          hostVerifier: (hashedKey: Buffer) => {
            // 只做必要的验证返回，不打印太多模拟日志
            return true; 
          }
        };

        if (config.authType === 'privateKey') {
            const keyPath = config.resolvedPrivateKeyPath;
            this.emitStatus('connecting', `🔑 Reading private key...`);
            
            try {
                connectOptions.privateKey = fs.readFileSync(keyPath);
            } catch (fsErr: any) {
                throw new Error(`Failed to read private key file: ${fsErr.message}`);
            }
            
            if (config.password) {
                this.emitStatus('connecting', `🔑 Using passphrase.`);
                connectOptions.passphrase = config.password;
            }
        } else {
            connectOptions.password = config.password;
        }

        this.conn.connect(connectOptions);

      } catch (e: any) {
        reject(e);
        this.emitStatus('error', `❌ Init Error: ${e.message}`);
      }
    });
  }
  
  private emitStatus(status: string, log: string) {
    this.emit('status', { status, log });
  }

  write(data: string): void { this.stream?.write(data); }
  resize(cols: number, rows: number): void { this.stream?.setWindow(rows, cols, 0, 0); }
  kill(): void { this.conn.end(); this.stream = null; }
}