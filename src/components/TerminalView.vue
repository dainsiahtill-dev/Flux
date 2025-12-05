<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount, computed, watch } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useSessionStore } from '../stores/sessionStore'
import ConnectionOverlay from './ConnectionOverlay.vue'
import TerminalAssistant from './TerminalAssistant.vue'
import { PanelRightOpen, PanelRightClose } from 'lucide-vue-next'
import { useLocale } from '../composables/useLocale'

const props = defineProps<{ sessionId: string }>()
const sessionStore = useSessionStore()
const { t } = useLocale()
const overlayCopy = computed(() => t.value.connectionOverlay)

const currentSession = computed(() => sessionStore.sessions.find(s => s.id === props.sessionId))

const containerRef = ref<HTMLElement | null>(null)
const terminalDiv = ref<HTMLElement | null>(null)
const showAssistant = ref(true)
const toggleAssistant = () => { showAssistant.value = !showAssistant.value }
let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let isTerminalOpen = false
const contextMenu = ref<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })

const tempCredentials = ref<{ user?: string; password?: string }>({})

// 监听状态变化，连接成功时保存密码
watch(() => currentSession.value?.status, (newStatus) => {
  if (newStatus === 'connected') {
    if (tempCredentials.value.password) {
      console.log('Connection successful, saving password/passphrase...')
      sessionStore.updateHostPassword(props.sessionId, tempCredentials.value.password)
      tempCredentials.value.password = undefined
    }
  }
})

// === 处理凭据提交 ===
const handleCredentialsSubmit = (creds: { user?: string; password?: string }) => {
  if (!currentSession.value) return

  // 1. 记录输入
  tempCredentials.value = { ...tempCredentials.value, ...creds }

  // 2. 更新 UI
  const loadingText = creds.user 
    ? overlayCopy.value.messages.updatingIdentity
    : overlayCopy.value.messages.verifyingToken
  sessionStore.updateSessionStatus(props.sessionId, 'authenticating', loadingText)
  
  // 3. 查找原始配置
  const originalHost = sessionStore.savedHosts.find(h => h.id === currentSession.value?.savedHostId)
  
  // 4. 构造配置
  // ✅ 核心修复：必须确保 authType 和 privateKeyPath 被包含在内
  const configToUse = {
    ...(originalHost || {}),           
    host: currentSession.value.host,   
    port: originalHost?.port || 22,    
    
    // 确保 User 不为空
    user: tempCredentials.value.user || currentSession.value?.user || originalHost?.user || 'root',
    
    // 确保 Password (或 Passphrase) 被传递
    password: tempCredentials.value.password || originalHost?.password,
    
    // ✅ 确保认证类型和私钥路径正确传递
    // 优先使用 Session 中的状态 (因为它最准确地反映了初始连接意图)
    authType: currentSession.value?.authType || originalHost?.authType || 'password',
    privateKeyPath: currentSession.value?.privateKeyPath || originalHost?.privateKeyPath,
    
    id: props.sessionId,
    type: 'ssh'
  }

  if (window.electronAPI) {
    window.electronAPI.initSession(configToUse)
  }
}

const handleCancel = () => {
  sessionStore.closeSession(props.sessionId)
}

// === 终端初始化 (保持不变) ===
const initTerminal = () => {
  if (isTerminalOpen || !terminalDiv.value) return

  if (terminalDiv.value.clientWidth > 0) {
    if (!term) {
      term = new Terminal({
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 14,
        cursorBlink: true,
        cursorStyle: 'underline',
        theme: {
          background: '#00000000',
          foreground: '#00f3ff',
          cursor: '#ff00ff',
          selectionBackground: 'rgba(0, 243, 255, 0.3)',
          black: '#000000',
          red: '#ff5555',
          green: '#50fa7b',
          yellow: '#f1fa8c',
          blue: '#bd93f9',
          magenta: '#ff79c6',
          cyan: '#8be9fd',
          white: '#f8f8f2',
        },
        allowTransparency: true
      })
      term.attachCustomKeyEventHandler((ev) => {
        if (ev.key === 'Tab') {
          ev.preventDefault()
          return true
        }
        return true
      })
      
      term.onData(data => {
        const isReady = currentSession.value?.status === 'connected' || currentSession.value?.type === 'local'
        if (isReady) {
          window.electronAPI.sendInput({ id: props.sessionId, data })
        }
      })
    }

    if (!fitAddon) {
        fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
    }

    term.open(terminalDiv.value)
    isTerminalOpen = true
    
    try {
        fitAddon.fit()
    } catch (e) {
        console.warn('Initial fit failed', e)
    }
    
    term.focus()
  }
}

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    if (!terminalDiv.value) return
    if (terminalDiv.value.clientWidth > 0) {
      if (!isTerminalOpen) {
        initTerminal()
      } else {
        requestAnimationFrame(() => {
          try {
            fitAddon?.fit()
            if (term) {
                window.electronAPI.resizeTerminal({ 
                id: props.sessionId, 
                cols: term.cols, 
                rows: term.rows 
                })
            }
          } catch (e) {}
        })
      }
    }
  })

  if (terminalDiv.value) {
    resizeObserver.observe(terminalDiv.value)
  }
  
  initTerminal()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  term?.dispose()
  isTerminalOpen = false
})

const hideContextMenu = () => {
  contextMenu.value.visible = false
}

const copySelection = async () => {
  if (!term) return
  const selection = term.getSelection()
  if (!selection) return hideContextMenu()
  try {
    await navigator.clipboard.writeText(selection)
  } catch (e) {
    console.warn('Clipboard copy failed', e)
  } finally {
    hideContextMenu()
  }
}

const pasteClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text && currentSession.value) {
      window.electronAPI.sendInput({ id: props.sessionId, data: text })
    }
  } catch (e) {
    console.warn('Clipboard paste failed', e)
  } finally {
    hideContextMenu()
  }
}

const clearTerminal = () => {
  term?.clear()
  hideContextMenu()
}

const selectAll = () => {
  term?.selectAll()
  hideContextMenu()
}

const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  const rect = containerRef.value?.getBoundingClientRect()
  contextMenu.value = {
    visible: true,
    x: rect ? event.clientX - rect.left : event.clientX,
    y: rect ? event.clientY - rect.top : event.clientY
  }
}

const handleGlobalClick = () => hideContextMenu()
document.addEventListener('click', handleGlobalClick)

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick)
})

defineExpose({
  write: (data: string | Uint8Array) => {
    if (!term) return 
    term.write(data)
  },
  fit: () => {
      try {
          fitAddon?.fit()
      } catch(e) {}
  }
})
</script>

<template>
  <div class="relative w-full h-full bg-black/40 flex" @contextmenu="handleContextMenu" ref="containerRef">
    <div class="flex-1 h-full overflow-hidden pl-2 pt-1 relative">
      <div class="w-full h-full" ref="terminalDiv"></div>
      <button
        class="absolute top-1/2 -translate-y-1/2 right-2 z-30 bg-black/70 border border-neon-blue/50 text-neon-blue rounded-full p-2 hover:bg-neon-blue hover:text-black transition-colors shadow-[0_0_10px_rgba(0,243,255,0.4)]"
        @click.stop="toggleAssistant"
        :title="showAssistant ? '收起助手' : '展开助手'"
      >
        <PanelRightClose v-if="showAssistant" size="14" />
        <PanelRightOpen v-else size="14" />
      </button>
    </div>
    <TerminalAssistant v-if="showAssistant" class="shrink-0" :session-id="props.sessionId" />

    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <ConnectionOverlay 
        v-if="currentSession && currentSession.type === 'ssh' && currentSession.status !== 'connected'"
        :session="currentSession"
        @submit-credentials="handleCredentialsSubmit"
        @cancel="handleCancel"
      />
    </Transition>

    <div
      v-if="contextMenu.visible"
      class="absolute z-50 w-44 bg-cyber-dark border border-neon-blue/30 rounded-md shadow-neon-blue-inset text-sm select-none"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <button class="context-item" @click.stop="copySelection">复制选中</button>
      <button class="context-item" @click.stop="pasteClipboard">粘贴</button>
      <button class="context-item" @click.stop="selectAll">全选</button>
      <button class="context-item" @click.stop="clearTerminal">清屏</button>
    </div>
  </div>
</template>

<style scoped>
.context-item {
  @apply w-full text-left px-3 py-2 hover:bg-neon-blue/10 hover:text-neon-blue transition-colors;
}
</style>
