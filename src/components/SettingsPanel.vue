<script setup lang="ts">
import { computed } from 'vue'
import { Languages, X, SlidersHorizontal } from 'lucide-vue-next'
import { useUiStore } from '../stores/uiStore'
import { useLocale } from '../composables/useLocale'
import type { LanguageCode } from '../types/i18n'

const uiStore = useUiStore()
const { t } = useLocale()

const currentLanguage = computed(() => uiStore.language)

const languageOrder: LanguageCode[] = ['en', 'zh']

const languageOptions = computed(() => {
  const options = t.value.settings.languageOptions
  return languageOrder.map(code => ({
    code,
    label: options[code].label,
    description: options[code].description
  }))
})

const selectLanguage = (code: LanguageCode) => {
  if (code !== uiStore.language) {
    uiStore.setLanguage(code)
  }
}

</script>

<template>
  <transition name="settings-fade">
    <div v-if="uiStore.settingsOpen" class="fixed inset-0 z-[200] flex items-start justify-end pointer-events-none">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" @click="uiStore.closeSettings()"></div>
      <div class="settings-shell pointer-events-auto mt-10 mr-6 w-[400px] max-w-[92vw]">
        <div class="settings-content">
          <header class="settings-header">
            <div class="flex items-center gap-3">
              <div class="h-11 w-11 rounded-2xl border border-neon-blue/60 bg-neon-blue/10 flex items-center justify-center shadow-neon-blue-inset">
                <SlidersHorizontal :size="20" class="text-neon-blue" />
              </div>
              <div>
                <p class="text-xs tracking-[0.35em] uppercase text-cyber-text/60">{{ t.settings.headerTagline }}</p>
                <p class="text-base font-semibold text-white">{{ t.settings.headerTitle }}</p>
              </div>
            </div>
            <button type="button" class="settings-close" @click="uiStore.closeSettings()">
              <X :size="16" />
            </button>
          </header>

          <section class="holo-card">
            <div class="flex items-center justify-between mb-4">
              <div>
                <p class="text-[11px] uppercase tracking-[0.35em] text-cyber-text/60">{{ t.settings.sectionLabel }}</p>
                <p class="text-lg font-semibold text-white">{{ t.settings.sectionTitle }}</p>
              </div>
              <Languages :size="18" class="text-neon-blue" />
            </div>
            <div class="flex flex-col gap-3">
              <button
                type="button"
                v-for="lang in languageOptions"
                :key="lang.code"
                class="language-pill"
                :class="currentLanguage === lang.code ? 'language-pill--active' : ''"
                @click="selectLanguage(lang.code)"
              >
                <div class="language-pill__main">
                  <p class="font-semibold">{{ lang.label }}</p>
                  <p class="text-[11px] opacity-70">{{ lang.description }}</p>
                </div>
                <div class="language-pill__status">
                  {{ currentLanguage === lang.code ? t.settings.languageActive : t.settings.languageIdle }}
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.settings-fade-enter-active,
.settings-fade-leave-active {
  transition: opacity 0.25s ease;
}
.settings-fade-enter-from,
.settings-fade-leave-to {
  opacity: 0;
}

.settings-shell {
  position: relative;
  border-radius: 28px;
  padding: 2px;
  isolation: isolate;
}

.settings-shell::before,
.settings-shell::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.settings-shell::before {
  background: radial-gradient(circle at top, rgba(0,243,255,0.6), transparent 60%),
    radial-gradient(circle at 20% 20%, rgba(255,0,255,0.3), transparent 55%);
  filter: blur(30px);
  opacity: 0.85;
  z-index: 0;
}

.settings-shell::after {
  background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 18px 18px;
  mask: radial-gradient(circle at center, rgba(255,255,255,0.9), transparent 70%);
  opacity: 0.25;
  z-index: 0;
}

.settings-content {
  position: relative;
  border-radius: 28px;
  background: rgba(5, 10, 20, 0.92);
  border: 1px solid rgba(0, 243, 255, 0.35);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
  padding: 28px;
  backdrop-filter: blur(12px);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  z-index: 1;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}


.settings-close {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 75, 75, 0.7);
  background: rgba(255, 0, 0, 0.2);
  color: #ff7070;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: 0 0 12px rgba(255, 0, 0, 0.35);
}

.settings-close:hover {
  border-color: rgba(255, 0, 0, 0.9);
  background: rgba(255, 0, 0, 0.35);
  color: #fff;
}

.holo-card {
  border: 1px solid rgba(0,243,255,0.25);
  border-radius: 20px;
  padding: 18px;
  background: linear-gradient(135deg, rgba(0,243,255,0.08), rgba(255,0,255,0.05));
  box-shadow: inset 0 0 25px rgba(0,0,0,0.45);
}

.language-pill {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0,0,0,0.3);
  color: rgba(255,255,255,0.9);
  transition: all 0.2s ease;
  gap: 18px;
  cursor: pointer;
}

.language-pill--active {
  border-color: rgba(0,243,255,0.8);
  background: rgba(0,243,255,0.1);
  box-shadow: 0 0 20px rgba(0,243,255,0.3);
}

.language-pill:hover {
  border-color: rgba(255,0,255,0.5);
}

.language-pill__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.language-pill__status {
  font-size: 10px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.6);
  white-space: nowrap;
  margin-left: auto;
}

.language-pill--active .language-pill__status {
  color: #00f3ff;
}

@media (max-width: 520px) {
  .settings-content {
    padding: 22px;
  }
  .language-pill {
    flex-direction: column;
    align-items: flex-start;
  }
  .language-pill__status {
    margin-left: 0;
  }
}
</style>
