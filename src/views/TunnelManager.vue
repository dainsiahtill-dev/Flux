<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTunnelStore, type TunnelConfig } from '../stores/tunnelStore'
import { useSessionStore } from '../stores/sessionStore'
import { useLocale } from '../composables/useLocale'
import { Activity, AlertTriangle, CheckCircle2, Play, RefreshCw, Save, Square, Trash2, Zap } from 'lucide-vue-next'

const tunnelStore = useTunnelStore()
const sessionStore = useSessionStore()
const { t } = useLocale()

const selectedTunnelId = ref<string | null>(null)
const selectedSessionId = ref<string>('')
const form = ref<TunnelConfig>({
  id: '',
  name: '',
  type: 'L',
  description: '',
  hostId: '',
  bindHost: '127.0.0.1',
  bindPort: 1080,
  targetHost: '127.0.0.1',
  targetPort: 22,
  autoStart: false
})

const saving = ref(false)
const checking = ref(false)
const refreshing = ref(false)
const portCheckStatus = ref<'idle' | 'ok' | 'error'>('idle')
const portCheckMessage = ref('')
let poller: any = null

const activeMap = computed(() => {
  const map = new Map<string, any>()
  tunnelStore.activeTunnels.forEach((a) => map.set(a.id, a))
  return map
})

const hostName = (id?: string) => {
  const host = sessionStore.savedHosts.find((h) => h.id === id)
  return host ? host.alias || host.host : t.value.tunnels.hints.unknownHost
}

const findSuggestedSession = (hostId?: string) => {
  const candidate = sessionStore.sessions.find((s) => s.type === 'ssh' && s.savedHostId === hostId)
  return candidate?.id || ''
}

const resetForm = () => {
  selectedTunnelId.value = null
  form.value = {
    id: '',
    name: '',
    type: 'L',
    description: '',
    hostId: '',
    bindHost: '127.0.0.1',
    bindPort: 1080,
    targetHost: '127.0.0.1',
    targetPort: 22,
    autoStart: false
  }
  selectedSessionId.value = ''
  portCheckStatus.value = 'idle'
  portCheckMessage.value = ''
}

const selectTunnel = (config: TunnelConfig) => {
  selectedTunnelId.value = config.id
  form.value = { ...config }
  selectedSessionId.value = findSuggestedSession(config.hostId)
  portCheckStatus.value = 'idle'
  portCheckMessage.value = ''
}

const ensureSaved = async () => {
  const id = await tunnelStore.saveTunnel(form.value)
  form.value.id = id
  selectedTunnelId.value = id
}

const handleSave = async () => {
  saving.value = true
  try {
    await ensureSaved()
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!selectedTunnelId.value) return
  await tunnelStore.deleteTunnel(selectedTunnelId.value)
  resetForm()
  await tunnelStore.refreshActive()
}

const handleStart = async (config?: TunnelConfig) => {
  const target = config || form.value
  if (!target.hostId) {
    portCheckStatus.value = 'error'
    portCheckMessage.value = t.value.tunnels.hints.selectHost
    return
  }
  try {
    if (!target.id) {
      await ensureSaved()
    }

    const sessionId = config ? findSuggestedSession(config.hostId) : (selectedSessionId.value || findSuggestedSession(target.hostId))
    await tunnelStore.startTunnel({ ...target, id: target.id || form.value.id }, sessionId || undefined)
    await tunnelStore.refreshActive()
    portCheckStatus.value = 'idle'
    portCheckMessage.value = ''
  } catch (error: any) {
    portCheckStatus.value = 'error'
    portCheckMessage.value = error?.message || t.value.tunnels.hints.startFailed
  }
}

const handleStop = async (id?: string) => {
  const targetId = id || form.value.id
  if (!targetId) return
  await tunnelStore.stopTunnel(targetId)
}

const handlePortCheck = async () => {
  checking.value = true
  try {
    const result = await tunnelStore.checkPort(form.value.bindPort, form.value.bindHost)
    portCheckStatus.value = result.status
    portCheckMessage.value = result.message || (result.status === 'ok' ? t.value.tunnels.portCheck.ok : t.value.tunnels.portCheck.error)
  } finally {
    checking.value = false
  }
}

const refreshActive = async () => {
  refreshing.value = true
  try {
    await tunnelStore.refreshActive()
  } finally {
    refreshing.value = false
  }
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  const fixed = value >= 10 ? value.toFixed(1) : value.toFixed(2)
  return `${fixed} ${units[i]}`
}

const formatDuration = (start: number) => {
  const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h`
}

const routeLabel = (config: TunnelConfig) => {
  if (config.type === 'D') {
    return `SOCKS5 ${config.bindHost || '127.0.0.1'}:${config.bindPort}`
  }
  const left = `${config.bindHost || '127.0.0.1'}:${config.bindPort}`
  const right = `${config.targetHost || '127.0.0.1'}:${config.targetPort || 0}`
  return `${left} -> ${right}`
}

watch(
  () => form.value.hostId,
  (val) => {
    selectedSessionId.value = findSuggestedSession(val)
  }
)

onMounted(async () => {
  await tunnelStore.loadTunnels()
  await tunnelStore.refreshActive()
  poller = setInterval(refreshActive, 4000)
})

onBeforeUnmount(() => {
  if (poller) clearInterval(poller)
})
</script>

<template>
  <div class="relative flex h-full w-full bg-transparent text-cyber-text">
    <div class="flex-1 flex flex-col overflow-y-auto">
      <div class="px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase tracking-[0.3em] text-neon-blue font-mono mb-1">{{ t.tunnels.subtitle }}</div>
          <h1 class="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Zap size="18" class="text-neon-blue drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]" />
            {{ t.tunnels.title }}
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="refreshActive"
            class="px-3 py-2 text-xs border border-neon-blue/40 rounded bg-neon-blue/10 text-neon-blue hover:bg-neon-blue hover:text-black transition-all flex items-center gap-2"
          >
            <RefreshCw :class="refreshing ? 'animate-spin' : ''" size="14" />
            <span>{{ t.tunnels.actions.refresh }}</span>
          </button>
          <button
            @click="resetForm"
            class="px-3 py-2 text-xs border border-cyber-text/30 rounded bg-cyber-light/20 hover:border-white hover:text-white transition-colors"
          >
            {{ t.tunnels.actions.new }}
          </button>
        </div>
      </div>

      <div class="px-6 pb-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div class="rounded-lg border border-neon-blue/20 bg-cyber-dark/60 shadow-neon-blue-inset p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[11px] uppercase text-cyber-text/60">{{ t.tunnels.savedTitle }}</div>
              <div class="text-sm text-cyber-text/80">{{ t.tunnels.hints.saved }}</div>
            </div>
            <div class="text-xs text-neon-blue font-mono">{{ tunnelStore.savedTunnels.length }} {{ t.tunnels.actions.routes }}</div>
          </div>
          <div v-if="tunnelStore.savedTunnels.length === 0" class="p-4 text-center text-cyber-text/50 border border-dashed border-cyber-text/30 rounded">
            {{ t.tunnels.hints.empty }}
          </div>
          <div v-else class="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scroll">
            <div
              v-for="tunnel in tunnelStore.savedTunnels"
              :key="tunnel.id"
              class="p-3 rounded border transition-all cursor-pointer bg-cyber-light/10 hover:border-neon-blue/40"
              :class="selectedTunnelId === tunnel.id ? 'border-neon-blue/70 bg-neon-blue/5' : 'border-cyber-text/20'"
              @click="selectTunnel(tunnel)"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <span
                    class="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold"
                    :class="tunnel.type === 'L' ? 'bg-neon-blue/20 text-neon-blue' : tunnel.type === 'R' ? 'bg-amber-500/20 text-amber-300' : 'bg-neon-pink/20 text-neon-pink'"
                  >
                    {{ t.tunnels.types[tunnel.type.toLowerCase()] }}
                  </span>
                  <span class="text-sm text-white font-semibold">{{ tunnel.name || t.tunnels.labels.unnamed }}</span>
                </div>
                <div class="flex items-center gap-1 text-[11px] text-cyber-text/70">
                  <CheckCircle2 v-if="activeMap.get(tunnel.id)" size="14" class="text-neon-green" />
                  <Activity v-else size="14" class="text-cyber-text/40" />
                  <span>{{ hostName(tunnel.hostId) }}</span>
                </div>
              </div>
              <div class="text-[11px] text-cyber-text/70 font-mono">{{ routeLabel(tunnel) }}</div>
              <div class="mt-2 flex items-center gap-2">
                <button
                  class="px-2 py-1 text-[10px] rounded border border-neon-blue/40 text-neon-blue hover:bg-neon-blue hover:text-black transition-all flex items-center gap-1"
                  @click.stop="handleStart(tunnel)"
                  :title="t.tunnels.actions.quickStart"
                >
                  <Play size="12" />
                  {{ t.tunnels.actions.start }}
                </button>
                <button
                  v-if="activeMap.get(tunnel.id)"
                  class="px-2 py-1 text-[10px] rounded border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                  @click.stop="handleStop(tunnel.id)"
                >
                  <Square size="12" />
                  {{ t.tunnels.actions.stop }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-neon-blue/20 bg-cyber-dark/60 shadow-neon-blue-inset p-4 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-[11px] uppercase text-cyber-text/60">{{ t.tunnels.activeTitle }}</div>
              <div class="text-sm text-cyber-text/80">{{ t.tunnels.hints.live }}</div>
            </div>
            <div class="text-xs text-neon-blue font-mono">{{ tunnelStore.activeTunnels.length }} {{ t.tunnels.actions.routes }}</div>
          </div>
          <div v-if="tunnelStore.activeTunnels.length === 0" class="flex-1 flex flex-col items-center justify-center text-cyber-text/50 border border-dashed border-cyber-text/30 rounded">
            <AlertTriangle size="18" class="mb-2" />
            <div class="text-xs">{{ t.tunnels.hints.noActive }}</div>
          </div>
          <div v-else class="space-y-2 overflow-y-auto pr-1 custom-scroll flex-1">
            <div
              v-for="active in tunnelStore.activeTunnels"
              :key="active.id"
              class="p-3 rounded border border-neon-blue/30 bg-black/50 shadow-[0_0_10px_rgba(0,243,255,0.05)]"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span
                    class="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold"
                    :class="active.type === 'L' ? 'bg-neon-blue/20 text-neon-blue' : active.type === 'R' ? 'bg-amber-500/20 text-amber-300' : 'bg-neon-pink/20 text-neon-pink'"
                  >
                    {{ t.tunnels.types[active.type.toLowerCase()] }}
                  </span>
                  <span class="text-sm text-white font-semibold">{{ active.name || t.tunnels.labels.unnamed }}</span>
                </div>
                <button
                  class="px-2 py-1 text-[10px] rounded border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                  @click="handleStop(active.id)"
                >
                  <Square size="12" />
                  {{ t.tunnels.actions.stop }}
                </button>
              </div>
              <div class="text-[11px] text-cyber-text/70 font-mono mt-1">
                {{ routeLabel(active as any) }}
              </div>
              <div class="mt-2 grid grid-cols-2 gap-2 text-[11px] text-cyber-text/70">
                <div class="flex items-center gap-1">
                  <CheckCircle2 size="12" class="text-neon-green" />
                  {{ hostName(active.hostId) }}
                </div>
                <div class="flex items-center gap-1">
                  <Activity size="12" class="text-neon-blue" />
                  <span>{{ t.tunnels.traffic.up }} {{ formatBytes(active.bytesUp) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <AlertTriangle size="12" class="text-neon-pink" />
                  <span>{{ t.tunnels.traffic.down }} {{ formatBytes(active.bytesDown) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <RefreshCw size="12" class="text-cyber-text/60" />
                  <span>{{ t.tunnels.traffic.since }} {{ formatDuration(active.startedAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="w-[420px] border-l border-neon-blue/20 bg-cyber-black/80 backdrop-blur-xl flex flex-col">
      <div class="p-6 border-b border-neon-blue/10">
        <div class="text-[10px] uppercase tracking-[0.3em] text-neon-blue font-mono mb-1">{{ t.tunnels.formTitle }}</div>
        <div class="text-lg text-white font-bold">{{ form.name || t.tunnels.labels.unnamed }}</div>
        <div class="text-xs text-cyber-text/60">{{ t.tunnels.hints.bind }}</div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 space-y-4">
        <div class="space-y-2">
          <label class="text-[10px] uppercase text-cyber-text/50">{{ t.tunnels.labels.name }}</label>
          <input v-model="form.name" type="text" class="cyber-input" :placeholder="t.tunnels.placeholders.name" />
        </div>

        <div class="space-y-2">
          <label class="text-[10px] uppercase text-cyber-text/50">{{ t.tunnels.labels.description }}</label>
          <textarea v-model="form.description" class="cyber-input min-h-[64px]" :placeholder="t.tunnels.placeholders.description"></textarea>
        </div>

        <div class="space-y-2">
          <label class="text-[10px] uppercase text-cyber-text/50">{{ t.tunnels.labels.host }}</label>
          <select v-model="form.hostId" class="cyber-select">
            <option value="" disabled>{{ t.tunnels.placeholders.host }}</option>
            <option v-for="host in sessionStore.savedHosts" :key="host.id" :value="host.id">
              {{ host.alias || host.host }} ({{ host.user }}@{{ host.host }})
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-[10px] uppercase text-cyber-text/50">{{ t.tunnels.labels.type }}</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="mode in ['L','R','D']"
              :key="mode"
              class="py-2 text-xs border rounded flex items-center justify-center gap-1 transition-all"
              :class="form.type === mode ? 'border-neon-blue bg-neon-blue/10 text-neon-blue shadow-[0_0_8px_rgba(0,243,255,0.2)]' : 'border-cyber-text/20 text-cyber-text/60 hover:text-white hover:border-neon-blue/30'"
              @click="form.type = mode as any"
            >
              <Zap size="14" />
              <span>{{ t.tunnels.types[mode.toLowerCase()] }}</span>
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <label class="text-[10px] uppercase text-cyber-text/50">{{ form.type === 'R' ? t.tunnels.labels.remoteBind : t.tunnels.labels.bind }}</label>
          <div class="grid grid-cols-3 gap-2">
            <input v-model="form.bindHost" type="text" class="cyber-input col-span-2" :placeholder="t.tunnels.placeholders.bindHost" />
            <div class="flex items-center gap-2">
              <input v-model.number="form.bindPort" type="number" class="cyber-input" :placeholder="t.tunnels.placeholders.bindPort" />
              <button
                class="px-2 py-1 text-[10px] rounded border border-neon-blue/40 text-neon-blue hover:bg-neon-blue hover:text-black transition-all"
                @click="handlePortCheck"
              >
                {{ checking ? '...' : t.tunnels.actions.checkPort }}
              </button>
            </div>
          </div>
          <p v-if="portCheckStatus !== 'idle'" class="text-[11px]" :class="portCheckStatus === 'ok' ? 'text-neon-green' : 'text-neon-pink'">
            {{ portCheckMessage }}
          </p>
        </div>

        <div v-if="form.type !== 'D'" class="space-y-3">
          <label class="text-[10px] uppercase text-cyber-text/50">{{ t.tunnels.labels.target }}</label>
          <div class="grid grid-cols-3 gap-2">
            <input v-model="form.targetHost" type="text" class="cyber-input col-span-2" :placeholder="t.tunnels.placeholders.targetHost" />
            <input v-model.number="form.targetPort" type="number" class="cyber-input" :placeholder="t.tunnels.placeholders.targetPort" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-[10px] uppercase text-cyber-text/50">{{ t.tunnels.labels.session }}</label>
          <select v-model="selectedSessionId" class="cyber-select">
            <option value="">{{ t.tunnels.placeholders.session }}</option>
            <option v-for="s in sessionStore.sessions.filter((s) => s.type === 'ssh')" :key="s.id" :value="s.id">
              {{ s.name || s.host }} ({{ s.user }}@{{ s.host }})
            </option>
          </select>
        </div>
      </div>

      <div class="p-6 border-t border-neon-blue/10 space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <button
            @click="handleStart()"
            class="w-full py-3 bg-neon-blue text-black font-bold uppercase tracking-widest rounded hover:bg-white hover:shadow-[0_0_12px_rgba(0,243,255,0.7)] transition-all flex items-center justify-center gap-2"
          >
            <Play size="16" />
            <span>{{ t.tunnels.actions.start }}</span>
          </button>
          <button
            @click="handleStop()"
            class="w-full py-3 border border-red-500/60 text-red-400 rounded hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Square size="16" />
            <span>{{ t.tunnels.actions.stop }}</span>
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            @click="handleSave"
            class="w-full py-2 border border-neon-blue/50 text-neon-blue rounded hover:bg-neon-blue hover:text-black transition-all flex items-center justify-center gap-2"
            :class="{ 'opacity-60 pointer-events-none': saving }"
          >
            <Save size="14" />
            <span>{{ saving ? t.tunnels.actions.saving : t.tunnels.actions.save }}</span>
          </button>
          <button
            v-if="selectedTunnelId"
            @click="handleDelete"
            class="w-full py-2 border border-cyber-text/30 text-cyber-text rounded hover:border-red-500 hover:text-red-400 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size="14" />
            <span>{{ t.tunnels.actions.delete }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cyber-input {
  @apply w-full bg-transparent border-b border-cyber-text/30 py-1 text-sm text-cyber-text-bright focus:outline-none focus:border-neon-blue focus:shadow-[0_1px_0_#00f3ff] transition-all placeholder-cyber-text/30;
}
.cyber-select {
  @apply w-full bg-cyber-black border border-cyber-text/30 rounded text-xs text-cyber-text-bright p-2 focus:border-neon-blue focus:outline-none;
}
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(0, 243, 255, 0.3);
  border-radius: 9999px;
}
</style>
