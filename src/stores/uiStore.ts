import { defineStore } from 'pinia'

// 定义视图类型
export type ViewType = 'hosts' | 'keychain' | 'port-forwarding' | 'terminal'

export const useUiStore = defineStore('ui', {
  state: () => ({
    // 左侧侧边栏状态
    sidebarCollapsed: false,
    
    // 当前主区域显示的视图
    currentView: 'hosts' as ViewType,
    
    // --- 右侧详情抽屉状态 ---
    rightSidebarOpen: false, // 是否打开
    selectedHostId: null as string | null, // 当前选中的主机ID（如果是null则表示是新建模式）
  }),

  actions: {
    // 切换左侧侧边栏折叠
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    // 设置当前主视图
    setView(view: ViewType) {
      this.currentView = view
    },

    // 切换到管理界面 (Hosts, Keychain, etc.)
    showManager(type: 'hosts' | 'keychain' | 'port-forwarding') {
      this.currentView = type
    },

    // 切换到终端界面
    showTerminal() {
      this.currentView = 'terminal'
    },

    // --- 右侧抽屉动作 ---

    // 打开主机详情 (编辑模式)
    openHostDetail(hostId: string) {
      this.selectedHostId = hostId
      this.rightSidebarOpen = true
    },

    // 打开主机详情 (新建模式)
    openCreateHost() {
      this.selectedHostId = null // null 表示新建
      this.rightSidebarOpen = true
      this.currentView = 'hosts'
    },

    // 关闭详情抽屉
    closeHostDetail() {
      this.rightSidebarOpen = false
      // 稍微延迟清除选中ID，防止动画消失时内容突然变空
      setTimeout(() => {
        this.selectedHostId = null
      }, 300)
    }
  }
})