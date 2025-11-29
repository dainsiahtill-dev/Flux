<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { X, Save, Power, Trash2, KeyRound, FileKey, Eye, EyeOff, Terminal } from 'lucide-vue-next'

// ... 前面的 imports 和 logic 保持不变 ...
const uiStore = useUiStore()
const sessionStore = useSessionStore()

const isEditMode = computed(() => !!uiStore.selectedHostId)
const title = computed(() => isEditMode.value ? 'Host Details' : 'New Host Node')
const subTitle = computed(() => isEditMode.value ? 'Configuration Protocol' : 'Initialization Sequence')

const formData = ref<any>({
  alias: '',
  host: '',
  user: '',
  port: 22,
  group: 'Default',
  authType: 'password',
  password: '',
  privateKeyPath: '',
  useNativeSSH: false // ✅ 新增
})

const originalData = ref<string>('')
const showPassword = ref(false)

// ... hasChanges, watch, close 等逻辑保持不变 ...
const hasChanges = computed(() => {
  if (!isEditMode.value) return !!formData.value.host
  return JSON.stringify(formData.value) !== originalData.value
})

watch(
  [() => uiStore.rightSidebarOpen, () => uiStore.selectedHostId],
  ([isOpen, hostId]) => {
    if (isOpen) {
      showPassword.value = false
      if (hostId) {
        const existHost = sessionStore.savedHosts.find(h => h.id === hostId)
        if (existHost) {
          const mergedData = { 
            authType: 'password', 
            password: '', 
            privateKeyPath: '',
            useNativeSSH: false,
            ...existHost 
          }
          formData.value = JSON.parse(JSON.stringify(mergedData))
          originalData.value = JSON.stringify(mergedData)
        }
      } else {
        const emptyData = {
          alias: '',
          host: '',
          user: '',
          port: 22,
          group: 'Default',
          authType: 'password',
          password: '',
          privateKeyPath: '',
          useNativeSSH: false
        }
        formData.value = { ...emptyData }
        originalData.value = JSON.stringify(emptyData)
      }
    }
  },
  { immediate: true }
)

const close = () => uiStore.closeHostDetail()

const handleMainAction = () => {
  if (!formData.value.host) return 
  if (!isEditMode.value) {
    sessionStore.saveHost(formData.value)
    sessionStore.addSession(formData.value)
  } else {
    sessionStore.addSession(formData.value)
  }
  close()
}

const save = () => {
  sessionStore.saveHost(formData.value)
  originalData.value = JSON.stringify(formData.value)
  if (!isEditMode.value) close()
}

const remove = () => {
  if (isEditMode.value && formData.value.id) {
    sessionStore.deleteHost(formData.value.id)
    close()
  }
}
</script>

<template>
  <div class="h-full flex flex-col bg-cyber-black border-l border-neon-blue/30 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden">
    
    <div class="absolute top-0 right-0 p-4 opacity-20 pointer-events-none"></div>

    <div class="flex items-center justify-between p-6 border-b border-neon-blue/10 shrink-0">
      <div class="flex flex-col">
        <span class="text-[10px] text-neon-blue font-mono uppercase tracking-widest">{{ subTitle }}</span>
        <h2 class="text-xl font-bold text-white tracking-wide uppercase">{{ title }}</h2>
      </div>
      <button @click="close" class="text-cyber-text hover:text-neon-pink transition-colors">
        <X size="24" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- ... Alias, Group, Host IP, User, Port 等输入框保持不变 ... -->
      <div class="grid grid-cols-2 gap-4">
        <div class="group">
          <label class="block text-[10px] text-cyber-text/50 uppercase mb-1">Alias / Name</label>
          <input v-model="formData.alias" type="text" class="cyber-input" placeholder="e.g. Production DB" />
        </div>
        <div>
          <label class="block text-[10px] text-cyber-text/50 uppercase mb-1">Group Tag</label>
          <input v-model="formData.group" type="text" class="cyber-input" placeholder="Default" />
        </div>
      </div>

      <div class="p-4 rounded border border-neon-blue/10 bg-cyber-light/20 relative">
        <div class="absolute top-0 left-0 px-2 py-0.5 bg-neon-blue/20 text-neon-blue text-[10px]">SSH V2</div>
        <div class="mt-4 space-y-4">
          <div>
            <label class="block text-[10px] text-cyber-text/50 uppercase mb-1">Hostname / IP</label>
            <input v-model="formData.host" type="text" class="cyber-input font-mono text-neon-blue" placeholder="192.168.x.x" />
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div class="col-span-2">
               <label class="block text-[10px] text-cyber-text/50 uppercase mb-1">Username</label>
               <input v-model="formData.user" type="text" class="cyber-input" placeholder="root" />
            </div>
            <div>
               <label class="block text-[10px] text-cyber-text/50 uppercase mb-1">Port</label>
               <input v-model="formData.port" type="number" class="cyber-input font-mono" />
            </div>
          </div>
        </div>
      </div>

      <!-- 认证方式 -->
      <div>
        <label class="block text-[10px] text-cyber-text/50 uppercase mb-2">Authentication Method</label>
        <div class="flex space-x-2 mb-4">
          <button 
            @click="formData.authType = 'password'"
            class="flex-1 py-2 text-xs border rounded transition-all flex items-center justify-center space-x-2"
            :class="formData.authType === 'password' ? 'border-neon-blue bg-neon-blue/10 text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)]' : 'border-cyber-text/20 text-cyber-text/50 hover:text-cyber-text'"
          >
            <KeyRound size="14" />
            <span>Password</span>
          </button>
          <button 
            @click="formData.authType = 'privateKey'"
            class="flex-1 py-2 text-xs border rounded transition-all flex items-center justify-center space-x-2"
            :class="formData.authType === 'privateKey' ? 'border-neon-blue bg-neon-blue/10 text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.2)]' : 'border-cyber-text/20 text-cyber-text/50 hover:text-cyber-text'"
          >
            <FileKey size="14" />
            <span>Private Key</span>
          </button>
        </div>

        <div v-if="formData.authType === 'privateKey'" class="animate-in fade-in slide-in-from-top-2 duration-300 mb-4">
           <label class="block text-[10px] text-cyber-text/50 uppercase mb-1">Private Key Path</label>
           <input v-model="formData.privateKeyPath" type="text" class="cyber-input font-mono text-xs" placeholder="e.g. C:/Users/name/.ssh/id_rsa" />
        </div>

        <div class="animate-in fade-in slide-in-from-top-2 duration-300">
           <label class="block text-[10px] text-cyber-text/50 uppercase mb-1">
             {{ formData.authType === 'privateKey' ? 'Passphrase (Optional)' : 'Password (Optional)' }}
           </label>
           <div class="relative">
             <input 
               v-model="formData.password" 
               :type="showPassword ? 'text' : 'password'"
               class="cyber-input text-neon-pink focus:border-neon-pink focus:shadow-[0_1px_0_#ff00ff] pr-8" 
               placeholder="Leave empty to ask on connect" 
             />
             <button @click="showPassword = !showPassword" class="absolute right-0 top-1 text-cyber-text/40 hover:text-neon-pink transition-colors">
               <EyeOff v-if="showPassword" size="14" />
               <Eye v-else size="14" />
             </button>
           </div>
        </div>
      </div>

      <!-- ✅ 新增：Native SSH 开关 -->
      <div class="pt-4 border-t border-cyber-text/10">
        <label class="flex items-center space-x-3 cursor-pointer group">
           <div class="relative">
             <input type="checkbox" v-model="formData.useNativeSSH" class="peer sr-only" />
             <div class="w-9 h-5 bg-cyber-text/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neon-green"></div>
           </div>
           <div class="flex flex-col">
             <span class="text-[10px] font-bold text-cyber-text group-hover:text-white transition-colors flex items-center gap-1">
               <Terminal size="10" /> Use Native OpenSSH
             </span>
             <span class="text-[8px] text-cyber-text/40">Use system SSH binary (Better compatibility)</span>
           </div>
        </label>
      </div>

    </div>

    <!-- ... 底部按钮保持不变 ... -->
    <div class="p-6 border-t border-neon-blue/10 bg-cyber-black/50 space-y-3 shrink-0">
      <button 
        @click="handleMainAction"
        class="w-full py-3 bg-neon-blue text-black font-bold uppercase tracking-widest rounded hover:bg-white hover:shadow-[0_0_15px_rgba(0,243,255,0.8)] transition-all flex items-center justify-center space-x-2 group"
      >
        <Power size="18" class="group-hover:animate-pulse" />
        <span>CONNECT</span>
      </button>
      
      <Transition 
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 transform translate-y-2"
        enter-to-class="opacity-100 transform translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 transform translate-y-2"
      >
        <button 
          v-if="hasChanges"
          @click="save" 
          class="w-full py-2 flex items-center justify-center space-x-2 border border-cyber-text/20 text-cyber-text hover:text-white hover:border-white transition-colors rounded hover:bg-white/5"
          :class="{ 'bg-neon-blue/10 border-neon-blue/50 text-neon-blue': hasChanges && isEditMode }"
        >
          <Save size="16" />
          <span class="text-xs font-bold tracking-wider">SAVE CONFIGURATION</span>
        </button>
      </Transition>
      
      <button v-if="isEditMode" @click="remove" class="w-full py-2 border border-red-900/40 text-red-600 hover:text-red-500 hover:bg-red-900/20 hover:border-red-500 transition-colors rounded flex items-center justify-center space-x-2 group">
        <Trash2 size="16" class="group-hover:stroke-red-400" />
        <span class="text-xs font-bold tracking-wider">DELETE HOST</span>
      </button>
    </div>

  </div>
</template>

<style scoped>
.cyber-input {
  @apply w-full bg-transparent border-b border-cyber-text/30 py-1 text-sm text-cyber-text-bright focus:outline-none focus:border-neon-blue focus:shadow-[0_1px_0_#00f3ff] transition-all placeholder-cyber-text/20;
}
</style>