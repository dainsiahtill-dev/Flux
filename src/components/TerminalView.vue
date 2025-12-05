<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount, computed, watch } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useSessionStore } from '../stores/sessionStore'
import ConnectionOverlay from './ConnectionOverlay.vue'
import { useLocale } from '../composables/useLocale'

const props = defineProps<{ sessionId: string }>()
const sessionStore = useSessionStore()
const { t } = useLocale()
const overlayCopy = computed(() => t.value.connectionOverlay)

const currentSession = computed(() => sessionStore.sessions.find(s => s.id === props.sessionId))

const terminalDiv = ref<HTMLElement | null>(null)
let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let isTerminalOpen = false

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
  <div class="relative w-full h-full bg-black/40">
    <div class="w-full h-full overflow-hidden pl-2 pt-1" ref="terminalDiv"></div>

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
  </div>
</template>