<script setup lang="ts">
import WindowControls from './WindowControls.vue'
</script>

<template>
  <div class="h-7 w-full bg-cyber-black border-b border-neon-blue/20 flex items-center justify-end select-none drag-region z-50 relative overflow-hidden">
    
    <div class="pointer-events-none absolute inset-0 w-full h-full bg-circuit-pattern bg-[length:12px_12px] opacity-20 mix-blend-overlay"></div>

    <WindowControls class="relative z-10" />
    
  </div>
</template>

<style scoped>
.drag-region {
  -webkit-app-region: drag;
}
</style>