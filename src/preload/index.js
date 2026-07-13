const { contextBridge, ipcRenderer, webUtils } = require('electron')

// 暴露给渲染进程的安全 API，全部走 ipcRenderer.invoke
contextBridge.exposeInMainWorld('api', {
  // 窗口控制
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  /** 显式退出应用，绕过"关闭→隐藏托盘"策略 */
  quit: () => ipcRenderer.invoke('app:quit'),
  onMaximizeChange: (cb) => {
    const listener = (_e, val) => cb(val)
    ipcRenderer.on('window:maximize-change', listener)
    return () => ipcRenderer.removeListener('window:maximize-change', listener)
  },

  /**
   * 主进程要求渲染层激活某个 tab（如托盘菜单"打开主窗口"切到项目页）
   * payload: { tab: string }
   */
  onActivate: (cb) => {
    const listener = (_e, val) => cb(val)
    ipcRenderer.on('window:activate', listener)
    return () => ipcRenderer.removeListener('window:activate', listener)
  },

  // 开发模式辅助
  /** 当前是否处于开发环境，仅 dev 下显示 console 等辅助入口 */
  isDev: () => ipcRenderer.invoke('app:is-dev'),
  /** 切换 DevTools 显示（仅 dev 模式有效） */
  toggleDevTools: () => ipcRenderer.invoke('devtools:toggle'),

  // 配置
  getConfigPath: () => ipcRenderer.invoke('config:get-path'),
  readConfig: () => ipcRenderer.invoke('config:read'),
  saveConfig: (payload) => ipcRenderer.invoke('config:save', payload),
  /** 仅保存主题，change 时即时写入，避免与配置页未保存逻辑冲突 */
  saveTheme: (theme) => ipcRenderer.invoke('config:save-theme', theme),
  /** 仅保存某端视图（local/remote），切换时即时写入 */
  saveView: (side, view) => ipcRenderer.invoke('config:save-view', { side, view }),
  /** 安装包缓存目录路径 */
  getInstallerDir: () => ipcRenderer.invoke('installer:get-dir'),

  // 选择对话框
  /**
   * 选择目录
   * @param {{ multi?: boolean }} [options] multi=true 时返回 string[]，否则返回 string
   */
  selectDirectory: (options = {}) => ipcRenderer.invoke('dialog:select-directory', options),
  /**
   * 选择文件
   * @param {{ multi?: boolean }} [options] multi=true 时返回 string[]，否则返回 string
   */
  selectFile: (options = {}) => ipcRenderer.invoke('dialog:select-file', options),
  /** 取拖拽 File 对象的真实文件系统路径（Electron 32+ 已移除 File.path） */
  getPathForFile: (file) => webUtils.getPathForFile(file),
  /** 从一组路径中过滤出存在且为目录的项 */
  filterDirectories: (paths) => ipcRenderer.invoke('path:filter-directories', paths),

  // shell
  openFolder: (p) => ipcRenderer.invoke('shell:open-folder', p),
  showInFolder: (p) => ipcRenderer.invoke('shell:show-in-folder', p),
  /** 系统默认浏览器打开外部 http(s) 链接 */
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  /** 用指定 IDE 打开路径，id 取自 detectIdes 返回项 */
  openInIde: (id, p) => ipcRenderer.invoke('shell:open-in-ide', { id, targetPath: p }),
  /** 用"默认 IDE"打开路径（优先级：ide_cfg.default > 第一个可用 > vscode > 文件管理器） */
  openWithDefaultIde: (p) => ipcRenderer.invoke('shell:open-with-default', p),
  /** 读取启动期探测缓存的 IDE 列表（含 available 字段），不会触发新探测 */
  getAvailableIdes: () => ipcRenderer.invoke('ide:get-available'),
  /** 强制重新探测受支持 IDE 的可用性，并刷新主进程缓存 */
  detectIdes: () => ipcRenderer.invoke('ide:detect'),
  /** 探测单个 entry 是否在系统 PATH 中存在（弹窗"检测"按钮用） */
  probeIdeEntry: (entry) => ipcRenderer.invoke('ide:probe-entry', entry),
  /** 调试 IDE 脚本：执行占位替换后的命令，验证可执行性 */
  debugIdeScript: (cmd) => ipcRenderer.invoke('ide:debug-script', cmd),
  /** 保存 ide_cfg 到 config.json */
  saveIdeConfig: (payload) => ipcRenderer.invoke('ide:save-config', payload),
  /** 监听 ide:detect 逐步推送的进度（每完成一个 entry 触发一次） */
  onIdeDetectProgress: (cb) => {
    const listener = (_e, val) => cb(val)
    ipcRenderer.on('ide:detect-progress', listener)
    return () => ipcRenderer.removeListener('ide:detect-progress', listener)
  },
  deleteFolder: (p, options = {}) =>
    ipcRenderer.invoke('shell:delete-folder', { targetPath: p, force: !!options.force }),
  /** 同级目录下重命名项目文件夹，返回 { ok, path }（path 为新绝对路径） */
  renameFolder: (p, newName) =>
    ipcRenderer.invoke('shell:rename-folder', { targetPath: p, newName }),
  /** 调起系统原生「文件夹属性」对话框 */
  showProperties: (p) => ipcRenderer.invoke('shell:show-properties', p),
  /** 写入系统剪贴板 */
  copyText: (text) => ipcRenderer.invoke('clipboard:write-text', text),

  // 项目扫描
  scanProjects: () => ipcRenderer.invoke('projects:scan'),

  // git 克隆
  /** 克隆仓库：payload { id, url, dir }，返回 { ok, path?, canceled?, gitMissing?, message? } */
  cloneRepo: (payload) => ipcRenderer.invoke('git:clone', payload),
  /** 取消指定 id 的克隆任务 */
  cancelClone: (id) => ipcRenderer.invoke('git:clone-cancel', { id }),
  /** 监听克隆进度：回调 { id, method, stage, progress }，返回解绑函数 */
  onCloneProgress: (cb) => {
    const listener = (_e, val) => cb(val)
    ipcRenderer.on('git:clone-progress', listener)
    return () => ipcRenderer.removeListener('git:clone-progress', listener)
  },

  // 切换 pin 状态，返回最新的 pinned 路径数组
  togglePin: (p) => ipcRenderer.invoke('pin:toggle', p),

  // 最近打开记录（统一 key：local=path，remote=path::alias）
  appendRecentOpened: (key) => ipcRenderer.invoke('recent:append', key),
  /** 删除指定 key 的最近打开记录 */
  removeRecentKey: (key) => ipcRenderer.invoke('recent:remove', key),
  /** key 变更时替换最近打开记录 */
  replaceRecentKey: (oldKey, newKey) => ipcRenderer.invoke('recent:replace', { oldKey, newKey }),

  // 应用版本号
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  // 关于弹窗运行时信息
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),

  // 自动更新：手动检查 / 开始下载 / 安装并重启
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
  /**
   * 监听更新各阶段事件
   * status: checking | available | not-available | downloading | downloaded | error
   */
  onUpdaterStatus: (cb) => {
    const listener = (_e, val) => cb(val)
    ipcRenderer.on('updater:status', listener)
    return () => ipcRenderer.removeListener('updater:status', listener)
  }
})
