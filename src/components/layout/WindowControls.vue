<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Minus, Square, Copy, X } from 'lucide-vue-next'
import { useLocale } from '../../composables/useLocale'

const isMaximized = ref(false)
const { t } = useLocale()
const windowText = computed(() => t.value.windowControls)

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
      :title="windowText.minimize"
    >
      <Minus size="16" />
    </button>

    <button 
      @click="toggleMaximize" 
      class="h-full w-12 flex items-center justify-center text-cyber-text hover:bg-white/10 hover:text-white transition-colors focus:outline-none"
      :title="isMaximized ? windowText.restore : windowText.maximize"
    >
      <Copy v-if="isMaximized" size="14" />
      <Square v-else size="14" />
    </button>

    <button 
      @click="closeApp" 
      class="h-full w-12 flex items-center justify-center text-cyber-text hover:bg-red-600 hover:text-white transition-colors focus:outline-none"
      :title="windowText.close"
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