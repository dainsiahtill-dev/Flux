<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, Play, Cpu, Activity, FolderGit2, Shield, FileCog, SatelliteDish, TerminalSquare, X, Check } from 'lucide-vue-next'
import { useLocale } from '../composables/useLocale'
import { useSessionStore } from '../stores/sessionStore'

const props = defineProps<{ sessionId: string }>()
const { t } = useLocale()
const osPreset = ref<'linux' | 'debian' | 'redhat'>('linux')
const sessionStore = useSessionStore()
const currentSession = computed(() => sessionStore.sessions.find(s => s.id === props.sessionId))

type QuickCommand = { label: string; cmd?: string; action?: 'input'; template?: string; placeholder?: string; defaultValue?: string }
type CommandGroup = { title: string; icon: any; accent: string; items: QuickCommand[] }

const runCommand = (cmd: string) => {
  const payload = cmd.endsWith('\n') ? cmd : `${cmd}\n`
  window.electronAPI.sendInput({ id: props.sessionId, data: payload })
}

const copyCommand = async (cmd: string) => {
  try { await navigator.clipboard.writeText(cmd) } catch {}
}

const osLabel = computed(() => {
  switch (osPreset.value) {
    case 'debian': return 'Debian/Ubuntu'
    case 'redhat': return 'RedHat/CentOS'
    default: return 'Linux'
  }
})

const pkgCmd = computed(() => osPreset.value === 'redhat' ? 'yum' : 'apt')

const inputDialog = ref<{ visible: boolean; label: string; template: string; placeholder: string; value: string; error: string }>({
  visible: false,
  label: '',
  template: '',
  placeholder: '',
  value: '',
  error: ''
})

const openInputDialog = (item: QuickCommand) => {
  inputDialog.value = {
    visible: true,
    label: item.label,
    template: item.template || '',
    placeholder: item.placeholder || '',
    value: item.defaultValue || '',
    error: ''
  }
}

const confirmInput = () => {
  const tpl = inputDialog.value.template || ''
  const val = inputDialog.value.value.trim()
  if (!val) {
    inputDialog.value.error = '请输入内容'
    return
  }
  const cmd = tpl.replace('{value}', val)
  inputDialog.value.visible = false
  inputDialog.value.error = ''
  runCommand(cmd)
}

const groups = computed<CommandGroup[]>(() => [
  {
    title: '系统脉冲',
    icon: Cpu,
    accent: 'text-neon-blue',
    items: [
      { label: 'top/htop', cmd: 'htop || top' },
      { label: 'CPU 详情', cmd: 'cat /proc/cpuinfo | head -n 20' },
      { label: '内存', cmd: 'free -h' },
      { label: '磁盘', cmd: 'df -h' },
    ]
  },
  {
    title: '网络诊断',
    icon: SatelliteDish,
    accent: 'text-neon-pink',
    items: [
      { label: 'IP/网卡', cmd: 'ip addr show' },
      { label: '监听端口', cmd: 'ss -tuln | head' },
      { label: 'Ping 网关', cmd: 'ping -c 4 8.8.8.8' },
      { label: '路由追踪', cmd: 'traceroute 8.8.8.8 || tracepath 8.8.8.8' },
    ]
  },
  {
    title: '包与服务',
    icon: Shield,
    accent: 'text-neon-green',
    items: [
      { label: '更新源', cmd: `${pkgCmd.value} update` },
      { label: '安装 htop', cmd: `${pkgCmd.value} install -y htop` },
      { label: '服务状态', cmd: 'systemctl status sshd' },
      { label: '重启服务', action: 'input', template: 'sudo systemctl restart {value}', placeholder: '服务名' },
    ]
  },
  {
    title: '日志与文件',
    icon: FileCog,
    accent: 'text-amber-300',
    items: [
      { label: '系统日志 tail', cmd: 'sudo tail -f /var/log/syslog  # 或 /var/log/messages' },
      { label: '目录大小', cmd: 'du -sh .' },
      { label: '查找大文件', cmd: 'find / -type f -size +500M 2>/dev/null | head' },
      { label: 'grep 日志', action: 'input', template: 'grep -i "{value}" /var/log/syslog | head', placeholder: '关键词' },
    ]
  },
  {
    title: '进程助手',
    icon: Activity,
    accent: 'text-cyan-300',
    items: [
      { label: 'ps 列表', cmd: 'ps aux --sort=-%cpu | head' },
      { label: '杀进程 <PID>', action: 'input', template: 'kill -9 {value}', placeholder: '输入 PID' },
      { label: 'nohup 后台', action: 'input', template: 'nohup {value} >out.log 2>&1 &', placeholder: './script.sh', defaultValue: '$PWD/' },
      { label: 'tmux 会话', cmd: 'tmux new -s session' },
    ]
  },
  {
    title: '快速脚本',
    icon: FolderGit2,
    accent: 'text-lime-300',
    items: [
      { label: '环境信息', cmd: 'uname -a && cat /etc/os-release' },
      { label: '时间同步', cmd: 'sudo ntpdate pool.ntp.org' },
      { label: '压缩目录', action: 'input', template: 'tar -czvf archive.tar.gz {value}', placeholder: '/path/to/dir' },
      { label: '解压', action: 'input', template: 'tar -xzvf {value}', placeholder: 'archive.tar.gz' },
    ]
  }
])
</script>

<template>
  <div class="w-72 h-full border-l border-neon-blue/30 bg-gradient-to-b from-cyber-dark/90 via-black/70 to-cyber-dark/80 text-cyber-text flex flex-col shadow-[-6px_0_24px_rgba(0,0,0,0.6)]">
    <div class="p-3 border-b border-neon-blue/20 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <TerminalSquare class="text-neon-blue" size="16" />
        <div>
          <div class="text-[11px] uppercase tracking-[0.3em] text-neon-blue">Terminal Assistant</div>
          <div class="text-xs text-cyber-text/70">{{ osLabel }}</div>
        </div>
      </div>
      <select v-model="osPreset" class="bg-cyber-black border border-neon-blue/30 text-[11px] text-neon-blue rounded px-2 py-1 focus:outline-none focus:border-neon-blue">
        <option value="linux">Linux</option>
        <option value="debian">Debian/Ubuntu</option>
        <option value="redhat">RedHat/CentOS</option>
      </select>
    </div>

    <div class="flex-1 overflow-y-auto space-y-3 p-3 custom-scroll">
      <div
        v-for="(group, idx) in groups"
        :key="idx"
        class="border border-neon-blue/20 rounded-lg bg-black/40 shadow-neon-blue-inset"
      >
        <div class="px-3 py-2 flex items-center gap-2 border-b border-neon-blue/10">
          <component :is="group.icon" size="14" :class="group.accent" />
          <span class="text-xs font-semibold text-white">{{ group.title }}</span>
        </div>
        <div class="divide-y divide-cyber-text/10">
          <div
            v-for="item in group.items"
            :key="item.label"
            class="px-3 py-2 hover:bg-neon-blue/5 transition-colors group"
          >
            <div class="flex items-center justify-between">
              <span class="text-[12px] text-white">{{ item.label }}</span>
              <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <template v-if="item.action === 'input'">
                  <button
                    class="px-2 py-1 rounded border border-neon-pink/60 bg-neon-pink/10 text-neon-pink hover:bg-neon-pink hover:text-black text-[11px] flex items-center gap-1"
                    @click.stop="openInputDialog(item)"
                  >
                    <Skull size="14" />
                    <span>填参</span>
                  </button>
                </template>
                <template v-else>
                  <button class="px-2 py-1 rounded bg-neon-blue/10 text-neon-blue hover:bg-neon-blue/20 text-[11px] flex items-center gap-1" @click.stop="runCommand(item.cmd!)">
                    <Play size="12" />
                    <span>执行</span>
                  </button>
                  <button class="px-2 py-1 rounded bg-cyber-light/50 text-cyber-text hover:text-white text-[11px] flex items-center gap-1" @click.stop="copyCommand(item.cmd!)">
                    <Copy size="12" />
                    <span>复制</span>
                  </button>
                </template>
              </div>
            </div>
            <div class="text-[11px] text-cyber-text/70 font-mono mt-1 break-words">{{ item.cmd || '交互操作' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <transition name="fade">
    <div v-if="inputDialog.visible" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]" @click.self="inputDialog.visible=false">
      <div class="w-[380px] bg-cyber-dark border border-neon-blue/40 rounded-lg shadow-[0_0_30px_rgba(0,243,255,0.2)] overflow-hidden">
        <div class="px-4 py-3 border-b border-neon-blue/30 flex items-center justify-between">
          <div class="flex items-center gap-2 text-white">
            <Skull size="16" class="text-neon-pink" />
            <span class="text-sm font-semibold">{{ inputDialog.label }}</span>
          </div>
          <button class="p-1 text-cyber-text hover:text-white" @click="inputDialog.visible=false">
            <X size="14" />
          </button>
        </div>
        <div class="p-4 space-y-3">
          <div class="text-xs text-cyber-text/70">请输入参数，将通过当前会话执行命令</div>
          <input
            v-model="inputDialog.value"
            :placeholder="inputDialog.placeholder || '输入参数'"
            class="w-full bg-black/60 border border-neon-pink/40 rounded px-3 py-2 text-sm text-neon-pink focus:outline-none focus:border-neon-pink"
          />
          <div v-if="inputDialog.error" class="text-[11px] text-neon-pink">{{ inputDialog.error }}</div>
          <div class="flex justify-end gap-2">
            <button class="px-3 py-1.5 text-xs border border-cyber-text/30 rounded text-cyber-text hover:text-white" @click="inputDialog.visible=false">取消</button>
            <button class="px-3 py-1.5 text-xs border border-neon-pink/60 rounded text-neon-pink hover:bg-neon-pink hover:text-black flex items-center gap-1" @click="confirmInput">
              <Check size="14" />
              确认执行
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(0, 243, 255, 0.4); border-radius: 9999px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
