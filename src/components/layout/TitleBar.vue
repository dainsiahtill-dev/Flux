<script setup lang="ts">
import { Settings2 } from 'lucide-vue-next'
import { useUiStore } from '../../stores/uiStore'
import WindowControls from './WindowControls.vue'
import { useLocale } from '../../composables/useLocale'

const uiStore = useUiStore()
const { t } = useLocale()
const handleSettingsClick = () => uiStore.toggleSettings()
</script>

<template>
  <div class="h-7 w-full bg-cyber-black border-b border-neon-blue/20 flex items-center justify-between select-none drag-region z-50 relative overflow-hidden px-2">
    
    <div class="pointer-events-none absolute inset-0 w-full h-full bg-circuit-pattern bg-[length:12px_12px] opacity-20 mix-blend-overlay"></div>

    <div class="relative z-10 flex items-center gap-2 no-drag">
      <button
        class="h-6 px-3 rounded-full border border-neon-blue/30 text-cyber-text text-[11px] tracking-widest uppercase flex items-center gap-2 bg-white/5 hover:bg-neon-blue/10 hover:text-neon-blue transition-colors"
        :title="t.titleBar.tooltip"
        @click="handleSettingsClick"
      >
        <Settings2 size="14" />
        <span class="hidden sm:inline">{{ t.titleBar.openSettings }}</span>
      </button>
    </div>

    <WindowControls class="relative z-10" />
    
  </div>
</template>

<style scoped>
.drag-region {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
</style>