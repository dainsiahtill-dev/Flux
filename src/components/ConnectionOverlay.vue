<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { X, Plug, Keyboard, TerminalSquare, Eye, EyeOff, Activity, ChevronRight, Hash, User, ShieldAlert, FileKey, AlertCircle } from 'lucide-vue-next'
import { Session } from '../stores/sessionStore'

const props = defineProps<{
  session: Session
}>()

const emit = defineEmits<{
  (e: 'submit-credentials', payload: { user?: string, password?: string }): void
  (e: 'cancel'): void
}>()

const inputVal = ref('')
const showPassword = ref(false)
const logsContainer = ref<HTMLElement | null>(null)

const logs = computed(() => props.session.logs || [])

// 自动滚动：监听日志长度变化
const scrollToBottom = async () => {
  await nextTick()
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight
  }
}
onMounted(() => scrollToBottom())
watch(() => props.session.logs.length, scrollToBottom)

const isInputNeeded = computed(() => 
  ['username-needed', 'password-needed'].includes(props.session.status)
)

// ✅ 新增：错误状态判定
const isError = computed(() => props.session.status === 'error')

const inputConfig = computed(() => {
  if (props.session.status === 'username-needed') {
    return { type: 'text', placeholder: 'ENTER_USERNAME...', icon: User, label: 'Identity Required', btnText: 'PROCEED' }
  }
  if (props.session.authType === 'privateKey') {
    return { type: showPassword.value ? 'text' : 'password', placeholder: 'ENTER_PASSPHRASE...', icon: FileKey, label: 'Key Passphrase Required', btnText: 'UNLOCK KEY' }
  }
  return { type: showPassword.value ? 'text' : 'password', placeholder: 'ENTER_PASSWORD...', icon: Hash, label: 'Security Token Required', btnText: 'AUTHENTICATE' }
})

const submit = () => {
  if (!inputVal.value) return
  if (props.session.status === 'username-needed') {
    emit('submit-credentials', { user: inputVal.value })
  } else {
    emit('submit-credentials', { password: inputVal.value })
  }
  inputVal.value = '' 
}

const statusText = computed(() => {
  const s = props.session.status
  if (s === 'connected') return 'ACCESS GRANTED'
  if (s === 'error') return 'CONNECTION FAILED' // 显眼的错误文本
  if (s === 'username-needed') return 'USER ID REQUIRED'
  if (s === 'password-needed') return props.session.authType === 'privateKey' ? 'KEY LOCKED' : 'AUTH REQUIRED'
  if (s === 'authenticating') return 'VERIFYING...'
  return 'ESTABLISHING UPLINK...'
})

const stepStatus = computed(() => {
  const s = props.session.status
  if (s === 'connected') return 3
  if (isInputNeeded.value || s === 'authenticating') return 2
  if (s === 'error') return -1 // 错误码
  return 1
})
</script>

<template>
  <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
    
    <div 
      class="relative w-[550px] bg-cyber-black border shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col clip-box group transition-colors duration-500"
      :class="isError ? 'border-red-500/50 shadow-[0_0_50px_rgba(255,0,0,0.15)]' : 'border-neon-blue/30 shadow-[0_0_50px_rgba(0,243,255,0.15)]'"
    >
      
      <div class="absolute inset-0 bg-circuit-pattern opacity-5 pointer-events-none"></div>
      
      <div 
        class="absolute top-0 left-0 w-full h-[2px] opacity-50 animate-scan"
        :class="isError ? 'bg-red-500' : 'bg-gradient-to-r from-transparent via-neon-blue to-transparent'"
      ></div>

      <div class="relative z-10 flex items-center justify-between px-6 py-4 border-b bg-cyber-dark/50"
           :class="isError ? 'border-red-500/20' : 'border-neon-blue/10'">
        <div class="flex items-center space-x-3">
          <AlertCircle v-if="isError" class="text-red-500 animate-pulse" size="18" />
          <Activity v-else class="text-neon-blue animate-pulse" size="18" />
          <div>
            <h3 class="text-sm font-bold text-white tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
              System Link // {{ session.name }}
            </h3>
            <p class="text-[10px] font-mono tracking-wider" :class="isError ? 'text-red-400' : 'text-neon-blue/60'">
              TARGET: {{ session.host }}
            </p>
          </div>
        </div>
        <div class="px-2 py-1 text-[10px] font-bold border rounded animate-pulse"
             :class="isError ? 'border-red-500/30 text-red-500 bg-red-500/5' : 'border-neon-blue/30 text-neon-blue bg-neon-blue/5'">
          {{ statusText }}
        </div>
      </div>

      <div class="relative z-10 px-12 py-8">
        <div class="relative flex items-center justify-between">
          <div class="absolute top-1/2 left-0 w-full h-[2px] bg-cyber-light/20 -z-0"></div>
          
          <div class="absolute top-1/2 left-0 h-[2px] shadow-[0_0_10px_currentColor] -z-0 transition-all duration-700 ease-out" 
               :class="isError ? 'bg-red-500 w-full' : 'bg-neon-blue'"
               :style="!isError ? { width: stepStatus === 1 ? '0%' : stepStatus === 2 ? '50%' : '100%' } : {}"></div>

          <div class="step-dot" :class="isError ? 'active-error' : (stepStatus >= 1 ? 'active' : '')">
            <Plug size="14" />
            <span class="step-label">NET</span>
          </div>

          <div class="step-dot" :class="isError ? 'active-error' : (stepStatus >= 2 ? 'active-warning' : '')">
            <ShieldAlert v-if="isInputNeeded" size="14" />
            <Keyboard v-else size="14" />
            <span class="step-label">AUTH</span>
          </div>

          <div class="step-dot" :class="isError ? 'active-error' : (stepStatus >= 3 ? 'active-success' : '')">
            <TerminalSquare size="14" />
            <span class="step-label">TERM</span>
          </div>
        </div>
      </div>

      <div class="relative z-10 px-6 mb-4 transition-all duration-300" :class="isInputNeeded ? 'h-24' : 'h-32'">
        <div class="bg-black/60 border border-cyber-text/20 p-3 h-full overflow-y-auto font-mono text-[10px] space-y-1 relative shadow-inner custom-scrollbar" ref="logsContainer">
          <div v-for="(log, i) in logs" :key="i" class="break-all relative z-10">
            <span class="text-neon-blue mr-2">[{{ new Date().toLocaleTimeString() }}]</span>
            <span :class="log.includes('❌') || log.toLowerCase().includes('error') || log.toLowerCase().includes('failed') ? 'text-red-500 font-bold' : 'text-cyber-text/80'">
              > {{ log }}
            </span>
          </div>
          <div v-if="isError" class="text-red-500 mt-1 font-bold animate-pulse">_ Process Terminated.</div>
          <div v-else class="animate-pulse text-neon-blue mt-1">_</div>
        </div>
      </div>

      <div v-if="isInputNeeded && !isError" class="relative z-10 px-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div class="relative group">
          <div class="absolute -top-3 left-0 text-[10px] font-bold text-neon-pink tracking-widest uppercase flex items-center">
            <component :is="inputConfig.icon" size="10" class="mr-1"/> {{ inputConfig.label }}
          </div>
          <div class="relative flex items-center border-b border-neon-pink/50 group-focus-within:border-neon-pink transition-colors bg-neon-pink/5">
            <input 
              :type="inputConfig.type" 
              v-model="inputVal"
              @keydown.enter="submit"
              class="w-full bg-transparent p-3 text-white text-sm focus:outline-none font-mono tracking-wider placeholder-neon-pink/30"
              :placeholder="inputConfig.placeholder"
              autoFocus
            />
            <button v-if="['password-needed'].includes(props.session.status)" @click="showPassword = !showPassword" class="p-2 text-neon-pink/50 hover:text-neon-pink transition-colors">
              <EyeOff v-if="showPassword" size="16" />
              <Eye v-else size="16" />
            </button>
          </div>
        </div>
      </div>

      <div class="relative z-10 p-6 pt-2 flex items-center justify-between border-t bg-cyber-black/50"
           :class="isError ? 'border-red-500/20' : 'border-white/5'">
        <button 
          @click="emit('cancel')"
          class="group/btn flex items-center space-x-2 transition-colors text-xs font-bold tracking-widest uppercase"
          :class="isError ? 'text-red-500 hover:text-red-400' : 'text-cyber-text hover:text-red-400'"
        >
          <X size="14" class="group-hover/btn:rotate-90 transition-transform" />
          <span>{{ isError ? 'CLOSE CONNECTION' : 'ABORT SEQUENCE' }}</span>
        </button>

        <button v-if="isInputNeeded && !isError" @click="submit" class="cy-button">
          <span>{{ inputConfig.btnText }}</span>
          <ChevronRight size="14" />
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 保持原有样式，新增 error 状态样式 */
.cy-button {
  @apply relative flex items-center space-x-2 px-6 py-2 bg-neon-blue/10 border border-neon-blue/50 text-neon-blue text-xs font-bold tracking-widest uppercase transition-all duration-300 hover:bg-neon-blue hover:text-black hover:shadow-[0_0_15px_#00f3ff];
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}
.step-dot {
  @apply relative z-10 w-8 h-8 rounded-sm border border-cyber-text/20 bg-cyber-black flex items-center justify-center text-cyber-text/30 transition-all duration-500;
}
.step-label {
  @apply absolute -bottom-5 text-[9px] font-bold tracking-widest opacity-50 transition-colors;
}
.step-dot.active {
  @apply border-neon-blue bg-neon-blue/20 text-neon-blue shadow-[0_0_10px_rgba(0,243,255,0.3)];
}
.step-dot.active .step-label { @apply text-neon-blue opacity-100; }
.step-dot.active-warning {
  @apply border-neon-pink bg-neon-pink/20 text-neon-pink shadow-[0_0_10px_rgba(255,0,255,0.3)];
}
.step-dot.active-warning .step-label { @apply text-neon-pink; }
.step-dot.active-success {
  @apply border-neon-green bg-neon-green/20 text-neon-green shadow-[0_0_10px_rgba(10,255,0,0.3)];
}
.step-dot.active-success .step-label { @apply text-neon-green; }

/* ✅ 新增：错误状态样式 */
.step-dot.active-error {
  @apply border-red-500 bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(255,0,0,0.5)];
}
.step-dot.active-error .step-label { @apply text-red-500; }

@keyframes scan { 0% { top: 0; opacity: 0; } 10% { opacity: 0.5; } 90% { opacity: 0.5; } 100% { top: 100%; opacity: 0; } }
.animate-scan { animation: scan 2s linear infinite; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #000; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #00f3ff; }
.clip-box { clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px); }
</style>