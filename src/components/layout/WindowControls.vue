<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Minus, Square, Copy, X } from 'lucide-vue-next'

const isMaximized = ref(false)

const minimize = () => window.electronAPI.minimize()
const closeApp = () => window.electronAPI.close()
const toggleMaximize = () => window.electronAPI.maximize()

// 状态同步
const updateState = (max: boolean) => { isMaximized.value = max }

onMounted(async () => {
  // 1. 初始化获取状态
  isMaximized.value = await window.electronAPI.isMaximized()

  // 2. 注册监听器 (使用 preload 中定义的 onMaximized / onRestored)
  window.electronAPI.onMaximized(() => updateState(true))
  window.electronAPI.onRestored(() => updateState(false))
})
</script>

<template>
  <div class="flex items-center h-full no-drag z-50">
    
    <button 
      @click="minimize" 
      class="h-full w-12 flex items-center justify-center text-cyber-text hover:bg-white/10 hover:text-white transition-colors focus:outline-none"
      title="Minimize"
    >
      <Minus size="16" />
    </button>

    <button 
      @click="toggleMaximize" 
      class="h-full w-12 flex items-center justify-center text-cyber-text hover:bg-white/10 hover:text-white transition-colors focus:outline-none"
      :title="isMaximized ? 'Restore' : 'Maximize'"
    >
      <Copy v-if="isMaximized" size="14" />
      <Square v-else size="14" />
    </button>

    <button 
      @click="closeApp" 
      class="h-full w-12 flex items-center justify-center text-cyber-text hover:bg-red-600 hover:text-white transition-colors focus:outline-none"
      title="Close"
    >
      <X size="18" />
    </button>

  </div>
</template>

<style scoped>
/* 必须加上这个，因为父级会是 drag-region */
.no-drag {
  -webkit-app-region: no-drag;
}
</style>