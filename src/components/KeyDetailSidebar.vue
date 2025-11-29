<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { ArrowRight, Copy, ShieldCheck, Save } from 'lucide-vue-next'

const uiStore = useUiStore()
const sessionStore = useSessionStore()

const currentKey = computed(() => 
  sessionStore.savedKeys.find(k => k.id === uiStore.selectedKeyId)
)

const formData = ref({
  alias: '',
  path: '',
  content: ''
})

const isSaving = ref(false)
const originalContent = ref('') // 用于检测内容变更

// 读取文件内容
const loadKeyContent = async (path: string) => {
  formData.value.content = 'Loading key content...'
  
  try {
    if (window.electronAPI && window.electronAPI.readFile) {
      const content = await window.electronAPI.readFile(path)
      if (content && !content.startsWith('Error')) {
        formData.value.content = content
        originalContent.value = content // 记录原始值
      } else {
        formData.value.content = content || 'Error: Unable to read file.'
      }
    } else {
      formData.value.content = 'Error: API not ready.'
    }
  } catch (e: any) {
    formData.value.content = `Error: ${e.message}`
  }
}

watch(() => uiStore.selectedKeyId, async (newId) => {
  if (newId && currentKey.value) {
    formData.value.alias = currentKey.value.alias
    formData.value.path = currentKey.value.path
    try {
      await loadKeyContent(currentKey.value.path)
    } catch (err) { console.error(err) }
  }
}, { immediate: true })

const close = () => uiStore.closeKeyDetail()

const save = async () => {
  if (!currentKey.value) return
  
  isSaving.value = true
  
  try {
    // 1. 保存元数据 (Alias)
    await sessionStore.saveKey({
      id: currentKey.value.id,
      alias: formData.value.alias,
    })

    // 2. 保存文件内容 (如果修改了)
    if (formData.value.content !== originalContent.value && window.electronAPI && window.electronAPI.writeFile) {
       const success = await window.electronAPI.writeFile(formData.value.path, formData.value.content)
       if (success) {
         originalContent.value = formData.value.content // 更新原始值
         console.log('File saved successfully')
       } else {
         alert('Failed to write file to disk.')
       }
    }
    
    close()
  } catch (e) {
    console.error('Save failed', e)
  } finally {
    isSaving.value = false
  }
}

const copyToClipboard = () => {
  if (formData.value.content) {
    navigator.clipboard.writeText(formData.value.content)
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-cyber-black border-l border-neon-blue/30 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden">
    
    <!-- 顶部标题 -->
    <div class="flex items-center justify-between p-6 border-b border-neon-blue/10 shrink-0">
      <div class="flex flex-col">
        <h2 class="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
          Edit Key
        </h2>
      </div>
      <div class="flex items-center gap-4">
        <button @click="close" class="text-cyber-text hover:text-neon-pink transition-colors">
          <ArrowRight size="20" />
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      
      <!-- Label -->
      <div class="group relative">
        <label class="absolute -top-2 left-2 px-1 bg-cyber-black text-[10px] text-cyber-text/70 uppercase">Label *</label>
        <div class="border border-cyber-text/30 rounded p-1 focus-within:border-neon-blue transition-colors">
           <input v-model="formData.alias" type="text" class="w-full bg-transparent text-sm text-white px-2 py-1 outline-none font-medium" />
        </div>
      </div>

      <!-- Private Key (Purple Style & Editable) -->
      <div class="relative">
        <label class="absolute -top-2 left-2 px-1 bg-cyber-black text-[10px] text-purple-400 uppercase z-10 flex items-center gap-1 font-bold tracking-wider">
          Private key *
        </label>
        <div class="border border-purple-500/50 rounded p-0 relative group bg-purple-500/5 hover:bg-purple-500/10 transition-colors focus-within:bg-purple-500/10 focus-within:border-purple-400 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.2)]">
          <textarea 
            v-model="formData.content" 
            spellcheck="false"
            class="w-full h-[300px] bg-transparent text-[11px] text-purple-300 p-4 outline-none font-mono resize-none leading-relaxed custom-scrollbar selection:bg-purple-500/30"
          ></textarea>
          
          <div class="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
             <button 
              @click="copyToClipboard"
              class="bg-cyber-black/80 text-purple-300 text-[10px] px-2 py-1 rounded border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-colors uppercase font-bold tracking-wider flex items-center gap-1"
            >
              <Copy size="10" /> Copy
            </button>
          </div>
        </div>
        <div class="text-[9px] text-cyber-text/40 mt-1 flex justify-between">
           <span>Path: {{ formData.path }}</span>
           <span v-if="formData.content !== originalContent" class="text-neon-pink animate-pulse">Unsaved Changes</span>
        </div>
      </div>

      <!-- Public Key -->
      <div class="group relative opacity-60 hover:opacity-100 transition-opacity">
        <label class="absolute -top-2 left-2 px-1 bg-cyber-black text-[10px] text-cyber-text/50 uppercase">Public key</label>
        <div class="border border-cyber-text/20 rounded p-0">
           <textarea readonly class="w-full h-20 bg-transparent text-[10px] text-cyber-text p-3 outline-none font-mono resize-none" placeholder="Auto-generated from private key (Coming soon)"></textarea>
        </div>
      </div>

    </div>

    <!-- 底部按钮 -->
    <div class="p-6 border-t border-neon-blue/10 bg-cyber-black/50 space-y-3 shrink-0">
      <div class="flex justify-between items-center text-cyber-text/50 text-[10px] mb-1">
        <span>Actions</span>
      </div>
      
      <button 
        @click="save"
        :disabled="isSaving"
        class="w-full py-3 bg-purple-600 text-white font-bold uppercase tracking-widest rounded hover:bg-purple-500 hover:shadow-[0_0_15px_#a855f7] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save v-if="!isSaving" size="16" />
        <div v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>{{ isSaving ? 'SAVING...' : 'SAVE & UPDATE' }}</span>
      </button>
    </div>

  </div>
</template>

<style scoped>
/* 自定义滚动条样式，匹配紫色主题 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.3); /* purple-500 with opacity */
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.6);
}
</style>