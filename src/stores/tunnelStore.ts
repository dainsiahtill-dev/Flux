import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { useSessionStore } from './sessionStore'

export type TunnelType = 'L' | 'R' | 'D'

export interface TunnelConfig {
  id: string
  name: string
  type: TunnelType
  description?: string
  hostId: string
  bindHost?: string
  bindPort: number
  targetHost?: string
  targetPort?: number
  autoStart?: boolean
}

export interface ActiveTunnel {
  id: string
  name: string
  type: TunnelType
  description?: string
  status: 'starting' | 'active' | 'error'
  error?: string
  bytesUp: number
  bytesDown: number
  startedAt: number
  bindHost?: string
  bindPort: number
  targetHost?: string
  targetPort?: number
  sessionId?: string
  hostId?: string
}

const createDefaultConfig = (): TunnelConfig => ({
  id: uuidv4(),
  name: 'New Tunnel',
  type: 'L',
  description: '',
  hostId: '',
  bindHost: '127.0.0.1',
  bindPort: 1080,
  targetHost: '127.0.0.1',
  targetPort: 22,
  autoStart: false
})

export const useTunnelStore = defineStore('tunnel', {
  state: () => ({
    savedTunnels: [] as TunnelConfig[],
    activeTunnels: [] as ActiveTunnel[],
    lastPortCheck: { status: 'idle' as 'idle' | 'ok' | 'error', message: '' }
  }),

  actions: {
    async loadTunnels() {
      if (window.electronAPI) {
        try {
          const tunnels = await window.electronAPI.getTunnels()
          this.savedTunnels = tunnels || []
        } catch (error) {
          console.error('Failed to load tunnels', error)
        }
      }
    },

    async persistTunnels() {
      if (window.electronAPI) {
        const copy = JSON.parse(JSON.stringify(this.savedTunnels))
        await window.electronAPI.saveTunnels(copy)
      }
    },

    async saveTunnel(tunnel: Partial<TunnelConfig>) {
      if (tunnel.id) {
        const index = this.savedTunnels.findIndex((t) => t.id === tunnel.id)
        if (index !== -1) {
          this.savedTunnels[index] = { ...this.savedTunnels[index], ...tunnel } as TunnelConfig
        }
      } else {
        const base = createDefaultConfig()
        this.savedTunnels.push({ ...base, ...tunnel, id: base.id } as TunnelConfig)
        tunnel.id = base.id
      }
      await this.persistTunnels()
      return tunnel.id as string
    },

    async deleteTunnel(id: string) {
      const index = this.savedTunnels.findIndex((t) => t.id === id)
      if (index !== -1) {
        this.savedTunnels.splice(index, 1)
        await this.persistTunnels()
      }
    },

    async refreshActive() {
      if (window.electronAPI) {
        try {
          const list = await window.electronAPI.getActiveTunnels()
          this.activeTunnels = list || []
        } catch (error) {
          console.error('Failed to fetch active tunnels', error)
        }
      }
    },

    async startTunnel(config: TunnelConfig, sessionId?: string) {
      const sessionStore = useSessionStore()
      const host = sessionStore.savedHosts.find((h) => h.id === config.hostId)
      if (!host) throw new Error('Missing host binding for this tunnel')
      if (!window.electronAPI) throw new Error('Electron API not ready')

      const payload = {
        config,
        hostConfig: host,
        sessionId
      }

      const result = await window.electronAPI.startTunnel(payload)
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to start tunnel')
      }
      await this.refreshActive()
      return result.data
    },

    async startTunnelById(id: string, sessionId?: string) {
      const tunnel = this.savedTunnels.find((t) => t.id === id)
      if (!tunnel) throw new Error('Tunnel not found')
      return this.startTunnel(tunnel, sessionId)
    },

    async stopTunnel(id: string) {
      if (!window.electronAPI) return
      await window.electronAPI.stopTunnel(id)
      await this.refreshActive()
    },

    async checkPort(port: number, host?: string) {
      if (!window.electronAPI) {
        this.lastPortCheck = { status: 'error', message: 'API unavailable' }
        return this.lastPortCheck
      }
      const result = await window.electronAPI.checkPortAvailability(port, host)
      this.lastPortCheck = { status: result.available ? 'ok' : 'error', message: result.message || '' }
      return this.lastPortCheck
    }
  }
})
