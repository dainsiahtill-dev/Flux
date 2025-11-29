import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { useUiStore } from './uiStore'

export interface SavedKey {
  id: string;
  alias: string; // 比如 "AWS Production Key"
  path: string;  // 本地绝对路径
}

// --- 类型定义 ---
export interface SavedHost {
  id: string;
  alias: string;
  host: string;
  port: number;
  user: string;
  group?: string;
  authType?: 'password' | 'privateKey';
  password?: string; 
  privateKeyPath?: string;
}

export interface Session {
  id: string;
  type: 'ssh' | 'local';
  name: string;
  user?: string;
  // ✅ 新增：让 Session 记住自己的认证方式和密钥路径
  authType?: 'password' | 'privateKey';
  privateKeyPath?: string;
  
  savedHostId?: string;
  status: 'connecting' | 'username-needed' | 'authenticating' | 'password-needed' | 'connected' | 'disconnected' | 'error';
  host: string;
  logs: string[];
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessions: [] as Session[],
    activeSessionId: '' as string,
    savedHosts: [] as SavedHost[],
    savedKeys: [] as SavedKey[]
  }),

  actions: {
    // ... (loadHosts, persistHosts, saveHost, deleteHost, updateHostPassword 保持不变)
    async loadHosts() {
      if (window.electronAPI) {
        try {
          const hosts = await window.electronAPI.getHosts()
          this.savedHosts = hosts || []
        } catch (error) {
          console.error('Failed to load hosts:', error)
        }
      }
    },

    async persistHosts() {
      if (window.electronAPI) {
        try {
          const dataToSave = JSON.parse(JSON.stringify(this.savedHosts))
          await window.electronAPI.saveHosts(dataToSave)
        } catch (error) {
          console.error('Failed to save hosts:', error)
        }
      }
    },
    async deleteHost(id: string) {
      const index = this.savedHosts.findIndex(h => h.id === id)
      if (index !== -1) {
        this.savedHosts.splice(index, 1)
        await this.persistHosts()
      }
    },

    async updateHostPassword(sessionId: string, newPassword: string) {
      const session = this.sessions.find(s => s.id === sessionId)
      if (!session || !session.savedHostId) return

      const host = this.savedHosts.find(h => h.id === session.savedHostId)
      if (host) {
        console.log(`[SessionStore] Auto-saving credential for host ${host.alias}`)
        host.password = newPassword 
        await this.persistHosts()
      }
    },
    async loadKeys() {
      if (window.electronAPI) {
        try {
          const keys = await window.electronAPI.getKeys()
          this.savedKeys = keys || []
        } catch (error) {
          console.error('Failed to load keys:', error)
        }
      }
    },
    async persistKeys() {
      if (window.electronAPI) {
        try {
          const data = JSON.parse(JSON.stringify(this.savedKeys))
          await window.electronAPI.saveKeys(data)
        } catch (error) {
          console.error('Failed to save keys:', error)
        }
      }
    },
    async saveKey(keyData: Partial<SavedKey>) {
      if (keyData.id) {
        const index = this.savedKeys.findIndex(k => k.id === keyData.id)
        if (index !== -1) {
          this.savedKeys[index] = { ...this.savedKeys[index], ...keyData } as SavedKey
        }
      } else {
        this.savedKeys.push({
          id: uuidv4(),
          alias: keyData.alias || 'Untitled Key',
          path: keyData.path || ''
        })
      }
      await this.persistKeys()
    },

    async saveHost(hostData: Partial<SavedHost>) {
      if (hostData.id) {
        const index = this.savedHosts.findIndex(h => h.id === hostData.id)
        if (index !== -1) {
          this.savedHosts[index] = { ...this.savedHosts[index], ...hostData } as SavedHost
        }
      } else {
        const newHost: SavedHost = {
          id: uuidv4(),
          alias: hostData.alias || 'Untitled',
          host: hostData.host || '',
          port: hostData.port || 22,
          user: hostData.user || 'root',
          group: hostData.group || 'Default',
          authType: 'password',
          privateKeyPath: '',
          ...hostData as SavedHost 
        }
        this.savedHosts.push(newHost)
      }
      await this.persistHosts()
    },
    async deleteKey(id: string) {
      const index = this.savedKeys.findIndex(k => k.id === id)
      if (index !== -1) {
        this.savedKeys.splice(index, 1)
        await this.persistKeys()
      }
    },

    // ===========================
    // 会话控制 (Session Actions)
    // ===========================
    
    addSession(hostConfig: SavedHost) {
      const id = uuidv4()
      const uiStore = useUiStore()

      this.sessions.push({
        id,
        type: 'ssh',
        name: hostConfig.alias || hostConfig.host,
        host: hostConfig.host,
        user: hostConfig.user,
        
        // ✅ 核心修改：把 authType 和 privateKeyPath 带入 Session
        authType: hostConfig.authType || 'password',
        privateKeyPath: hostConfig.privateKeyPath,
        
        savedHostId: hostConfig.id,
        status: 'connecting', 
        logs: [`Resolving host ${hostConfig.host}...`] 
      })
      
      this.setActive(id)
      uiStore.showTerminal()
      
      if (window.electronAPI) {
        window.electronAPI.initSession({ ...hostConfig, id, type: 'ssh' })
      }
    },

    // ... (后续方法保持不变)
    updateSessionStatus(id: string, status: Session['status'], logMsg?: string) {
      const session = this.sessions.find(s => s.id === id)
      if (session) {
        session.status = status
        if (logMsg) {
          session.logs.push(logMsg)
        }
      }
    },

    addSessionLog(id: string, logMsg: string) {
      const session = this.sessions.find(s => s.id === id)
      if (session) {
        session.logs.push(logMsg)
      }
    },

    addLocalSession() {
      const id = uuidv4()
      const uiStore = useUiStore()
      this.sessions.push({
        id, type: 'local', name: 'Local Shell', host: 'localhost', status: 'connected', logs: []
      })
      this.setActive(id)
      uiStore.showTerminal()
      if (window.electronAPI) window.electronAPI.initSession({ id, type: 'local' })
    },

    setActive(id: string) {
      this.activeSessionId = id
      const uiStore = useUiStore()
      uiStore.showTerminal()
    },

    closeSession(id: string) {
      const index = this.sessions.findIndex(s => s.id === id)
      if (index === -1) return
      if (window.electronAPI) window.electronAPI.closeSession({ id }) 
      this.sessions.splice(index, 1)
      if (this.activeSessionId === id) {
        if (this.sessions.length > 0) {
          const newActiveIndex = Math.max(0, index - 1)
          this.activeSessionId = this.sessions[newActiveIndex].id
        } else {
          this.activeSessionId = ''
          const uiStore = useUiStore()
          uiStore.showManager('hosts')
        }
      }
    },
  }
})