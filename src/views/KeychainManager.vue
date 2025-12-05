<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSessionStore } from '../stores/sessionStore'
import { useUiStore } from '../stores/uiStore'
import { Key, Trash2, Plus, FolderOpen } from 'lucide-vue-next'
import KeyDetailSidebar from '../components/KeyDetailSidebar.vue' // ✅ 引入
import { useLocale } from '../composables/useLocale'

const sessionStore = useSessionStore()
const uiStore = useUiStore()
const { t } = useLocale()
const keychainText = computed(() => t.value.keychainManager)
const searchQuery = ref('')
const isAdding = ref(false)

const form = ref({ alias: '', path: '' })

const filteredKeys = computed(() => 
  sessionStore.savedKeys.filter(k => 
    k.alias.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)

const startAdd = () => {
  form.value = { alias: '', path: '' }
  isAdding.value = true
}

const cancelAdd = () => {
  isAdding.value = false
}

const browseFile = async () => {
  if (window.electronAPI) {
    const path = await window.electronAPI.openFileDialog()
    if (path) {
      form.value.path = path
      if (!form.value.alias) {
        const fileName = path.split(/[\\/]/).pop()
        form.value.alias = fileName || keychainText.value.placeholders.autoAlias
      }
    }
  }
}

const saveNewKey = async () => {
  if (!form.value.path) return
  await sessionStore.saveKey(form.value)
  isAdding.value = false
}

const deleteKey = async (id: string) => {
  if(confirm(keychainText.value.confirmDelete)) {
    await sessionStore.deleteKey(id)
    if (uiStore.selectedKeyId === id) {
      uiStore.closeKeyDetail()
    }
  }
}

// ✅ 打开详情
const openDetail = (key: any) => {
  uiStore.openKeyDetail(key.id)
}
</script>

<template>
  <div class="relative flex h-full w-full bg-transparent font-sans overflow-hidden">
    <div class="flex-1 flex flex-col min-w-0 h-full transition-opacity duration-300"
         :class="uiStore.rightSidebarOpen ? 'opacity-30 pointer-events-none blur-[1px]' : 'opacity-100'">
      
      <div class="px-6 pt-6 pb-2 shrink-0 flex justify-between items-center">
        <h1 class="text-xl font-bold text-neon-blue tracking-[0.2em] uppercase drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">
          {{ t.keychainManager.title }}
        </h1>
        <button 
          v-if="!isAdding"
          @click="startAdd"
          class="flex items-center space-x-2 px-3 py-1.5 bg-neon-blue/10 text-neon-blue border border-neon-blue/50 rounded hover:bg-neon-blue hover:text-black transition-all text-xs font-bold"
        >
          <Plus size="14" />
          <span>{{ t.keychainManager.addButton }}</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
        
        <!-- 添加表单 -->
        <div v-if="isAdding" class="p-4 rounded border border-neon-blue/30 bg-cyber-light/10 animate-in fade-in slide-in-from-top-4">
          <div class="text-xs font-bold text-neon-blue mb-4 uppercase">{{ t.keychainManager.formTitle }}</div>
          <div class="space-y-4">
            <div>
               <label class="block text-[10px] text-cyber-text/50 uppercase mb-1">{{ t.keychainManager.labels.alias }}</label>
               <input v-model="form.alias" type="text" class="cyber-input" :placeholder="t.keychainManager.placeholders.alias" />
            </div>
            <div>
               <label class="block text-[10px] text-cyber-text/50 uppercase mb-1">{{ t.keychainManager.labels.path }}</label>
               <div class="flex space-x-2">
                 <input v-model="form.path" type="text" class="cyber-input font-mono text-xs text-cyber-text/70" :placeholder="t.keychainManager.placeholders.path" />
                 <button @click="browseFile" class="text-neon-blue hover:text-white transition"><FolderOpen size="18"/></button>
               </div>
            </div>
            <div class="flex space-x-3 pt-2">
               <button @click="saveNewKey" class="flex-1 py-2 bg-neon-blue text-black font-bold text-xs rounded hover:shadow-[0_0_10px_#00f3ff] transition">{{ t.keychainManager.buttons.save }}</button>
               <button @click="cancelAdd" class="px-4 py-2 border border-cyber-text/20 text-cyber-text text-xs rounded hover:bg-white/5">{{ t.keychainManager.buttons.cancel }}</button>
            </div>
          </div>
        </div>

        <!-- 列表 -->
        <div class="space-y-2">
           <div 
             v-for="key in filteredKeys" 
             :key="key.id"
             @click="openDetail(key)" 
             class="group flex items-center justify-between p-3 rounded bg-cyber-light/20 border border-transparent hover:border-neon-blue/30 hover:bg-cyber-light/40 transition-all cursor-pointer"
             :class="uiStore.selectedKeyId === key.id ? 'border-neon-blue bg-neon-blue/10' : ''"
           >
             <div class="flex items-center space-x-4">
                <div class="w-8 h-8 rounded bg-neon-blue/5 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                   <Key size="16" />
                </div>
                <div>
                   <div class="text-sm font-medium text-cyber-text-bright group-hover:text-neon-blue transition-colors">{{ key.alias }}</div>
                   <div class="text-[10px] text-cyber-text/40 font-mono truncate max-w-[300px]">{{ key.path }}</div>
                </div>
             </div>
             
             <button 
               @click.stop="deleteKey(key.id)"
               class="opacity-0 group-hover:opacity-100 p-2 text-cyber-text/40 hover:text-red-500 transition-all"
               :title="t.keychainManager.tooltips.remove"
             >
               <Trash2 size="16" />
             </button>
           </div>

           <div v-if="filteredKeys.length === 0 && !isAdding" class="text-center py-10 text-cyber-text/30 text-xs font-mono">
              {{ t.keychainManager.emptyState }}
           </div>
        </div>

      </div>
    </div>

    <!-- ✅ 右侧详情栏 -->
    <Transition 
      enter-active-class="transition transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition transform duration-300 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div v-if="uiStore.rightSidebarOpen && uiStore.selectedKeyId" class="absolute top-0 right-0 h-full w-[400px] z-50">
         <KeyDetailSidebar />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cyber-input {
  @apply w-full bg-transparent border-b border-cyber-text/30 py-1 text-sm text-cyber-text-bright focus:outline-none focus:border-neon-blue focus:shadow-[0_1px_0_#00f3ff] transition-all placeholder-cyber-text/20;
}
</style>