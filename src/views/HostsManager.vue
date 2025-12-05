<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSessionStore } from '../stores/sessionStore'
import { useUiStore } from '../stores/uiStore'
import HostDetailSidebar from '../components/HostDetailSidebar.vue'
import { Search, Monitor, TerminalSquare } from 'lucide-vue-next' // 移除了 Settings2
import { useLocale } from '../composables/useLocale'

const sessionStore = useSessionStore()
const uiStore = useUiStore()
const { t } = useLocale()
const searchQuery = ref('')

// 搜索过滤
const filteredHosts = computed(() => 
  sessionStore.savedHosts.filter(h => 
    h.alias.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    h.host.includes(searchQuery.value)
  )
)

// 动作
const connectSSH = (host: any) => sessionStore.addSession(host)
const connectSftp = (host: any) => sessionStore.addSftpSession(host)
const connectLocal = () => sessionStore.addLocalSession()
const openDetail = (host: any) => uiStore.openHostDetail(host.id)
</script>

<template>
  <div class="relative flex h-full w-full bg-transparent font-sans overflow-hidden">
    
    <div class="flex-1 flex flex-col min-w-0 h-full transition-opacity duration-300"
         :class="uiStore.rightSidebarOpen ? 'opacity-30 pointer-events-none blur-[1px]' : 'opacity-100'">
      
      <div class="px-6 pt-6 pb-2 shrink-0">
        <h1 class="text-xl font-bold text-neon-blue tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">
          {{ t.hostsManager.title }}
        </h1>
      </div>

      <div class="flex-1 overflow-y-auto p-6 no-scrollbar space-y-8">
        
        <section>
          <div class="text-xs font-bold text-cyber-text/50 uppercase tracking-widest mb-3 flex items-center">
            <div class="w-2 h-2 bg-neon-pink rounded-full mr-2 shadow-[0_0_5px_#ff00ff]"></div>
            {{ t.hostsManager.quickAccessLabel }}
          </div>
          
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div 
              @click.stop="connectLocal"
              class="group relative h-24 bg-cyber-light/40 border border-neon-blue/20 rounded-lg p-4 cursor-pointer overflow-hidden transition-all duration-300 hover:bg-cyber-light hover:border-neon-blue hover:shadow-neon-blue-glow hover:-translate-y-1"
            >
              <div class="absolute -right-4 -bottom-4 text-neon-blue/5 group-hover:text-neon-blue/10 transition-colors">
                <TerminalSquare size="80" />
              </div>
              <div class="relative z-10 flex flex-col h-full justify-between">
                <div class="w-8 h-8 rounded bg-neon-blue/10 text-neon-blue flex items-center justify-center border border-neon-blue/30 group-hover:shadow-[0_0_8px_#00f3ff] transition-all">
                   <TerminalSquare size="18" />
                </div>
                <div>
                  <div class="font-bold text-cyber-text-bright group-hover:text-neon-blue transition-colors">{{ t.hostsManager.quickAccessHint }}</div>
                  <div class="text-[10px] text-cyber-text/60">{{ t.hostsManager.quickAccessDescription }}</div>
                </div>
              </div>
              <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-blue to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </div>
          </div>
        </section>

        <section>
            <div class="flex justify-between items-end mb-3">
              <div class="text-xs font-bold text-cyber-text/50 uppercase tracking-widest flex items-center">
                <div class="w-2 h-2 bg-neon-blue rounded-full mr-2 shadow-[0_0_5px_#00f3ff]"></div>
               {{ t.hostsManager.savedTitle }}
              </div>
              <div class="relative group">
                 <input 
                    v-model="searchQuery"
                    type="text" 
                  :placeholder="t.hostsManager.searchPlaceholder" 
                    class="bg-cyber-black/50 border border-neon-blue/20 rounded px-3 py-1 text-xs text-neon-blue w-40 focus:w-60 focus:outline-none focus:border-neon-blue focus:shadow-neon-blue-glow transition-all duration-300 placeholder-cyber-text/30"
                 />
                 <Search class="absolute right-2 top-1.5 text-neon-blue/50 pointer-events-none" size="14" />
              </div>
           </div>

           <div class="space-y-2">
              <div 
                v-for="host in filteredHosts" 
                :key="host.id"
                @click="openDetail(host)"
                class="group flex items-center justify-between p-3 rounded bg-cyber-light/20 border border-transparent hover:border-neon-blue/50 hover:bg-cyber-light/60 cursor-pointer transition-all hover:shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                :class="uiStore.selectedHostId === host.id ? 'border-neon-blue bg-neon-blue/10' : ''"
              >
                <div class="flex items-center">
                   <Monitor size="16" class="text-cyber-text/70 mr-3 group-hover:text-neon-blue transition-colors" />
                   <div>
                      <div class="text-sm font-medium text-cyber-text-bright group-hover:text-neon-blue transition-colors">{{ host.alias }}</div>
                      <div class="text-[10px] text-cyber-text/50 font-mono">{{ host.user }}@{{ host.host }}</div>
                   </div>
                </div>
                
                <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    @click.stop="connectSSH(host)"
                    class="px-3 py-1 text-[10px] bg-neon-blue/10 text-neon-blue border border-neon-blue/50 rounded hover:bg-neon-blue hover:text-black transition-all font-bold tracking-wider"
                  >
                    {{ t.hostsManager.actions.ssh }}
                  </button>
                  <button 
                    @click.stop="connectSftp(host)"
                    class="px-3 py-1 text-[10px] bg-neon-pink/10 text-neon-pink border border-neon-pink/50 rounded hover:bg-neon-pink hover:text-black transition-all font-bold tracking-wider"
                  >
                    {{ t.hostsManager.actions.sftp }}
                  </button>
                </div>
              </div>
           </div>
        </section>

      </div>
    </div>

    <Transition 
      enter-active-class="transition transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition transform duration-300 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div v-if="uiStore.rightSidebarOpen" class="absolute top-0 right-0 h-full w-[400px] z-50">
         <HostDetailSidebar />
      </div>
    </Transition>

  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
</style>
