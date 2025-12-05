import { defineStore } from 'pinia'
import type { LanguageCode } from '../types/i18n'

export type ViewType = 'hosts' | 'keychain' | 'port-forwarding' | 'terminal'

const detectLanguage = (): LanguageCode => {
  if (typeof navigator !== 'undefined') {
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return 'en'
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarCollapsed: false,
    currentView: 'hosts' as ViewType,
    language: detectLanguage(),
    settingsOpen: false,
    
    rightSidebarOpen: false,
    selectedHostId: null as string | null,
    
    // ✅ 新增：Key 选中状态
    selectedKeyId: null as string | null, 
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    toggleSettings() {
      this.settingsOpen = !this.settingsOpen
    },

    openSettings() {
      this.settingsOpen = true
    },

    closeSettings() {
      this.settingsOpen = false
    },

    setLanguage(language: LanguageCode) {
      this.language = language
    },

    setView(view: ViewType) {
      this.currentView = view
    },

    showManager(type: 'hosts' | 'keychain' | 'port-forwarding') {
      this.currentView = type
      // 切换视图时关闭侧边栏
      this.rightSidebarOpen = false 
    },

    showTerminal() {
      this.currentView = 'terminal'
    },

    // --- Hosts ---
    openHostDetail(hostId: string) {
      this.selectedHostId = hostId
      this.selectedKeyId = null // 互斥
      this.rightSidebarOpen = true
    },

    openCreateHost() {
      this.selectedHostId = null
      this.selectedKeyId = null
      this.rightSidebarOpen = true
      this.currentView = 'hosts'
    },

    closeHostDetail() {
      this.rightSidebarOpen = false
      setTimeout(() => { this.selectedHostId = null }, 300)
    },

    // ✅ 新增：--- Keys ---
    openKeyDetail(keyId: string) {
      this.selectedKeyId = keyId
      this.selectedHostId = null // 互斥
      this.rightSidebarOpen = true
    },

    closeKeyDetail() {
      this.rightSidebarOpen = false
      setTimeout(() => { this.selectedKeyId = null }, 300)
    }
  }
})