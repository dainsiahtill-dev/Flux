<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useSessionStore } from '../stores/sessionStore'
import { 
  HardDrive, Server, RefreshCcw, FolderPlus, Upload, Download, 
  Folder, File, ArrowLeftRight, Search, ArrowUp, X, Trash2, Edit, Info, TerminalSquare
} from 'lucide-vue-next'
import { useLocale } from '../composables/useLocale'

type FileItem = {
  name: string
  type: 'file' | 'dir'
  size: string
  modified: string
  badge?: string
  permissions?: number
}

type TransferItem = {
  id: string
  name: string
  direction: 'upload' | 'download'
  size: string
  status: 'queued' | 'active' | 'done' | 'error'
  error?: string
  progress?: number
}

type ConfirmDialogOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

const props = defineProps<{ sessionId: string }>()
const sessionStore = useSessionStore()
const session = computed(() => sessionStore.sessions.find(s => s.id === props.sessionId))
const { t } = useLocale()
const sftpCopy = computed(() => t.value.sftp)
const localRootLabel = computed(() => sftpCopy.value.panes.localRoot)
const formatMessage = (template: string, variables: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? '')

const localPath = ref('')
const remotePath = ref('/')

const searchLocal = ref('')
const searchRemote = ref('')

const localFiles = ref<FileItem[]>([])
const remoteFiles = ref<FileItem[]>([])
const localError = ref('')
const remoteError = ref('')
const loadingLocal = ref(false)
const loadingRemote = ref(false)

const transferQueue = ref<TransferItem[]>([])

const selectedLocal = ref<string | null>(null)
const selectedRemote = ref<string | null>(null)

const splitPath = (value: string, scope: 'local' | 'remote') => {
  const normalized = scope === 'local' ? value.replace(/\\/g, '/') : value
  return normalized.split('/').filter(Boolean)
}

const getLocalRoot = () => localRootLabel.value

const buildPath = (parts: string[], scope: 'local' | 'remote') => {
  if (scope === 'local') {
    if (parts.length === 0 || (parts.length === 1 && parts[0] === getLocalRoot())) return getLocalRoot()
    const drive = parts[0].endsWith(':') ? parts[0] : `${parts[0]}:`
    const rest = parts.slice(1)
    return rest.length ? `${drive}/${rest.join('/')}` : `${drive}/`
  }
  return `/${parts.join('/')}`
}

const localBreadcrumbs = computed(() => splitPath(localPath.value, 'local'))
const remoteBreadcrumbs = computed(() => splitPath(remotePath.value, 'remote'))

const filteredLocalFiles = computed(() =>
  localFiles.value.filter(item => item.name.toLowerCase().includes(searchLocal.value.toLowerCase()))
)
const filteredRemoteFiles = computed(() =>
  remoteFiles.value.filter(item => item.name.toLowerCase().includes(searchRemote.value.toLowerCase()))
)

const setSelection = (scope: 'local' | 'remote', name: string) => {
  if (scope === 'local') {
    selectedLocal.value = name
  } else {
    selectedRemote.value = name
  }
}

const parentLocalPath = (value: string) => {
  const normalized = value.replace(/\\/g, '/')
  // If we are at a drive root like "C:/" or "D:/", go to "This PC"
  if (/^[A-Za-z]:\/?$/.test(normalized)) {
    return getLocalRoot()
  }
  
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length <= 1) return normalized.includes(':') ? parts[0] + ':/' : '/'
  const drive = parts[0].match(/^[A-Za-z]:$/) ? parts.shift() : ''
  parts.pop()
  const rest = parts.join('/')
  return drive ? `${drive}/${rest}` : `/${rest}`
}

const parentRemotePath = (value: string) => {
  const normalized = value.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  parts.pop()
  return parts.length ? `/${parts.join('/')}` : '/'
}

const joinLocalPath = (base: string, name: string) => {
  if (base === getLocalRoot()) {
    return name.endsWith('/') ? name : `${name}/`
  }
  const normalized = base.replace(/\\/g, '/').replace(/\/+$/, '')
  if (/^[A-Za-z]:$/.test(normalized)) return `${normalized}/${name}`
  if (/^[A-Za-z]:\/?$/.test(normalized)) return `${normalized.replace(/\/?$/, '/')}${name}`
  if (!normalized) return name
  return `${normalized}/${name}`
}

const formatSize = (value: number | string) => {
  if (value === '-' || typeof value === 'string') return value
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const formatTime = (value: number | string) => {
  if (typeof value === 'string') return value
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

const loadLocalDir = async (targetPath?: string) => {
  if (!window.electronAPI?.readDir) {
    localError.value = sftpCopy.value.errors.readDirUnavailable
    return
  }
  loadingLocal.value = true
  localError.value = ''
  try {
    // If targetPath is empty or undefined, let backend handle it (defaults to CWD)
    const path = targetPath || localPath.value
    const result = await window.electronAPI.readDir(path)
    if (result?.path) {
      localPath.value = result.path
    }
    localFiles.value = (result?.entries || []).map((item: any) => ({
      name: item.name,
      type: item.type,
      size: formatSize(item.size),
      modified: formatTime(item.modified),
      badge: item.badge,
      permissions: item.permissions
    }))
    if (result?.error) {
      localError.value = result.error
    }
  } catch (err: any) {
    localError.value = err?.message || sftpCopy.value.errors.readDirUnavailable
  } finally {
    loadingLocal.value = false
  }
}

const loadRemoteDir = async (targetPath?: string) => {
  if (session.value?.status !== 'connected') {
    remoteError.value = sftpCopy.value.errors.sftpNotConnected
    return
  }
  if (!window.electronAPI?.sftpReadDir) {
    remoteError.value = sftpCopy.value.errors.sftpApiMissing
    return
  }
  loadingRemote.value = true
  remoteError.value = ''
  try {
    const result = await window.electronAPI.sftpReadDir({
      id: session.value?.id || '',
      path: targetPath || remotePath.value || '/'
    })
    if (result?.path) {
      remotePath.value = result.path.startsWith('/') ? result.path : `/${result.path}`
    }
    remoteFiles.value = (result?.entries || []).map((item: any) => ({
      name: item.name,
      type: item.type,
      size: formatSize(item.size),
      modified: formatTime(item.modified),
      permissions: item.permissions
    }))
    if (result?.error) remoteError.value = result.error
  } catch (err: any) {
    remoteError.value = err?.message || sftpCopy.value.errors.sftpApiMissing
  } finally {
    loadingRemote.value = false
  }
}

const navigateUp = (scope: 'local' | 'remote') => {
  if (scope === 'local') {
    loadLocalDir(parentLocalPath(localPath.value))
  } else {
    loadRemoteDir(parentRemotePath(remotePath.value || '/'))
  }
}

const jumpToCrumb = (scope: 'local' | 'remote', index: number) => {
  if (scope === 'local') {
    const parts = splitPath(localPath.value, 'local').slice(0, index + 1)
    loadLocalDir(buildPath(parts, 'local'))
  } else {
    const parts = splitPath(remotePath.value || '/', scope).slice(0, index + 1)
    loadRemoteDir(buildPath(parts, scope))
  }
}

const refreshPane = (scope: 'local' | 'remote') => {
  if (scope === 'local') {
    loadLocalDir(localPath.value)
  } else {
    loadRemoteDir(remotePath.value || '/')
  }
}

const joinPath = (base: string, scope: 'local' | 'remote', name: string) => {
  if (scope === 'local') {
    return joinLocalPath(base, name)
  }
  const trimmed = base.replace(/\/+$/, '')
  return trimmed ? `${trimmed}/${name}` : `/${name}`
}

const queueTransfer = (direction: 'upload' | 'download', name: string, size: string) => {
  const item: TransferItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    direction,
    size,
    status: 'queued'
  }
  transferQueue.value.unshift(item)
  return item
}

const uploadLocalFiles = async (files: { path: string; name: string; size: number | string }[]) => {
  if (session.value?.status !== 'connected') {
    remoteError.value = sftpCopy.value.errors.sftpNotConnected
    return
  }
  for (const file of files) {
    // Check if it is a directory
    if (window.electronAPI?.fsStat) {
      const stat = await window.electronAPI.fsStat(file.path)
      if (stat && stat.isDirectory) {
        // TODO: Implement directory upload or show notification
        console.warn(`Skipping directory upload: ${file.name}`)
        continue
      }
    }

    const remoteConflict = remoteFiles.value.some(remote => remote.name === file.name && remote.type === 'file')
    if (remoteConflict) {
      const confirmed = await showConfirmDialog({
        title: sftpCopy.value.dialogs.overwriteTitle,
        message: formatMessage(sftpCopy.value.dialogs.overwriteMessage, { name: file.name }),
        confirmLabel: sftpCopy.value.dialogs.overwriteConfirm,
        cancelLabel: sftpCopy.value.dialogs.overwriteSkip
      })
      if (!confirmed) {
        continue
      }
    }

    const transfer = queueTransfer('upload', file.name, typeof file.size === 'number' ? formatSize(file.size) : file.size)
    transfer.status = 'active'
    transfer.progress = 0
    const result = await window.electronAPI.sftpUpload({
      id: session.value?.id || '',
      localPath: file.path,
      remotePath: joinPath(remotePath.value || '/', 'remote', file.name),
      transferId: transfer.id
    })
    if (result.success) {
      transfer.status = 'done'
      transfer.progress = 100
      await loadRemoteDir(remotePath.value || '/')
    } else {
      transfer.status = 'error'
      transfer.error = result.error
    }
  }
}

const handleLocalDragStart = (evt: DragEvent, item: FileItem) => {
  if (!evt.dataTransfer) return
  evt.dataTransfer.effectAllowed = 'copy'
  
  // Construct full path
  const fullPath = joinLocalPath(localPath.value, item.name)
  
  // Use custom MIME type for internal app drag
  evt.dataTransfer.setData('application/x-flux-file', JSON.stringify({
    path: fullPath,
    name: item.name,
    size: item.size,
    type: item.type
  }))
}

const handleRemoteDragStart = (evt: DragEvent, item: FileItem) => {
  if (!evt.dataTransfer) return
  evt.dataTransfer.effectAllowed = 'copy'
  
  // Construct full path
  const fullPath = joinPath(remotePath.value || '/', 'remote', item.name)
  
  // Use custom MIME type for internal app drag (remote file)
  evt.dataTransfer.setData('application/x-flux-remote-file', JSON.stringify({
    path: fullPath,
    name: item.name,
    size: item.size,
    type: item.type
  }))
}

const isLocalDragHover = ref(false)

const handleLocalDragOver = (evt: DragEvent) => {
  // Only show drag effect if dragging from remote
  if (!evt.dataTransfer?.types.includes('application/x-flux-remote-file')) return

  evt.preventDefault()
  evt.stopPropagation()
  evt.dataTransfer!.dropEffect = 'copy'
  isLocalDragHover.value = true
}

const handleLocalDragLeave = (evt: DragEvent) => {
  evt.preventDefault()
  evt.stopPropagation()
  isLocalDragHover.value = false
}

const handleLocalDrop = async (evt: DragEvent) => {
  evt.preventDefault()
  evt.stopPropagation()
  isLocalDragHover.value = false

  // Check for internal remote file drag
  const internalData = evt.dataTransfer?.getData('application/x-flux-remote-file')
  if (internalData) {
    try {
      const file = JSON.parse(internalData)
      if (file.type === 'dir') {
        localError.value = formatMessage(sftpCopy.value.errors.directoryDownloadUnsupported, { name: file.name })
        return
      }
      await handleDownload({
        name: file.name,
        size: file.size,
        type: file.type || 'file', 
        modified: ''
      })
      return
    } catch (e) {
      console.error('Failed to parse internal remote drag data', e)
    }
  }
}

const isRemoteDragHover = ref(false)

const handleRemoteDragOver = (evt: DragEvent) => {
  // Don't show drag effect if dragging from remote (self)
  if (evt.dataTransfer?.types.includes('application/x-flux-remote-file')) return

  evt.preventDefault()
  evt.stopPropagation()
  evt.dataTransfer!.dropEffect = 'copy'
  isRemoteDragHover.value = true
}

const handleRemoteDragLeave = (evt: DragEvent) => {
  evt.preventDefault()
  evt.stopPropagation()
  isRemoteDragHover.value = false
}

const handleRemoteDrop = async (evt: DragEvent) => {
  evt.preventDefault()
  evt.stopPropagation()
  isRemoteDragHover.value = false

  // Check for internal drag
  const internalData = evt.dataTransfer?.getData('application/x-flux-file')
  if (internalData) {
    try {
      const file = JSON.parse(internalData)
      if (file.type === 'dir') {
        remoteError.value = formatMessage(sftpCopy.value.errors.directoryUploadUnsupported, { name: file.name })
        return
      }
      await uploadLocalFiles([file])
      return
    } catch (e) {
      console.error('Failed to parse internal drag data', e)
    }
  }

  const fileList = Array.from(evt.dataTransfer?.files || []).map((f: any) => ({
    path: window.electronAPI?.getPathForFile ? window.electronAPI.getPathForFile(f) : f.path,
    name: f.name,
    size: f.size || '-'
  }))
  if (fileList.length === 0) return
  await uploadLocalFiles(fileList as any)
}

const handleDownload = async (item: FileItem) => {
  if (item.type !== 'file') return
  let dest = joinLocalPath(localPath.value || '/', item.name)
  // 如果计算结果等于当前目录，追加文件名防止目录冲突
  if (dest === (localPath.value || '')) {
    dest = joinLocalPath((localPath.value || '/').replace(/\/?$/, '/'), item.name)
  }

  // Check if destination exists and is a directory
  if (window.electronAPI?.fsStat) {
    const stat = await window.electronAPI.fsStat(dest)
    if (stat && stat.isDirectory) {
      console.error(`Destination ${dest} is a directory. Cannot overwrite with file.`)
      // Optional: Show user alert
      return 
    }
  }

  const transfer = queueTransfer('download', item.name, item.size)
  transfer.status = 'active'
  transfer.progress = 0
  const result = await window.electronAPI.sftpDownload({
    id: session.value?.id || '',
    remotePath: joinPath(remotePath.value || '/', 'remote', item.name),
    localPath: dest,
    transferId: transfer.id
  })
  if (result.success) {
    transfer.status = 'done'
    transfer.progress = 100
    await loadLocalDir(localPath.value) // refresh local list after download
  } else {
    transfer.status = 'error'
    transfer.error = result.error
  }
}

const enterItem = async (scope: 'local' | 'remote', item: FileItem) => {
  if (item.type === 'dir' || item.type !== 'file') {
    if (scope === 'local') {
      const nextPath = joinPath(localPath.value, scope, item.name)
      selectedLocal.value = null
      loadLocalDir(nextPath)
    } else {
      selectedRemote.value = null
      const nextPath = joinPath(remotePath.value || '/', scope, item.name)
      loadRemoteDir(nextPath)
    }
  } else {
    if (scope === 'local') {
      // upload local file to current remote dir
      await uploadLocalFiles([{ path: joinLocalPath(localPath.value || '/', item.name), name: item.name, size: item.size } as any])
    } else {
      await handleDownload(item)
    }
  }
}

const statusTone = (status: TransferItem['status']) => {
  if (status === 'active') return 'text-neon-blue'
  if (status === 'done') return 'text-neon-green'
  if (status === 'error') return 'text-neon-pink'
  return 'text-cyber-text/70'
}

const transferStatusLabel = (status: TransferItem['status']) => sftpCopy.value.transfer.statuses[status] || status.toUpperCase()

const cancelTransfer = async (item: TransferItem) => {
  if (item.status !== 'active') return
  
  // Optimistically update UI
  item.status = 'error'
  item.error = sftpCopy.value.errors.cancelTransfer
  
  if (window.electronAPI?.cancelTransfer) {
    await window.electronAPI.cancelTransfer({ id: session.value?.id || '', transferId: item.id })
  }
}

const removeTransfer = (id: string) => {
  transferQueue.value = transferQueue.value.filter(t => t.id !== id)
}

const connectionLabel = computed(() => {
  if (!session.value) return sftpCopy.value.header.connectionFallback
  return `${session.value.user || 'root'}@${session.value.host}`
})

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  item: null as FileItem | null,
  scope: 'local' as 'local' | 'remote'
})

const contextMenuTitle = computed(() => {
  if (contextMenu.value.item) return contextMenu.value.item.name
  return contextMenu.value.scope === 'local'
    ? (localPath.value || sftpCopy.value.panes.localContext)
    : (remotePath.value || sftpCopy.value.panes.remoteContext)
})

const openContextMenu = (evt: MouseEvent, item: FileItem | null, scope: 'local' | 'remote') => {
  contextMenu.value = {
    visible: true,
    x: evt.clientX,
    y: evt.clientY,
    item,
    scope
  }
}

const openPaneContextMenu = (evt: MouseEvent, scope: 'local' | 'remote') => {
  openContextMenu(evt, null, scope)
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

const handleContextTransfer = async () => {
  const { item, scope } = contextMenu.value
  if (!item) return
  closeContextMenu()
  
  if (scope === 'local') {
    // Upload
    await uploadLocalFiles([{ path: joinLocalPath(localPath.value, item.name), name: item.name, size: item.size } as any])
  } else {
    // Download
    await handleDownload(item)
  }
}

const inputDialog = ref({
  visible: false,
  title: '',
  value: '',
  resolve: null as ((value: string | null) => void) | null
})

const showInputDialog = (title: string, defaultValue: string = ''): Promise<string | null> => {
  return new Promise((resolve) => {
    inputDialog.value = {
      visible: true,
      title,
      value: defaultValue,
      resolve
    }
  })
}

const confirmDialog = ref({
  visible: false,
  title: '',
  message: '',
  confirmLabel: '',
  cancelLabel: '',
  resolve: null as ((value: boolean) => void) | null
})

const showConfirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    confirmDialog.value = {
      visible: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || sftpCopy.value.dialogs.confirm,
      cancelLabel: options.cancelLabel || sftpCopy.value.dialogs.cancel,
      resolve
    }
  })
}

const handleInputConfirm = () => {
  if (inputDialog.value.resolve) {
    inputDialog.value.resolve(inputDialog.value.value)
  }
  inputDialog.value.visible = false
}

const handleInputCancel = () => {
  if (inputDialog.value.resolve) {
    inputDialog.value.resolve(null)
  }
  inputDialog.value.visible = false
}

const handleConfirmChoice = (accepted: boolean) => {
  if (confirmDialog.value.resolve) {
    confirmDialog.value.resolve(accepted)
  }
  confirmDialog.value.visible = false
}

const formatMode = (mode?: number) => {
  if (!mode) return '-'
  const type = (mode & 0o040000) ? 'd' : '-'
  const rwx = (m: number) => {
    let s = ''
    s += (m & 4) ? 'r' : '-'
    s += (m & 2) ? 'w' : '-'
    s += (m & 1) ? 'x' : '-'
    return s
  }
  const u = rwx((mode >> 6) & 7)
  const g = rwx((mode >> 3) & 7)
  const o = rwx(mode & 7)
  return `${type}${u}${g}${o} (${(mode & 0o777).toString(8)})`
}

const infoDialog = ref({
  visible: false,
  name: '',
  path: '',
  size: '',
  type: '',
  modified: '',
  permissions: ''
})

const handleInfo = () => {
  const { item, scope } = contextMenu.value
  if (!item) return
  closeContextMenu()

  const fullPath = scope === 'local'
    ? joinLocalPath(localPath.value, item.name)
    : joinPath(remotePath.value || '/', 'remote', item.name)

  infoDialog.value = {
    visible: true,
    name: item.name,
    path: fullPath,
    size: item.size,
    type: item.type,
    modified: item.modified,
    permissions: formatMode(item.permissions)
  }
}

const localListRef = ref<HTMLElement | null>(null)
const remoteListRef = ref<HTMLElement | null>(null)

const scrollToSelection = async (scope: 'local' | 'remote') => {
  await nextTick()
  const container = scope === 'local' ? localListRef.value : remoteListRef.value
  const name = scope === 'local' ? selectedLocal.value : selectedRemote.value
  
  if (!container || !name) return
  
  // Escape quotes for selector
  const safeName = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const element = container.querySelector(`[data-name="${safeName}"]`)
  if (element) {
    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

const createFolder = async (scope: 'local' | 'remote') => {
  const name = await showInputDialog(sftpCopy.value.dialogs.newFolderTitle, sftpCopy.value.contextMenu.newFolder)
  if (!name) return

  if (scope === 'local') {
    const path = joinLocalPath(localPath.value, name)
    const res = await window.electronAPI.fsCreateDir({ path })
    if (res.success) {
      await loadLocalDir(localPath.value)
      selectedLocal.value = name
      scrollToSelection('local')
    } else {
      localError.value = res.error
    }
  } else {
    const path = joinPath(remotePath.value || '/', 'remote', name)
    const res = await window.electronAPI.sftpCreateDir({ id: session.value?.id || '', path })
    if (res.success) {
      await loadRemoteDir(remotePath.value)
      selectedRemote.value = name
      scrollToSelection('remote')
    } else {
      remoteError.value = res.error
    }
  }
}

const handleCreateFolder = async () => {
  const { scope } = contextMenu.value
  closeContextMenu()
  await createFolder(scope)
}

const handleRename = async () => {
  const { item, scope } = contextMenu.value
  if (!item) return
  closeContextMenu()

  const newName = await showInputDialog(sftpCopy.value.dialogs.renameTitle, item.name)
  if (!newName || newName === item.name) return

  if (scope === 'local') {
    const oldPath = joinLocalPath(localPath.value, item.name)
    const newPath = joinLocalPath(localPath.value, newName)
    const res = await window.electronAPI.fsRename({ oldPath, newPath })
    if (res.success) {
      loadLocalDir(localPath.value)
    } else {
      localError.value = res.error
    }
  } else {
    const oldPath = joinPath(remotePath.value || '/', 'remote', item.name)
    const newPath = joinPath(remotePath.value || '/', 'remote', newName)
    const res = await window.electronAPI.sftpRename({ id: session.value?.id || '', oldPath, newPath })
    if (res.success) {
      loadRemoteDir(remotePath.value)
    } else {
      remoteError.value = res.error
    }
  }
}

const handleDelete = async () => {
  const { item, scope } = contextMenu.value
  if (!item) return
  closeContextMenu()

  const confirmText = formatMessage(sftpCopy.value.contextMenu.confirmDelete, { name: item.name })
  if (!confirm(confirmText)) return

  if (scope === 'local') {
    const path = joinLocalPath(localPath.value, item.name)
    const res = await window.electronAPI.fsDelete({ path })
    if (res.success) {
      loadLocalDir(localPath.value)
    } else {
      localError.value = res.error
    }
  } else {
    const path = joinPath(remotePath.value || '/', 'remote', item.name)
    const res = await window.electronAPI.sftpDelete({ id: session.value?.id || '', path })
    if (res.success) {
      loadRemoteDir(remotePath.value)
    } else {
      remoteError.value = res.error
    }
  }
}

const escapeRemotePath = (value: string) => value.replace(/(["`\\$])/g, '\\$1')

const handleOpenTerminalHere = () => {
  const { scope, item } = contextMenu.value
  closeContextMenu()

  if (scope === 'local') {
    const basePath = localPath.value
    if (!basePath || basePath === getLocalRoot()) {
      localError.value = sftpCopy.value.errors.localTerminalSelectDir
      return
    }
    const target = item ? joinLocalPath(basePath, item.name) : basePath
    const label = target.split(/[\\/]/).filter(Boolean).pop()
    sessionStore.addLocalSession({
      cwd: target,
      name: label ? `Local · ${label}` : undefined
    })
    return
  }

  if (!session.value?.savedHostId) {
    remoteError.value = sftpCopy.value.errors.remoteTerminalMissingHost
    return
  }

  const hostConfig = sessionStore.savedHosts.find(h => h.id === session.value?.savedHostId)
  if (!hostConfig) {
    remoteError.value = sftpCopy.value.errors.remoteTerminalMissingHost
    return
  }

  const baseRemote = remotePath.value && remotePath.value.trim().length ? remotePath.value : '/'
  const targetPath = item ? joinPath(baseRemote, 'remote', item.name) : baseRemote
  const command = `cd "${escapeRemotePath(targetPath)}"`
  sessionStore.addSession(hostConfig, {
    name: `${hostConfig.alias || hostConfig.host} · ${targetPath}`,
    initialCommand: command
  })
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
  loadLocalDir(localPath.value || undefined)
  const initialRemote = remotePath.value || '/'
  loadRemoteDir(initialRemote)

  if (window.electronAPI?.onTransferProgress) {
    window.electronAPI.onTransferProgress((payload: any) => {
      const { id, percent } = payload
      const item = transferQueue.value.find(t => t.id === id)
      if (item) {
        item.progress = percent
      }
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})

watch(() => session.value?.status, (status) => {
  if (status === 'connected') {
    const initialRemote = remotePath.value || '/'
    loadRemoteDir(initialRemote)
  }
})
</script>

<template>
  <div class="flex flex-col h-full space-y-3 text-white select-none">
    <div class="flex flex-wrap items-center justify-between px-4 py-3 rounded-lg border border-neon-blue/30 bg-cyber-light/40 shadow-neon-blue-inset">
      <div class="flex items-center space-x-3">
        <ArrowLeftRight class="text-neon-blue" size="18" />
        <div class="flex flex-col">
          <span class="text-[10px] uppercase text-cyber-text/60 tracking-widest">{{ sftpCopy.header.title }}</span>
          <span class="text-sm font-bold tracking-wide">{{ connectionLabel }}</span>
          <span class="text-[10px] text-cyber-text/50">{{ sftpCopy.header.instruction }}</span>
        </div>
      </div>
      <div class="flex items-center space-x-2 text-[10px] font-bold uppercase">
        <span class="px-3 py-1 rounded-full border border-neon-blue/40 text-neon-blue bg-neon-blue/10">{{ sftpCopy.badges.ready }}</span>
        <span class="px-3 py-1 rounded-full border border-cyber-text/30 text-cyber-text/80 bg-cyber-black/40">{{ session?.name || sftpCopy.badges.fallback }}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
      <div class="flex flex-col bg-cyber-light/30 border border-neon-blue/20 rounded-lg overflow-hidden backdrop-blur relative"
           @dragover.prevent.stop="handleLocalDragOver"
           @dragleave.prevent.stop="handleLocalDragLeave"
           @drop.prevent.stop="handleLocalDrop">
        <div v-if="isLocalDragHover"
             class="absolute inset-0 drag-active border-2 border-dashed border-neon-blue flex items-center justify-center text-neon-blue text-sm font-bold z-50 pointer-events-none backdrop-blur-sm">
          <div class="scanline" style="background: #00f3ff; box-shadow: 0 0 10px #00f3ff;"></div>
          <div class="flex flex-col items-center space-y-2">
            <Download :size="32" class="animate-bounce" />
            <span>{{ sftpCopy.drag.releaseDownload }}</span>
          </div>
        </div>
        <div class="px-4 py-3 flex items-center justify-between border-b border-neon-blue/10 bg-cyber-light/40">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded bg-neon-blue/10 border border-neon-blue/40 flex items-center justify-center">
              <HardDrive :size="16" class="text-neon-blue" />
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-bold tracking-wider text-neon-blue">{{ sftpCopy.panes.localTitle }}</span>
              <div class="flex flex-wrap items-center text-[11px] text-cyber-text/60 space-x-1">
                <button 
                  v-for="(crumb, idx) in localBreadcrumbs" 
                  :key="crumb + idx"
                  class="hover:text-neon-blue transition-colors"
                  @click.stop="jumpToCrumb('local', idx)"
                >
                  {{ crumb }}<span v-if="idx < localBreadcrumbs.length - 1" class="mx-1 text-cyber-text/30">/</span>
                </button>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button @click.stop="navigateUp('local')" class="icon-button" :title="sftpCopy.tooltips.goUp">
              <ArrowUp size="14" />
            </button>
            <button @click.stop="refreshPane('local')" class="icon-button" :title="sftpCopy.tooltips.refresh">
              <RefreshCcw size="14" />
            </button>
            <button @click.stop="createFolder('local')" class="icon-button" :title="sftpCopy.tooltips.newFolder">
              <FolderPlus size="14" />
            </button>
          </div>
        </div>

        <div class="px-4 py-2 flex items-center space-x-2 border-b border-neon-blue/10 bg-cyber-black/40">
          <div class="relative flex-1">
            <Search size="14" class="absolute left-2 top-2 text-cyber-text/40" />
            <input 
              v-model="searchLocal"
              type="text" 
              :placeholder="sftpCopy.placeholders.filterLocal"
              class="w-full pl-7 pr-3 py-1.5 bg-cyber-black/60 border border-cyber-text/20 rounded text-xs text-cyber-text focus:outline-none focus:border-neon-blue focus:shadow-neon-blue-inset select-text"
            />
          </div>
          <span class="text-[10px] text-cyber-text/60">{{ sftpCopy.selectedLabel }}: {{ selectedLocal || '-' }}</span>
        </div>

        <div v-if="localError" class="px-4 py-1 text-[10px] text-red-400 bg-red-900/20 border-b border-red-700/40 flex justify-between items-center">
          <span>{{ localError }}</span>
          <button @click="localError = ''" class="hover:text-red-200"><X size="12" /></button>
        </div>

        <div 
          ref="localListRef"
          class="flex-1 overflow-y-auto divide-y divide-cyber-text/10 relative"
          @contextmenu.prevent="openPaneContextMenu($event, 'local')"
        >
          <div 
            v-for="item in filteredLocalFiles" 
            :key="item.name"
            :data-name="item.name"
            draggable="true"
            @dragstart="handleLocalDragStart($event, item)"
            @click="setSelection('local', item.name)"
            @dblclick.stop="enterItem('local', item)"
            @contextmenu.prevent.stop="openContextMenu($event, item, 'local')"
            class="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors"
            :class="selectedLocal === item.name ? 'bg-neon-blue/10 border-l-2 border-neon-blue' : 'hover:bg-cyber-black/40'"
          >
            <div class="flex items-center space-x-3">
              <component :is="item.type === 'dir' ? Folder : File" size="16" class="text-cyber-text/60" />
              <div>
                <div class="text-sm font-medium">{{ item.name }}</div>
                <div class="text-[10px] text-cyber-text/60">{{ item.modified }}</div>
              </div>
            </div>
            <div class="text-right text-[10px] text-cyber-text/60">
              <div class="font-mono">{{ item.size }}</div>
              <span v-if="item.badge" class="px-2 py-0.5 rounded-full bg-cyber-black/60 text-neon-pink border border-neon-pink/40 text-[9px] uppercase">{{ item.badge }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col bg-cyber-light/30 border border-neon-blue/20 rounded-lg overflow-hidden backdrop-blur relative"
           @dragover.prevent.stop="handleRemoteDragOver"
           @dragleave.prevent.stop="handleRemoteDragLeave"
           @drop.prevent.stop="handleRemoteDrop">
        <div v-if="isRemoteDragHover"
             class="absolute inset-0 drag-active border-2 border-dashed border-neon-pink flex items-center justify-center text-neon-pink text-sm font-bold z-50 pointer-events-none backdrop-blur-sm">
          <div class="scanline"></div>
          <div class="flex flex-col items-center space-y-2">
            <Upload :size="32" class="animate-bounce" />
            <span>{{ sftpCopy.drag.releaseUpload }}</span>
          </div>
        </div>
        <div class="px-4 py-3 flex items-center justify-between border-b border-neon-blue/10 bg-cyber-light/40">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded bg-neon-pink/10 border border-neon-pink/40 flex items-center justify-center">
              <Server size="16" class="text-neon-pink" />
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-bold tracking-wider text-neon-pink">{{ sftpCopy.panes.remoteTitle }}</span>
              <div class="flex flex-wrap items-center text-[11px] text-cyber-text/60 space-x-1">
                <button 
                  class="hover:text-neon-pink transition-colors"
                  @click.stop="loadRemoteDir('/')"
                >/</button>
                <template v-for="(crumb, idx) in remoteBreadcrumbs" :key="crumb + idx">
                  <span class="mx-1 text-cyber-text/30">/</span>
                  <button 
                    class="hover:text-neon-pink transition-colors"
                    @click.stop="jumpToCrumb('remote', idx)"
                  >
                    {{ crumb }}
                  </button>
                </template>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button @click.stop="navigateUp('remote')" class="icon-button" :title="sftpCopy.tooltips.goUp">
              <ArrowUp size="14" />
            </button>
            <button @click.stop="refreshPane('remote')" class="icon-button" :title="sftpCopy.tooltips.refresh">
              <RefreshCcw size="14" />
            </button>
            <button @click.stop="createFolder('remote')" class="icon-button" :title="sftpCopy.tooltips.newFolder">
              <FolderPlus size="14" />
            </button>
            <button class="icon-button" :title="sftpCopy.tooltips.download">
              <Download size="14" />
            </button>
            <button class="icon-button" :title="sftpCopy.tooltips.upload">
              <Upload size="14" />
            </button>
          </div>
        </div>

        <div class="px-4 py-2 flex items-center space-x-2 border-b border-neon-blue/10 bg-cyber-black/40">
          <div class="relative flex-1">
            <Search size="14" class="absolute left-2 top-2 text-cyber-text/40" />
            <input 
              v-model="searchRemote"
              type="text" 
              :placeholder="sftpCopy.placeholders.filterRemote" 
              class="w-full pl-7 pr-3 py-1.5 bg-cyber-black/60 border border-cyber-text/20 rounded text-xs text-cyber-text focus:outline-none focus:border-neon-pink focus:shadow-neon-pink-inset select-text"
            />
          </div>
          <span class="text-[10px] text-cyber-text/60">{{ sftpCopy.selectedLabel }}: {{ selectedRemote || '-' }}</span>
        </div>

        <div v-if="remoteError" class="px-4 py-1 text-[10px] text-red-400 bg-red-900/20 border-b border-red-700/40 flex justify-between items-center">
          <span>{{ remoteError }}</span>
          <button @click="remoteError = ''" class="hover:text-red-200"><X size="12" /></button>
        </div>

        <div 
          ref="remoteListRef"
          class="flex-1 overflow-y-auto divide-y divide-cyber-text/10 relative"
          @contextmenu.prevent="openPaneContextMenu($event, 'remote')"
        >
          <div 
            v-if="filteredRemoteFiles.length === 0" 
            class="px-4 py-6 text-center text-cyber-text/50 text-xs"
          >
            {{ sftpCopy.emptyStates.remoteList }}
          </div>
          <div 
            v-for="item in filteredRemoteFiles" 
            :key="item.name"
            :data-name="item.name"
            draggable="true"
            @dragstart="handleRemoteDragStart($event, item)"
            @click="setSelection('remote', item.name)"
            @dblclick.stop="enterItem('remote', item)"
            @contextmenu.prevent.stop="openContextMenu($event, item, 'remote')"
            class="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors"
            :class="selectedRemote === item.name ? 'bg-neon-pink/10 border-l-2 border-neon-pink' : 'hover:bg-cyber-black/40'"
          >
            <div class="flex items-center space-x-3">
              <component :is="item.type === 'dir' ? Folder : File" size="16" class="text-cyber-text/60" />
              <div>
                <div class="text-sm font-medium">{{ item.name }}</div>
                <div class="text-[10px] text-cyber-text/60">{{ item.modified }}</div>
              </div>
            </div>
            <div class="text-right text-[10px] text-cyber-text/60">
              <div class="font-mono">{{ item.size }}</div>
              <span v-if="item.badge" class="px-2 py-0.5 rounded-full bg-cyber-black/60 text-neon-pink border border-neon-pink/40 text-[9px] uppercase">{{ item.badge }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-neon-blue/20 bg-cyber-light/20 p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2">
          <ArrowLeftRight size="14" class="text-neon-blue" />
          <span class="text-xs font-bold tracking-wider text-cyber-text-bright">{{ sftpCopy.transfer.title }}</span>
        </div>
        <span class="text-[10px] text-cyber-text/60">{{ sftpCopy.notices.transferHint }}</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div 
          v-for="item in transferQueue" 
          :key="item.id"
          class="p-3 rounded border border-cyber-text/20 bg-cyber-black/50 flex items-center justify-between"
        >
          <div class="flex flex-col w-full">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium">{{ item.name }}</span>
              <div class="flex items-center space-x-2">
                <span :class="['text-[10px] font-bold uppercase', statusTone(item.status)]">
                  {{ transferStatusLabel(item.status) }}
                </span>
                <button 
                  v-if="item.status === 'active'"
                  @click="cancelTransfer(item)"
                  class="text-cyber-text/60 hover:text-neon-pink transition-colors"
                  :title="sftpCopy.transfer.cancelTooltip"
                >
                  <X size="14" />
                </button>
                <button 
                  v-else
                  @click="removeTransfer(item.id)"
                  class="text-cyber-text/60 hover:text-red-400 transition-colors"
                  :title="sftpCopy.transfer.removeTooltip"
                >
                  <Trash2 size="14" />
                </button>
              </div>
            </div>
            <div class="flex justify-between items-center mt-1">
              <span class="text-[10px] text-cyber-text/60">{{ item.direction === 'upload' ? sftpCopy.transfer.uploadLabel : sftpCopy.transfer.downloadLabel }} • {{ item.size }}</span>
              <span v-if="item.error" class="text-[10px] text-neon-pink truncate max-w-[150px]">{{ item.error }}</span>
            </div>
            <div v-if="item.status === 'active'" class="w-full h-1 bg-cyber-black/60 rounded-full mt-2 overflow-hidden">
              <div 
                class="h-full bg-neon-blue transition-all duration-300 ease-out"
                :style="{ width: `${item.progress || 0}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Context Menu -->
    <div v-if="contextMenu.visible" 
         class="fixed z-50 bg-cyber-black border border-neon-blue/40 rounded shadow-lg py-1 min-w-[150px] backdrop-blur-md text-sm"
         :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }">
      <div class="px-3 py-2 border-b border-cyber-text/10 text-cyber-text/50 text-xs font-bold uppercase tracking-wider">
        {{ contextMenuTitle }}
      </div>
      <button v-if="contextMenu.item" @click.stop="handleContextTransfer" class="w-full text-left px-4 py-2 hover:bg-neon-blue/20 hover:text-neon-blue flex items-center space-x-2">
        <component :is="contextMenu.scope === 'local' ? Upload : Download" size="14" />
        <span>{{ contextMenu.scope === 'local' ? sftpCopy.contextMenu.upload : sftpCopy.contextMenu.download }}</span>
      </button>
      <button @click.stop="handleCreateFolder" class="w-full text-left px-4 py-2 hover:bg-neon-blue/20 hover:text-neon-blue flex items-center space-x-2">
        <FolderPlus size="14" />
        <span>{{ sftpCopy.contextMenu.newFolder }}</span>
      </button>
      <button v-if="contextMenu.item" @click.stop="handleRename" class="w-full text-left px-4 py-2 hover:bg-neon-blue/20 hover:text-neon-blue flex items-center space-x-2">
        <Edit size="14" />
        <span>{{ sftpCopy.contextMenu.rename }}</span>
      </button>
      <button 
        v-if="!contextMenu.item || contextMenu.item.type === 'dir'"
        @click.stop="handleOpenTerminalHere" 
        class="w-full text-left px-4 py-2 hover:bg-neon-blue/20 hover:text-neon-blue flex items-center space-x-2">
        <TerminalSquare size="14" />
        <span>{{ contextMenu.item ? sftpCopy.contextMenu.openTerminal : sftpCopy.contextMenu.openTerminalHere }}</span>
      </button>
      <button v-if="contextMenu.item" @click.stop="handleInfo" class="w-full text-left px-4 py-2 hover:bg-neon-blue/20 hover:text-neon-blue flex items-center space-x-2">
        <Info size="14" />
        <span>{{ sftpCopy.contextMenu.properties }}</span>
      </button>
      <button v-if="contextMenu.item" @click.stop="handleDelete" class="w-full text-left px-4 py-2 hover:bg-red-900/30 hover:text-red-400 flex items-center space-x-2 text-red-400/80">
        <Trash2 size="14" />
        <span>{{ sftpCopy.contextMenu.delete }}</span>
      </button>
    </div>

    <!-- Input Dialog -->
    <div v-if="inputDialog.visible" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-cyber-black border border-neon-blue/40 rounded-lg shadow-lg p-4 w-[300px] space-y-4">
        <h3 class="text-sm font-bold text-neon-blue">{{ inputDialog.title }}</h3>
        <input 
          v-model="inputDialog.value"
          @keyup.enter="handleInputConfirm"
          @keyup.esc="handleInputCancel"
          type="text" 
          class="w-full px-3 py-2 bg-cyber-black/60 border border-cyber-text/20 rounded text-xs text-cyber-text focus:outline-none focus:border-neon-blue focus:shadow-neon-blue-inset"
          autofocus
        />
        <div class="flex justify-end space-x-2">
          <button @click="handleInputCancel" class="px-3 py-1 text-xs text-cyber-text/60 hover:text-cyber-text transition-colors">{{ sftpCopy.dialogs.cancel }}</button>
          <button @click="handleInputConfirm" class="px-3 py-1 text-xs bg-neon-blue/10 text-neon-blue border border-neon-blue/40 rounded hover:bg-neon-blue/20 transition-colors">{{ sftpCopy.dialogs.confirm }}</button>
        </div>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <div v-if="confirmDialog.visible" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="bg-cyber-black border border-neon-blue/40 rounded-lg shadow-lg p-5 w-[340px] space-y-4">
        <h3 class="text-sm font-bold text-neon-blue">{{ confirmDialog.title }}</h3>
        <p class="text-xs text-cyber-text/80 leading-relaxed">{{ confirmDialog.message }}</p>
        <div class="flex justify-end space-x-2">
          <button @click="handleConfirmChoice(false)" class="px-3 py-1 text-xs text-cyber-text/60 hover:text-cyber-text transition-colors">
            {{ confirmDialog.cancelLabel }}
          </button>
          <button @click="handleConfirmChoice(true)" class="px-3 py-1 text-xs bg-neon-blue/10 text-neon-blue border border-neon-blue/40 rounded hover:bg-neon-blue/20 transition-colors">
            {{ confirmDialog.confirmLabel }}
          </button>
        </div>
      </div>
    </div>

    <!-- Info Dialog -->
    <div v-if="infoDialog.visible" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-cyber-black border border-neon-blue/40 rounded-lg shadow-lg p-4 w-[350px] space-y-4">
        <div class="flex justify-between items-center border-b border-cyber-text/10 pb-2">
          <h3 class="text-sm font-bold text-neon-blue flex items-center space-x-2">
            <Info size="14" />
            <span>{{ sftpCopy.dialogs.infoTitle }}</span>
          </h3>
          <button @click="infoDialog.visible = false" class="text-cyber-text/60 hover:text-cyber-text">
            <X size="14" />
          </button>
        </div>
        <div class="space-y-3 text-xs">
          <div class="flex flex-col space-y-1">
            <span class="text-cyber-text/50 uppercase text-[10px] tracking-wider">{{ sftpCopy.dialogs.infoName }}</span>
            <span class="text-cyber-text select-text">{{ infoDialog.name }}</span>
          </div>
          <div class="flex flex-col space-y-1">
            <span class="text-cyber-text/50 uppercase text-[10px] tracking-wider">{{ sftpCopy.dialogs.infoLocation }}</span>
            <div class="p-2 bg-cyber-black/40 rounded border border-cyber-text/10 break-all font-mono select-text">
              {{ infoDialog.path }}
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col space-y-1">
              <span class="text-cyber-text/50 uppercase text-[10px] tracking-wider">{{ sftpCopy.dialogs.infoType }}</span>
              <span class="text-cyber-text capitalize">{{ infoDialog.type === 'dir' ? sftpCopy.dialogs.infoFolder : sftpCopy.dialogs.infoFile }}</span>
            </div>
            <div class="flex flex-col space-y-1">
              <span class="text-cyber-text/50 uppercase text-[10px] tracking-wider">{{ sftpCopy.dialogs.infoSize }}</span>
              <span class="text-cyber-text font-mono">{{ infoDialog.size }}</span>
            </div>
          </div>
          <div class="flex flex-col space-y-1">
            <span class="text-cyber-text/50 uppercase text-[10px] tracking-wider">{{ sftpCopy.dialogs.infoModified }}</span>
            <span class="text-cyber-text">{{ infoDialog.modified }}</span>
          </div>
          <div class="flex flex-col space-y-1">
            <span class="text-cyber-text/50 uppercase text-[10px] tracking-wider">{{ sftpCopy.dialogs.infoPermissions }}</span>
            <span class="text-cyber-text font-mono">{{ infoDialog.permissions }}</span>
          </div>
        </div>
        <div class="flex justify-end pt-2">
          <button @click="infoDialog.visible = false" class="px-4 py-1.5 text-xs bg-neon-blue/10 text-neon-blue border border-neon-blue/40 rounded hover:bg-neon-blue/20 transition-colors">
            {{ sftpCopy.dialogs.infoClose }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-button {
  @apply w-8 h-8 flex items-center justify-center rounded border border-cyber-text/20 text-cyber-text/70 hover:text-neon-blue hover:border-neon-blue/60 transition-colors bg-cyber-black/40;
}

@keyframes pulse-border {
  0% { border-color: rgba(255, 0, 255, 0.4); box-shadow: 0 0 10px rgba(255, 0, 255, 0.1) inset; }
  50% { border-color: rgba(255, 0, 255, 1); box-shadow: 0 0 20px rgba(255, 0, 255, 0.3) inset; }
  100% { border-color: rgba(255, 0, 255, 0.4); box-shadow: 0 0 10px rgba(255, 0, 255, 0.1) inset; }
}

.drag-active {
  animation: pulse-border 1.5s infinite;
  background: rgba(255, 0, 255, 0.05);
}

.scanline {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: #ff00ff;
  opacity: 0.5;
  animation: scan 2s linear infinite;
  box-shadow: 0 0 10px #ff00ff;
  pointer-events: none;
}

@keyframes scan {
  0% { top: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
</style>
