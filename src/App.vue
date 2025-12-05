<script setup lang="ts">
import { onMounted, ref } from "vue"
import TitleBar from "./components/layout/TitleBar.vue"
import Sidebar from "./components/layout/Sidebar.vue"
import TopTabBar from "./components/layout/TopTabBar.vue"
import HostsManager from "./views/HostsManager.vue"
import KeychainManager from "./views/KeychainManager.vue"
import TerminalView from "./components/TerminalView.vue"
import SftpView from "./components/SftpView.vue"
import CommandPalette from "./components/CommandPalette.vue"
import SettingsPanel from "./components/SettingsPanel.vue"
import TunnelManager from "./views/TunnelManager.vue"
import { useUiStore } from "./stores/uiStore"
import { useSessionStore } from "./stores/sessionStore"
import { useTunnelStore } from "./stores/tunnelStore"
import { useLocale } from "./composables/useLocale"

const uiStore = useUiStore()
const sessionStore = useSessionStore()
const tunnelStore = useTunnelStore()
const { t } = useLocale()

// 用于存储所有 TerminalView 组件的引用 (Key: sessionId, Value: Component Instance)
const terminalRefs = ref<Record<string, any>>({})

onMounted(async () => {
  // ✅ 并行加载主机列表和密钥列表
  await Promise.all([
    sessionStore.loadHosts(),
    sessionStore.loadKeys(),
    tunnelStore.loadTunnels()
  ])

  // [核心逻辑] 全局监听后端发来的终端数据
  if (window.electronAPI) {
    window.electronAPI.onTerminalData(({ id, data }: { id: string, data: string }) => {
      // 1. 根据 ID 找到对应的组件实例
      const terminalInstance = terminalRefs.value[id]

      // 2. 如果组件存在，写入数据
      if (terminalInstance) {
        terminalInstance.write(data)
      } else {
        // 如果是刚刚创建的会话，组件可能还没挂载完成，这里可以做一个简单的重试或者忽略
        // console.warn(`Terminal instance not found for session ID: ${id}`)
      }
    })

    window.electronAPI.onSessionEnded(({ id }: { id: string }) => {
      console.log(`Session ended: ${id}`)
      // 调用 Store 的关闭逻辑，这将移除 UI 标签并自动切换焦点
      sessionStore.closeSession(id)
    })

    window.electronAPI.onSessionStatus(({ id, status, log }: any) => {
      // 映射后端 status 到前端 Store 的 status
      sessionStore.updateSessionStatus(id, status as any, log)
    })
  }
})
</script>

<template>
  <div class="flex flex-col h-screen w-screen bg-cyber-black font-sans overflow-hidden border border-cyber-dark text-white">
    
    <!-- 全局命令面板 -->
    <CommandPalette />
    <SettingsPanel />

    <!-- 顶部标题栏 -->
    <TitleBar class="shrink-0" />

    <div class="flex-1 flex min-h-0 overflow-hidden">

      <!-- 左侧导航栏 -->
      <Sidebar class="shrink-0 z-20" />

      <!-- 主内容区域 -->
      <div class="flex-1 flex flex-col min-w-0 relative z-0 bg-cyber-black">

        <!-- 顶部标签页 -->
        <TopTabBar class="shrink-0" />

        <div class="flex-1 relative overflow-hidden p-3 flex flex-col">

          <!-- 视图区域：管理界面 (非终端模式) -->
          <div v-if="uiStore.currentView !== 'terminal'"
            class="flex-1 rounded-lg bg-cyber-dark border border-neon-blue/20 shadow-neon-blue-inset overflow-hidden relative">
            
            <!-- 主机管理 -->
            <HostsManager v-if="uiStore.currentView === 'hosts'" />
            
            <!-- ✅ 密钥管理 -->
            <KeychainManager v-else-if="uiStore.currentView === 'keychain'" />
            
            <!-- 端口转发 / 隧道 -->
            <TunnelManager v-else-if="uiStore.currentView === 'port-forwarding'" />

            <!-- 默认/错误状态 -->
            <div v-else class="h-full flex items-center justify-center text-cyber-text/50 font-mono">
              {{ t.appShell.moduleFallback }}
            </div>

            <!-- 装饰性扫描线背景 -->
            <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,243,255,0.05)_50%)] bg-[length:100%_4px] opacity-50"></div>
          </div>

          <!-- 视图区域：终端模式 -->
          <div v-show="uiStore.currentView === 'terminal'"
            class="flex-1 rounded-lg border border-neon-blue/50 shadow-neon-blue-inset bg-black flex flex-col overflow-hidden relative p-1">
            
            <!-- 空状态 -->
            <div v-if="sessionStore.sessions.length === 0"
              class="flex-1 flex flex-col items-center justify-center text-cyber-text opacity-50 font-mono tracking-widest">
              <div class="mb-4 animate-pulse text-neon-blue text-lg">{{ t.terminal.emptyTitle }}</div>
              <div class="text-xs">{{ t.terminal.emptySubtitle }}</div>
            </div>

            <!-- 会话实例列表：终端 & SFTP -->
            <template v-for="session in sessionStore.sessions" :key="session.id">
              <TerminalView 
                v-if="session.type !== 'sftp'"
                :session-id="session.id"
                :ref="(el) => { if (el) terminalRefs[session.id] = el }"
                v-show="sessionStore.activeSessionId === session.id" 
                class="flex-1" 
              />
              <SftpView
                v-else
                :session-id="session.id"
                v-show="sessionStore.activeSessionId === session.id"
                class="flex-1"
              />
            </template>
            
            <!-- CRT 屏幕效果遮罩 -->
            <div class="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10 rounded-lg mix-blend-multiply"></div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
