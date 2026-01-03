<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { ArrowRight, Copy, Save, Upload } from 'lucide-vue-next'
import { useLocale } from '../composables/useLocale'

const uiStore = useUiStore()
const sessionStore = useSessionStore()
const { t } = useLocale()
const keyText = computed(() => t.value.keyDetail)

const currentKey = computed(() => 
  sessionStore.savedKeys.find(k => k.id === uiStore.selectedKeyId)
)

const formData = ref({
  alias: '',
  path: '',
  content: ''
})

const publicKey = ref('')
const isSaving = ref(false)
const originalContent = ref('')

const selectedHostId = ref<string>('')
const availableHosts = computed(() => sessionStore.savedHosts)

const loadKeyContent = async (path: string) => {
  formData.value.content = keyText.value.states.loading
  try {
    if (window.electronAPI?.readFile) {
      const content = await window.electronAPI.readFile(path)
      formData.value.content = content && !content.startsWith('Error') ? content : (content || keyText.value.states.readError)
      originalContent.value = formData.value.content

      const pub = await window.electronAPI.readFile(path + '.pub')
      publicKey.value = pub && !pub.startsWith('Error') ? pub.trim() : ''
    } else {
      formData.value.content = keyText.value.states.apiError
    }
  } catch (e: any) {
    formData.value.content = `${keyText.value.states.readError} (${e.message})`
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
    await sessionStore.saveKey({ id: currentKey.value.id, alias: formData.value.alias })
    if (formData.value.content !== originalContent.value && window.electronAPI?.writeFile) {
      const ok = await window.electronAPI.writeFile(formData.value.path, formData.value.content, 0o600)
      if (!ok) alert(keyText.value.states.writeFailed)
      else originalContent.value = formData.value.content
    }
    close()
  } catch (e) {
    console.error('Save failed', e)
  } finally {
    isSaving.value = false
  }
}

const copyToClipboard = () => {
  if (formData.value.content) navigator.clipboard.writeText(formData.value.content)
}

const installToHost = async () => {
  if (!selectedHostId.value || !publicKey.value) return
  const host = sessionStore.savedHosts.find(h => h.id === selectedHostId.value)
  if (!host) return
  const res = await window.electronAPI.installPublicKeyToHost({ hostConfig: host, publicKey: publicKey.value })
  if (res?.success) alert('公钥已安装到远程服务器 authorized_keys')
  else alert('安装失败: ' + (res?.error || 'unknown'))
}
</script>

<template>
  <div class="h-full flex flex-col bg-cyber-black border-l border-neon-blue/30 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden">
    
    <!-- 顶部标题 -->
    <div class="flex items-center justify-between p-6 border-b border-neon-blue/10 shrink-0">
      <div class="flex flex-col">
        <h2 class="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">
          {{ keyText.title }}
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
        <label class="absolute -top-2 left-2 px-1 bg-cyber-black text-[10px] text-cyber-text/70 uppercase">{{ keyText.labels.alias }}</label>
        <div class="border border-cyber-text/30 rounded p-1 focus-within:border-neon-blue transition-colors">
           <input v-model="formData.alias" type="text" class="w-full bg-transparent text-sm text-white px-2 py-1 outline-none font-medium" />
        </div>
      </div>

      <!-- Private Key (Editable) -->
      <div class="relative">
        <label class="absolute -top-2 left-2 px-1 bg-cyber-black text-[10px] text-purple-400 uppercase z-10 flex items-center gap-1 font-bold tracking-wider">
          {{ keyText.labels.privateKey }}
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
              <Copy size="10" /> {{ keyText.buttons.copy }}
            </button>
          </div>
        </div>
        <div class="text-[9px] text-cyber-text/40 mt-1 flex justify-between">
           <span>{{ keyText.info.path }}: {{ formData.path }}</span>
           <span v-if="formData.content !== originalContent" class="text-neon-pink animate-pulse">{{ keyText.info.unsaved }}</span>
        </div>
      </div>

      <!-- Public Key -->
      <div class="group relative">
        <label class="absolute -top-2 left-2 px-1 bg-cyber-black text-[10px] text-cyber-text/50 uppercase">{{ keyText.labels.publicKey }}</label>
        <div class="border border-cyber-text/20 rounded p-0">
           <textarea readonly class="w-full h-20 bg-transparent text-[10px] text-cyber-text p-3 outline-none font-mono resize-none" :value="publicKey" placeholder="ssh-ed25519 AAAA..."></textarea>
        </div>
      </div>

      <!-- Install to host -->
      <div class="p-3 border border-neon-blue/20 rounded bg-cyber-light/10 flex items-center gap-2">
        <select v-model="selectedHostId" class="bg-cyber-black border border-cyber-text/30 rounded text-xs text-cyber-text-bright p-2 min-w-[180px]">
          <option value="" disabled>选择目标主机</option>
          <option v-for="h in availableHosts" :key="h.id" :value="h.id">{{ h.alias || (h.user + '@' + h.host) }}</option>
        </select>
        <button @click="installToHost" class="px-3 py-2 text-xs bg-neon-blue/10 text-neon-blue border border-neon-blue/50 rounded hover:bg-neon-blue hover:text-black transition-colors flex items-center gap-1">
          <Upload size="12" /> 安装到服务器
        </button>
      </div>

    </div>

    <!-- 底部按钮 -->
    <div class="p-6 border-t border-neon-blue/10 bg-cyber-black/50 space-y-3 shrink-0">
      <div class="flex justify-between items-center text-cyber-text/50 text-[10px] mb-1">
        <span>{{ keyText.labels.actions }}</span>
      </div>
      
      <button 
        @click="save"
        :disabled="isSaving"
        class="w-full py-3 bg-purple-600 text-white font-bold uppercase tracking-widest rounded hover:bg-purple-500 hover:shadow-[0_0_15px_#a855f7] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save v-if="!isSaving" size="16" />
        <div v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>{{ isSaving ? keyText.buttons.saving : keyText.buttons.save }}</span>
      </button>
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.3); border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.6); }
</style>