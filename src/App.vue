<script setup lang="ts">
// 引入新组件
import TitleBar from './components/layout/TitleBar.vue'

import Sidebar from './components/layout/Sidebar.vue'
import TopTabBar from './components/layout/TopTabBar.vue'
import HostsManager from './views/HostsManager.vue'
import TerminalView from './components/TerminalView.vue'
import { useUiStore } from './stores/uiStore'
import { useSessionStore } from './stores/sessionStore'

import { onMounted, ref } from 'vue'

const uiStore = useUiStore()
const sessionStore = useSessionStore()


// 用于存储所有 TerminalView 组件的引用 (Key: sessionId, Value: Component Instance)
const terminalRefs = ref<Record<string, any>>({})

onMounted(async () => {
  await sessionStore.loadHosts()

  // [核心逻辑] 全局监听后端发来的终端数据
  window.electronAPI.onTerminalData(({ id, data }: { id: string, data: string }) => {
    // 1. 根据 ID 找到对应的组件实例
    const terminalInstance = terminalRefs.value[id]

    // 2. 如果组件存在，写入数据
    if (terminalInstance) {
      terminalInstance.write(data)
    } else {
      console.warn(`Terminal instance not found for session ID: ${id}`)
    }

    window.electronAPI.onSessionEnded(({ id }: { id: string }) => {
      console.log(`Session ended: ${id}`)
      // 调用 Store 的关闭逻辑，这将移除 UI 标签并自动切换焦点
      sessionStore.closeSession(id)
    })
  })

  window.electronAPI.onSessionStatus(({ id, status, log }) => {
    // 映射后端 status 到前端 Store 的 status
    sessionStore.updateSessionStatus(id, status as any, log)
  })
})
</script>

<template>
  <div class="flex flex-col h-screen w-screen bg-cyber-black font-sans overflow-hidden border border-cyber-dark">

    <TitleBar class="shrink-0" />

    <div class="flex-1 flex min-h-0 overflow-hidden">

      <Sidebar class="shrink-0 z-20" />

      <div class="flex-1 flex flex-col min-w-0 relative z-0 bg-cyber-black">

        <TopTabBar class="shrink-0" />

        <div class="flex-1 relative overflow-hidden p-3 flex flex-col">

          <div v-if="uiStore.currentView !== 'terminal'"
            class="flex-1 rounded-lg bg-cyber-dark border border-neon-blue/20 shadow-neon-blue-inset overflow-hidden relative">
            <HostsManager v-if="uiStore.currentView === 'hosts'" />
            <div v-else class="h-full flex items-center justify-center text-cyber-text/50 font-mono">
              module_not_loaded...</div>
            <div
              class="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,243,255,0.05)_50%)] bg-[length:100%_4px]">
            </div>
          </div>

          <div v-show="uiStore.currentView === 'terminal'"
            class="flex-1 rounded-lg border border-neon-blue/50 shadow-neon-blue-inset bg-black flex flex-col overflow-hidden relative p-1">
            <div v-if="sessionStore.sessions.length === 0"
              class="flex-1 flex flex-col items-center justify-center text-cyber-text opacity-50 font-mono tracking-widest">
              <div class="mb-4 animate-pulse text-neon-blue">AWAITING INPUT SIGNAL...</div>
              <div class="text-sm">Select a host node to initiate connection sequence.</div>
            </div>

            <TerminalView v-for="session in sessionStore.sessions" :key="session.id" :session-id="session.id"
              :ref="(el) => { if (el) terminalRefs[session.id] = el }"
              v-show="sessionStore.activeSessionId === session.id" class="flex-1" />
            <div class="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10 rounded-lg">
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>