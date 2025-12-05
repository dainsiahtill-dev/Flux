import type { LanguageCode } from '../types/i18n'

type LanguageOption = {
  label: string
  description: string
}

type StringRecord = Record<string, string>

type TranslationShape = {
  settings: {
    headerTagline: string
    headerTitle: string
    sectionLabel: string
    sectionTitle: string
    languageActive: string
    languageIdle: string
    openSettings: string
    languageOptions: Record<LanguageCode, LanguageOption>
  }
  titleBar: {
    openSettings: string
    tooltip: string
  }
  sidebar: {
    brand: string
    hosts: string
    keychain: string
    ports: string
    systemOnline: string
    newHost: string
  }
  topTabs: {
    newHostTooltip: string
    sftpBadge: string
  }
  windowControls: {
    minimize: string
    maximize: string
    restore: string
    close: string
  }
  commandPalette: {
    badge: string
    placeholder: string
    connecting: string
  }
  appShell: {
    underConstruction: string
    moduleFallback: string
  }
  terminal: {
    emptyTitle: string
    emptySubtitle: string
  }
  connectionOverlay: {
    titlePrefix: string
    targetLabel: string
    statuses: StringRecord
    inputs: StringRecord
    steps: StringRecord
    footer: StringRecord
    logs: StringRecord
    messages: StringRecord
  }
  hostDetail: {
    titles: StringRecord
    subtitles: StringRecord
    badges: StringRecord
    labels: StringRecord
    placeholders: StringRecord
    authTabs: StringRecord
    selectPlaceholder: string
    buttons: StringRecord
    tooltips: StringRecord
  }
  keyDetail: {
    title: string
    labels: StringRecord
    placeholders: StringRecord
    info: StringRecord
    buttons: StringRecord
    states: StringRecord
  }
  hostsManager: {
    title: string
    quickAccessLabel: string
    quickAccessHint: string
    quickAccessDescription: string
    savedTitle: string
    searchPlaceholder: string
    actions: StringRecord
  }
  keychainManager: {
    title: string
    addButton: string
    formTitle: string
    labels: StringRecord
    placeholders: StringRecord
    buttons: StringRecord
    confirmDelete: string
    emptyState: string
    actionsLabel: string
    tooltips: StringRecord
  }
  tunnels: {
    title: string
    subtitle: string
    savedTitle: string
    activeTitle: string
    formTitle: string
    labels: StringRecord
    placeholders: StringRecord
    types: StringRecord
    actions: StringRecord
    hints: StringRecord
    portCheck: StringRecord
    traffic: StringRecord
  }
  sftp: {
    header: StringRecord
    badges: StringRecord
    panes: StringRecord
    placeholders: StringRecord
    selectedLabel: string
    drag: StringRecord
    tooltips: StringRecord
    emptyStates: StringRecord
    notices: StringRecord
    transfer: {
      title: string
      uploadLabel: string
      downloadLabel: string
      cancelTooltip: string
      removeTooltip: string
      statuses: StringRecord
    }
    contextMenu: StringRecord
    dialogs: StringRecord
    errors: StringRecord
  }
}

const enTranslation: TranslationShape = {
  settings: {
    headerTagline: 'Flux control',
    headerTitle: 'Settings',
    sectionLabel: 'Language matrix',
    sectionTitle: 'Signal Pack',
    languageActive: 'ENGAGED',
    languageIdle: 'ARM',
    openSettings: 'Settings',
    languageOptions: {
      en: { label: 'English', description: 'Interface in English' },
      zh: { label: '中文', description: 'Switch interface to Chinese' }
    }
  },
  titleBar: {
    openSettings: 'Settings',
    tooltip: 'Settings'
  },
  sidebar: {
    brand: 'CYBER.TERM',
    hosts: 'Hosts List',
    keychain: 'Security Keys',
    ports: 'Tunnels & Ports',
    systemOnline: 'System Online',
    newHost: 'New Host'
  },
  topTabs: {
    newHostTooltip: 'New Host',
    sftpBadge: 'SFTP'
  },
  windowControls: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close'
  },
  commandPalette: {
    badge: 'SYSTEM_OVERRIDE // CONNECT_PROTOCOL',
    placeholder: 'Target Identification...',
    connecting: 'CONNECTING...'
  },
  appShell: {
    underConstruction: 'MODULE_UNDER_CONSTRUCTION...',
    moduleFallback: 'module_not_loaded...'
  },
  terminal: {
    emptyTitle: 'AWAITING INPUT SIGNAL...',
    emptySubtitle: 'Select a host node to initiate connection sequence.'
  },
  connectionOverlay: {
    titlePrefix: 'System Link // ',
    targetLabel: 'TARGET',
    statuses: {
      accessGranted: 'ACCESS GRANTED',
      connectionFailed: 'CONNECTION FAILED',
      userIdRequired: 'USER ID REQUIRED',
      authRequired: 'AUTH REQUIRED',
      keyLocked: 'KEY LOCKED',
      verifying: 'VERIFYING...',
      establishing: 'ESTABLISHING UPLINK...'
    },
    inputs: {
      usernamePlaceholder: 'ENTER_USERNAME...',
      passwordPlaceholder: 'ENTER_PASSWORD...',
      passphrasePlaceholder: 'ENTER_PASSPHRASE...',
      identityLabel: 'Identity Required',
      securityLabel: 'Security Token Required',
      passphraseLabel: 'Key Passphrase Required',
      proceed: 'PROCEED',
      unlock: 'UNLOCK KEY',
      authenticate: 'AUTHENTICATE'
    },
    steps: {
      network: 'NET',
      auth: 'AUTH',
      terminal: 'TERM'
    },
    footer: {
      closeError: 'CLOSE CONNECTION',
      abort: 'ABORT SEQUENCE'
    },
    logs: {
      terminated: '_ Process Terminated.',
      waiting: '_'
    },
    messages: {
      updatingIdentity: 'Updating identity protocols...',
      verifyingToken: 'Verifying security token...'
    }
  },
  hostDetail: {
    titles: {
      edit: 'Host Details',
      create: 'New Host Node'
    },
    subtitles: {
      edit: 'Configuration Protocol',
      create: 'Initialization Sequence'
    },
    badges: {
      protocol: 'SSH V2'
    },
    labels: {
      alias: 'Alias / Name',
      group: 'Group Tag',
      host: 'Hostname / IP',
      user: 'Username',
      port: 'Port',
      authMethod: 'Authentication Method',
      selectKey: 'Select from Keychain',
      manualKey: 'Private Key Path',
      manualKeyAlt: 'Or Manual Path',
      secret: 'Password (Optional)',
      passphrase: 'Passphrase (Optional)',
      nativeSsh: 'Use Native OpenSSH',
      nativeSshHint: 'Use system SSH binary (Better compatibility)'
    },
    placeholders: {
      alias: 'e.g. Production DB',
      group: 'Default',
      host: '192.168.x.x',
      user: 'root',
      port: '22',
      keyPath: 'e.g. C:/Users/name/.ssh/id_rsa',
      secret: 'Leave empty to ask on connect'
    },
    authTabs: {
      password: 'Password',
      privateKey: 'Private Key'
    },
    selectPlaceholder: '-- Select a Key --',
    buttons: {
      ssh: 'SSH Terminal',
      sftp: 'SFTP Browser',
      saveConfig: 'SAVE CONFIGURATION',
      delete: 'DELETE HOST'
    },
    tooltips: {
      browse: 'Browse File'
    }
  },
  keyDetail: {
    title: 'Edit Key',
    labels: {
      alias: 'Label *',
      privateKey: 'Private key *',
      publicKey: 'Public key',
      actions: 'Actions'
    },
    placeholders: {
      privateKey: 'Auto-generated from private key (Coming soon)'
    },
    info: {
      path: 'Path',
      unsaved: 'Unsaved Changes'
    },
    buttons: {
      copy: 'Copy',
      save: 'SAVE & UPDATE',
      saving: 'SAVING...'
    },
    states: {
      loading: 'Loading key content...',
      readError: 'Error: Unable to read file.',
      apiError: 'Error: API not ready.',
      writeFailed: 'Failed to write file to disk.'
    }
  },
  hostsManager: {
    title: 'Connection Center',
    quickAccessLabel: 'Quick Access',
    quickAccessHint: 'Local Shell',
    quickAccessDescription: 'PowerShell / CMD',
    savedTitle: 'Saved Hosts',
    searchPlaceholder: 'Search nodes...',
    actions: {
      ssh: 'SSH',
      sftp: 'SFTP'
    }
  },
  keychainManager: {
    title: 'Security Keychain',
    addButton: 'ADD KEY',
    formTitle: 'New Key Identity',
    labels: {
      alias: 'Key Alias',
      path: 'Local Path'
    },
    placeholders: {
      alias: 'e.g. AWS Root',
      path: 'C:/Users/.ssh/id_rsa',
      autoAlias: 'Imported Key'
    },
    buttons: {
      save: 'SAVE',
      cancel: 'CANCEL'
    },
    confirmDelete: 'Remove this key reference?',
    emptyState: 'NO KEYS FOUND IN SECURE STORAGE',
    actionsLabel: 'Actions',
    tooltips: {
      remove: 'Remove from keychain'
    }
  },
  tunnels: {
    title: 'Tunnel Control',
    subtitle: 'Forwarding Matrix',
    savedTitle: 'Saved Rules',
    activeTitle: 'Active Tunnels',
    formTitle: 'Tunnel Composer',
    labels: {
      name: 'Rule Name',
      description: 'Description',
      host: 'SSH Host',
      type: 'Mode',
      bind: 'Bind Address',
      remoteBind: 'Remote Bind',
      target: 'Target',
      session: 'Bind Session',
      unnamed: 'Untitled Route'
    },
    placeholders: {
      name: 'e.g. Local DB',
      description: 'Purpose / note',
      host: 'Pick a host',
      bindHost: '127.0.0.1',
      bindPort: '8080',
      targetHost: '127.0.0.1',
      targetPort: '22',
      session: 'Optional: reuse active SSH session'
    },
    types: {
      l: 'Local',
      r: 'Remote',
      d: 'Dynamic'
    },
    actions: {
      refresh: 'Refresh',
      new: 'New Rule',
      routes: 'routes',
      quickStart: 'Quick start',
      start: 'Start',
      stop: 'Stop',
      checkPort: 'Check',
      save: 'Save',
      saving: 'Saving...',
      delete: 'Delete'
    },
    hints: {
      saved: 'Reusable port forwarding templates',
      empty: 'No saved tunnels yet',
      live: 'Real-time traffic and state',
      noActive: 'No active tunnels',
      bind: 'Bind to a host/session to reuse credentials',
      selectHost: 'Pick a host before launching',
      unknownHost: 'Unknown host',
      startFailed: 'Failed to start tunnel'
    },
    portCheck: {
      ok: 'Port looks free',
      error: 'Port is not available'
    },
    traffic: {
      up: 'Up',
      down: 'Down',
      since: 'Since'
    }
  },
  sftp: {
    header: {
      title: 'File Bridge',
      instruction: 'Double-click folder to enter; double-click file to transfer',
      connectionFallback: 'SFTP Session'
    },
    badges: {
      ready: 'SFTP Ready',
      fallback: 'Active session'
    },
    panes: {
      localTitle: 'Local Files',
      remoteTitle: 'Remote Files',
      localRoot: 'This PC',
      localContext: 'Local Directory',
      remoteContext: 'Remote Directory'
    },
    placeholders: {
      filterLocal: 'Filter local files...',
      filterRemote: 'Filter remote files...'
    },
    selectedLabel: 'Selected',
    drag: {
      releaseDownload: 'Release to download',
      releaseUpload: 'Release to upload'
    },
    tooltips: {
      goUp: 'Go up',
      refresh: 'Refresh',
      newFolder: 'New Folder',
      download: 'Download from remote',
      upload: 'Upload to remote'
    },
    emptyStates: {
      remoteList: 'Remote listing not wired yet. Use SFTP backend hook to populate.'
    },
    notices: {
      transferHint: 'Drag local files into Remote pane to upload'
    },
    transfer: {
      title: 'Transfer Queue',
      uploadLabel: 'Upload',
      downloadLabel: 'Download',
      cancelTooltip: 'Cancel Transfer',
      removeTooltip: 'Remove from list',
      statuses: {
        queued: 'QUEUED',
        active: 'ACTIVE',
        done: 'COMPLETED',
        error: 'FAILED'
      }
    },
    contextMenu: {
      upload: 'Upload',
      download: 'Download',
      newFolder: 'New Folder',
      rename: 'Rename',
      openTerminal: 'Enter terminal',
      openTerminalHere: 'Open terminal in current directory',
      properties: 'Properties',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete "{name}"? This cannot be undone.'
    },
    dialogs: {
      newFolderTitle: 'New Folder Name:',
      renameTitle: 'Rename to:',
      cancel: 'Cancel',
      confirm: 'Confirm',
      overwriteTitle: 'Overwrite File?',
      overwriteMessage: 'A file named "{name}" already exists here. Overwrite it?',
      overwriteConfirm: 'Overwrite',
      overwriteSkip: 'Skip',
      infoTitle: 'File Properties',
      infoName: 'Name',
      infoLocation: 'Location',
      infoType: 'Type',
      infoFolder: 'Folder',
      infoFile: 'File',
      infoSize: 'Size',
      infoModified: 'Modified',
      infoPermissions: 'Permissions',
      infoClose: 'Close'
    },
    errors: {
      readDirUnavailable: 'Local explorer unavailable. Please expose readDir in preload.',
      sftpNotConnected: 'SFTP not connected, please wait...',
      sftpApiMissing: 'Remote explorer unavailable. Please expose sftpReadDir.',
      directoryUploadUnsupported: 'Directory upload not supported: {name}',
      directoryDownloadUnsupported: 'Directory download not supported: {name}',
      localTerminalSelectDir: 'Select a concrete local directory before opening a terminal.',
      remoteTerminalMissingHost: 'Unable to locate the associated host. Terminal launch is unavailable.',
      cancelTransfer: 'Cancelled by user'
    }
  }
}

const zhTranslation: TranslationShape = {
  settings: {
    headerTagline: 'Flux 控制台',
    headerTitle: '设置中心',
    sectionLabel: '语言矩阵',
    sectionTitle: '信号包',
    languageActive: '已启用',
    languageIdle: '待命',
    openSettings: '设置',
    languageOptions: {
      en: { label: 'English', description: '界面切换至英文' },
      zh: { label: '中文', description: '界面切换至中文' }
    }
  },
  titleBar: {
    openSettings: '设置',
    tooltip: '打开设置'
  },
  sidebar: {
    brand: 'CYBER.TERM',
    hosts: '主机列表',
    keychain: '密钥管理',
    ports: '端口与隧道',
    systemOnline: '系统在线',
    newHost: '新建主机'
  },
  topTabs: {
    newHostTooltip: '新建主机',
    sftpBadge: 'SFTP'
  },
  windowControls: {
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原',
    close: '关闭'
  },
  commandPalette: {
    badge: '系统覆盖 // 连接协议',
    placeholder: '输入目标标识...',
    connecting: '正在连接...'
  },
  appShell: {
    underConstruction: '模块建设中...',
    moduleFallback: 'module_not_loaded...'
  },
  terminal: {
    emptyTitle: '等待输入信号...',
    emptySubtitle: '选择一个主机节点以开始连接流程。'
  },
  connectionOverlay: {
    titlePrefix: '系统链路 // ',
    targetLabel: '目标',
    statuses: {
      accessGranted: '连接已建立',
      connectionFailed: '连接失败',
      userIdRequired: '需要用户名',
      authRequired: '需要验证',
      keyLocked: '密钥已锁定',
      verifying: '验证中...',
      establishing: '建立链路...'
    },
    inputs: {
      usernamePlaceholder: '输入用户名...',
      passwordPlaceholder: '输入密码...',
      passphrasePlaceholder: '输入密钥口令...',
      identityLabel: '请填入身份信息',
      securityLabel: '请提供安全口令',
      passphraseLabel: '需要密钥口令',
      proceed: '继续',
      unlock: '解锁密钥',
      authenticate: '认证'
    },
    steps: {
      network: '链路',
      auth: '认证',
      terminal: '终端'
    },
    footer: {
      closeError: '关闭连接',
      abort: '中止流程'
    },
    logs: {
      terminated: '_ 进程已终止。',
      waiting: '_'
    },
    messages: {
      updatingIdentity: '正在更新身份协议...',
      verifyingToken: '正在验证安全令牌...'
    }
  },
  hostDetail: {
    titles: {
      edit: '主机详情',
      create: '新建主机'
    },
    subtitles: {
      edit: '配置协议',
      create: '初始化流程'
    },
    badges: {
      protocol: 'SSH V2'
    },
    labels: {
      alias: '别名 / 名称',
      group: '分组标签',
      host: '主机 / IP',
      user: '用户名',
      port: '端口',
      authMethod: '认证方式',
      selectKey: '从密钥库选择',
      manualKey: '私钥路径',
      manualKeyAlt: '或手动输入',
      secret: '密码（可选）',
      passphrase: '口令（可选）',
      nativeSsh: '使用系统 OpenSSH',
      nativeSshHint: '调用系统 SSH，可获得更好兼容性'
    },
    placeholders: {
      alias: '例如 Production DB',
      group: '默认分组',
      host: '192.168.x.x',
      user: 'root',
      port: '22',
      keyPath: '例如 C:/Users/name/.ssh/id_rsa',
      secret: '留空则连接时询问'
    },
    authTabs: {
      password: '密码',
      privateKey: '私钥'
    },
    selectPlaceholder: '-- 选择一个密钥 --',
    buttons: {
      ssh: '打开终端',
      sftp: 'SFTP 浏览',
      saveConfig: '保存配置',
      delete: '删除主机'
    },
    tooltips: {
      browse: '选择文件'
    }
  },
  keyDetail: {
    title: '编辑密钥',
    labels: {
      alias: '标签 *',
      privateKey: '私钥内容 *',
      publicKey: '公钥',
      actions: '操作'
    },
    placeholders: {
      privateKey: '将自动根据私钥生成（即将上线）'
    },
    info: {
      path: '路径',
      unsaved: '未保存的修改'
    },
    buttons: {
      copy: '复制',
      save: '保存并更新',
      saving: '保存中...'
    },
    states: {
      loading: '正在读取密钥内容...',
      readError: '错误：无法读取文件。',
      apiError: '错误：API 未就绪。',
      writeFailed: '写入磁盘失败。'
    }
  },
  hostsManager: {
    title: '连接控制台',
    quickAccessLabel: '快速入口',
    quickAccessHint: '本地终端',
    quickAccessDescription: 'PowerShell / CMD',
    savedTitle: '已保存主机',
    searchPlaceholder: '搜索节点...',
    actions: {
      ssh: 'SSH',
      sftp: 'SFTP'
    }
  },
  keychainManager: {
    title: '密钥管理',
    addButton: '添加密钥',
    formTitle: '新密钥身份',
    labels: {
      alias: '密钥别名',
      path: '本地路径'
    },
    placeholders: {
      alias: '例如 AWS Root',
      path: 'C:/Users/.ssh/id_rsa',
      autoAlias: '已导入密钥'
    },
    buttons: {
      save: '保存',
      cancel: '取消'
    },
    confirmDelete: '移除此密钥引用？',
    emptyState: '尚未在安全存储中发现密钥',
    actionsLabel: '操作',
    tooltips: {
      remove: '从密钥库移除'
    }
  },
  tunnels: {
    title: '转发控制台',
    subtitle: '隧道矩阵',
    savedTitle: '已保存规则',
    activeTitle: '活跃隧道',
    formTitle: '规则编辑器',
    labels: {
      name: '规则名称',
      description: '说明',
      host: '关联主机',
      type: '模式',
      bind: '绑定地址',
      remoteBind: '远端绑定',
      target: '目标地址',
      session: '绑定会话',
      unnamed: '未命名规则'
    },
    placeholders: {
      name: '例如 内网DB',
      description: '用途备注',
      host: '选择主机',
      bindHost: '127.0.0.1',
      bindPort: '8080',
      targetHost: '127.0.0.1',
      targetPort: '22',
      session: '可选：复用已连接会话'
    },
    types: {
      l: '本地转发',
      r: '远程转发',
      d: '动态 (SOCKS5)'
    },
    actions: {
      refresh: '刷新',
      new: '新建规则',
      routes: '条',
      quickStart: '快速启动',
      start: '启动',
      stop: '停止',
      checkPort: '检测端口',
      save: '保存',
      saving: '保存中...',
      delete: '删除'
    },
    hints: {
      saved: '保存并复用常用转发',
      empty: '暂无保存的隧道',
      live: '实时隧道状态',
      noActive: '当前没有运行中的隧道',
      bind: '选择主机/会话后启动',
      selectHost: '请先选择主机',
      unknownHost: '未知主机',
      startFailed: '启动隧道失败'
    },
    portCheck: {
      ok: '端口可用',
      error: '端口被占用或不可用'
    },
    traffic: {
      up: '上行',
      down: '下行',
      since: '已运行'
    }
  },
  sftp: {
    header: {
      title: '文件桥',
      instruction: '双击文件夹进入，双击文件即可传输',
      connectionFallback: 'SFTP 会话'
    },
    badges: {
      ready: 'SFTP 就绪',
      fallback: '当前会话'
    },
    panes: {
      localTitle: '本地文件',
      remoteTitle: '远程文件',
      localRoot: '此电脑',
      localContext: '本地目录',
      remoteContext: '远程目录'
    },
    placeholders: {
      filterLocal: '筛选本地文件...',
      filterRemote: '筛选远程文件...'
    },
    selectedLabel: '已选择',
    drag: {
      releaseDownload: '释放以开始下载',
      releaseUpload: '释放以开始上传'
    },
    tooltips: {
      goUp: '上一级',
      refresh: '刷新',
      newFolder: '新建文件夹',
      download: '从远程下载',
      upload: '上传至远程'
    },
    emptyStates: {
      remoteList: '远程列表尚未接入，请连接 SFTP 后刷新。'
    },
    notices: {
      transferHint: '拖拽本地文件到远程面板即可上传'
    },
    transfer: {
      title: '传输队列',
      uploadLabel: '上传',
      downloadLabel: '下载',
      cancelTooltip: '取消传输',
      removeTooltip: '从列表移除',
      statuses: {
        queued: '排队',
        active: '进行中',
        done: '完成',
        error: '失败'
      }
    },
    contextMenu: {
      upload: '上传',
      download: '下载',
      newFolder: '新建文件夹',
      rename: '重命名',
      openTerminal: '在此进入终端',
      openTerminalHere: '当前目录进入终端',
      properties: '属性',
      delete: '删除',
      confirmDelete: '确定删除 "{name}"？此操作不可撤销。'
    },
    dialogs: {
      newFolderTitle: '新文件夹名称：',
      renameTitle: '重命名为：',
      cancel: '取消',
      confirm: '确定',
      overwriteTitle: '覆盖文件',
      overwriteMessage: '目标目录已存在同名文件 "{name}"。是否覆盖？',
      overwriteConfirm: '覆盖',
      overwriteSkip: '跳过',
      infoTitle: '文件属性',
      infoName: '名称',
      infoLocation: '位置',
      infoType: '类型',
      infoFolder: '文件夹',
      infoFile: '文件',
      infoSize: '大小',
      infoModified: '修改时间',
      infoPermissions: '权限',
      infoClose: '关闭'
    },
    errors: {
      readDirUnavailable: '无法读取本地文件，请在 preload 暴露 readDir。',
      sftpNotConnected: 'SFTP 尚未连接，请稍候...',
      sftpApiMissing: '无法读取远程文件，请在 preload 暴露 sftpReadDir。',
      directoryUploadUnsupported: '暂不支持上传文件夹：{name}',
      directoryDownloadUnsupported: '暂不支持下载文件夹：{name}',
      localTerminalSelectDir: '请先选定具体的本地目录再打开终端。',
      remoteTerminalMissingHost: '无法定位关联主机，暂时无法打开终端。',
      cancelTransfer: '已取消'
    }
  }
}

export const translations: Record<LanguageCode, TranslationShape> = {
  en: enTranslation,
  zh: zhTranslation
}

export type TranslationCatalog = TranslationShape

export const getMessages = (language: LanguageCode): TranslationShape => translations[language] ?? enTranslation
