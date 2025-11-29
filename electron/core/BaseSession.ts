import { EventEmitter } from 'events'

export interface SessionOptions {
  id: string;
  type: 'ssh' | 'local';
  [key: string]: any; // 允许由 SSH 配置或 Shell 配置扩展
}

export abstract class BaseSession extends EventEmitter {
  public id: string;
  public type: 'ssh' | 'local';

  constructor(options: SessionOptions) {
    super();
    this.id = options.id;
    this.type = options.type;
  }

  // 必须实现的方法
  abstract init(config: any): Promise<void>;
  abstract write(data: string): void;
  abstract resize(cols: number, rows: number): void;
  abstract kill(): void;
}