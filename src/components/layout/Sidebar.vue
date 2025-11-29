<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '../../stores/uiStore'
import { Server, Key, Network, ChevronLeft, Hexagon } from 'lucide-vue-next'

const uiStore = useUiStore()
// ... (保持之前的 menuItems 和 selectItem 逻辑不变)
const menuItems = [
  { id: 'hosts', label: 'Hosts List', icon: Server },
  { id: 'keychain', label: 'Security Keys', icon: Key },
  { id: 'port-forwarding', label: 'Tunnels & Ports', icon: Network },
]
const isCollapsed = computed(() => uiStore.sidebarCollapsed)
const selectItem = (id: any) => uiStore.showManager(id)
</script>

<template>
  <div 
    class="flex flex-col glass-panel border-r border-neon-blue/20 transition-all duration-300 ease-in-out h-full z-20 shadow-[5px_0_15px_rgba(0,0,0,0.5)]"
    :class="isCollapsed ? 'w-18' : 'w-64'"
  >
    <div class="h-14 flex items-center px-4 border-b border-neon-blue/10 shrink-0" :class="isCollapsed ? 'justify-center' : 'justify-between'">
      <div v-if="!isCollapsed" class="flex items-center space-x-2 text-neon-blue font-bold tracking-wider animate-pulse-slow">
        <Hexagon size="20" class="fill-neon-blue/20 stroke-neon-blue"/>
        <span>CYBER.TERM</span>
      </div>
      <button @click="uiStore.toggleSidebar" class="text-cyber-text hover:text-neon-blue transition p-1 rounded hover:bg-neon-blue/10">
        <ChevronLeft size="20" class="transition-transform duration-300" :class="isCollapsed ? 'rotate-180' : ''" />
      </button>
    </div>

    <div class="flex-1 py-6 space-y-2 overflow-y-auto no-scrollbar">
      <div 
        v-for="item in menuItems" 
        :key="item.id"
        @click="selectItem(item.id)"
        class="relative flex items-center px-4 py-3 cursor-pointer transition-all group"
        :class="[
          uiStore.currentView === item.id 
            ? 'text-neon-blue bg-neon-blue/5' 
            : 'text-cyber-text hover:text-cyber-text-bright hover:bg-cyber-light/30'
        ]"
      >
        <div class="absolute left-0 top-0 bottom-0 w-1 bg-neon-blue shadow-[0_0_10px_#00f3ff] transition-opacity duration-300"
             :class="uiStore.currentView === item.id ? 'opacity-100' : 'opacity-0'"></div>
             
        <component :is="item.icon" size="20" class="group-hover:stroke-neon-blue transition-colors" />
        <span v-if="!isCollapsed" class="ml-4 font-medium text-sm whitespace-nowrap tracking-wide">{{ item.label }}</span>
      </div>
    </div>

    <div class="p-4 border-t border-neon-blue/10 shrink-0">
       <div class="flex items-center space-x-3 p-2 rounded-lg border border-neon-blue/10 bg-cyber-black/50">
         <div class="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_5px_#0aff00] animate-pulse"></div>
         <span v-if="!isCollapsed" class="text-xs text-cyber-text">System Online</span>
       </div>
    </div>
  </div>
</template>