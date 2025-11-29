<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMagicKeys, whenever } from '@vueuse/core'
import { useSessionStore } from '../stores/sessionStore'

const store = useSessionStore()
const isOpen = ref(false)
const query = ref('')

// Ctrl+P 唤起
const { Ctrl_P } = useMagicKeys()
whenever(Ctrl_P, () => {
  isOpen.value = !isOpen.value
})

const filteredHosts = computed(() => {
  return store.savedHosts.filter(h => 
    h.alias.toLowerCase().includes(query.value.toLowerCase()) || 
    h.host.includes(query.value)
  )
})

const connect = (host: any) => {
  store.addSession({ ...host, password: 'password', port: 22 })
  isOpen.value = false
  query.value = ''
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform scale-95 opacity-0"
    enter-to-class="transform scale-100 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="transform scale-100 opacity-100"
    leave-to-class="transform scale-95 opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div class="absolute inset-0 bg-cyber-black/80 backdrop-blur-sm" @click="isOpen = false"></div>

      <div class="relative w-[600px] bg-cyber-black border-2 border-cyber-cyan shadow-neon-cyan overflow-hidden clip-corner">
        
        <div class="h-6 bg-cyber-cyan/10 flex items-center justify-between px-2 border-b border-cyber-cyan/30">
            <span class="text-[10px] text-cyber-cyan font-mono tracking-widest">SYSTEM_OVERRIDE // CONNECT_PROTOCOL</span>
            <div class="flex space-x-1">
                <div class="w-2 h-2 bg-cyber-pink rounded-full"></div>
                <div class="w-2 h-2 bg-cyber-cyan rounded-full"></div>
            </div>
        </div>

        <div class="relative">
             <span class="absolute left-4 top-4 text-cyber-pink font-bold animate-pulse">></span>
             <input 
                v-model="query"
                class="w-full bg-transparent border-none p-4 pl-10 text-xl text-cyber-cyan placeholder-cyber-cyan/30 focus:outline-none font-mono tracking-wide"
                placeholder="Target Identification..." 
                autoFocus
            />
        </div>

        <div class="max-h-[300px] overflow-y-auto border-t border-cyber-cyan/20">
          <div 
            v-for="host in filteredHosts" 
            :key="host.id"
            @click="connect(host)"
            class="group p-3 cursor-pointer flex justify-between items-center transition-all hover:bg-cyber-cyan/10 border-l-2 border-transparent hover:border-cyber-pink"
          >
            <div class="flex flex-col">
                <span class="text-cyber-cyan font-bold group-hover:text-white group-hover:shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all">{{ host.alias }}</span>
                <span class="text-xs text-cyber-cyan/50 font-mono">{{ host.user }}@{{ host.host }}</span>
            </div>
            <span class="text-[10px] text-cyber-pink border border-cyber-pink/30 px-1 rounded opacity-0 group-hover:opacity-100">CONNECTING...</span>
          </div>
        </div>
        
        <div class="h-1 w-full bg-gradient-to-r from-cyber-pink via-cyber-cyan to-cyber-green"></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 切角效果 */
.clip-corner {
    clip-path: polygon(
        0 0, 
        100% 0, 
        100% calc(100% - 20px), 
        calc(100% - 20px) 100%, 
        0 100%
    );
}
</style>