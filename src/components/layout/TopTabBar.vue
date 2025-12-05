<script setup lang="ts">
import { useSessionStore } from '../../stores/sessionStore'
import { useUiStore } from '../../stores/uiStore'
import { X, Plus, SquareTerminal, FolderGit2 } from 'lucide-vue-next'
import { useLocale } from '../../composables/useLocale'

const sessionStore = useSessionStore()
const uiStore = useUiStore()
const { t } = useLocale()

const handleTabClick = (id: string) => sessionStore.setActive(id)
const closeTab = (e: Event, id: string) => { e.stopPropagation(); sessionStore.closeSession(id) }
const addNew = () => uiStore.openCreateHost()
</script>

<template>
  <div class="h-12 flex items-end border-b border-neon-blue/20 bg-cyber-dark/90 backdrop-blur-xl select-none relative shadow-[0_5px_15px_rgba(0,0,0,0.2)] z-10 overflow-hidden group/bar">
    
    <div class="pointer-events-none absolute inset-0 w-full h-full bg-circuit-pattern bg-[length:40px_40px] opacity-[0.03] mix-blend-overlay"></div>
    
    <div class="pointer-events-none absolute inset-0 overflow-hidden opacity-10 mix-blend-color-dodge">
      <div class="animate-light-flow absolute inset-0 h-full w-[200%] bg-[linear-gradient(90deg,transparent_0%,rgba(0,243,255,0.05)_25%,rgba(255,0,255,0.02)_50%,rgba(0,243,255,0.05)_75%,transparent_100%)] bg-[length:50%_100%]"></div>
    </div>

    <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-neon-blue/10 to-transparent opacity-20"></div>
    
    <div class="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-white/5"></div>


    <div class="relative z-20 h-full flex items-end px-2 shrink-0 bg-cyber-dark/60 backdrop-blur-md border-r border-neon-blue/10">
      <div 
        @click="addNew" 
        class="h-9 w-9 mb-1.5 flex items-center justify-center rounded hover:bg-neon-blue/10 cursor-pointer text-cyber-text hover:text-neon-blue transition border border-transparent hover:border-neon-blue/30 group relative"
      >
        <Plus size="20" class="transition-transform group-hover:rotate-90 group-hover:drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]" />
        <span class="absolute top-full mt-2 left-0 bg-cyber-black border border-neon-blue text-[10px] text-neon-blue px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-neon-blue-inset">
          {{ t.topTabs.newHostTooltip }}
        </span>
      </div>
    </div>

    <div class="relative z-20 flex-1 flex items-end overflow-x-auto no-scrollbar px-2 space-x-1 h-full">
      <div 
        v-for="session in sessionStore.sessions" 
        :key="session.id"
        @click="handleTabClick(session.id)"
        class="group relative flex items-center h-10 px-5 pr-3 min-w-[160px] max-w-[240px] cursor-pointer transition-all duration-300 ease-out shrink-0"
        :class="[
          sessionStore.activeSessionId === session.id && uiStore.currentView === 'terminal'
            ? (session.type === 'sftp' ? 'z-10 bg-cyber-light text-neon-pink' : 'z-10 bg-cyber-light text-neon-blue') 
            : 'text-cyber-text hover:text-cyber-text-bright hover:bg-cyber-light/30 opacity-60 hover:opacity-100'
        ]"
        style="clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%);" 
      >
        <component 
          :is="session.type === 'sftp' ? FolderGit2 : SquareTerminal"
          size="16" 
          class="mr-3 transition-all duration-300" 
          :class="{
            'stroke-neon-blue drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]': session.type !== 'sftp' && sessionStore.activeSessionId === session.id && uiStore.currentView === 'terminal',
            'stroke-neon-pink drop-shadow-[0_0_5px_rgba(255,0,255,0.8)]': session.type === 'sftp' && sessionStore.activeSessionId === session.id && uiStore.currentView === 'terminal',
            'opacity-70': sessionStore.activeSessionId !== session.id
          }" 
        />
        <div class="flex items-center space-x-2 flex-1 overflow-hidden">
          <span class="text-xs font-bold truncate flex-1 tracking-wider font-mono">
            {{ session.name }}
          </span>
          <span 
            v-if="session.type === 'sftp'" 
            class="text-[10px] px-2 py-0.5 rounded-full border border-neon-pink/40 text-neon-pink bg-neon-pink/10 font-bold tracking-wider"
          >
            {{ t.topTabs.sftpBadge }}
          </span>
        </div>
        <div 
          @click="(e) => closeTab(e, session.id)"
          class="ml-2 p-0.5 rounded hover:bg-neon-pink/20 hover:text-neon-pink opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <X size="14" />
        </div>
        <div 
          v-if="sessionStore.activeSessionId === session.id && uiStore.currentView === 'terminal'" 
          class="absolute bottom-0 left-0 right-0 h-[2px]"
          :class="session.type === 'sftp' ? 'bg-neon-pink shadow-[0_-1px_8px_#ff00ff]' : 'bg-neon-blue shadow-[0_-1px_8px_#00f3ff]'"
        ></div>
      </div>
    </div>

  </div>
</template>
