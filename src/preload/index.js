const { contextBridge, ipcRenderer } = require('electron')

// 暴露给渲染进程的安全 API，全部走 ipcRenderer.invoke
contextBridge.exposeInMainWorld('api', {
  // 窗口控制
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  onMaximizeChange: (cb) => {
    const listener = (_e, val) => cb(val)
    ipcRenderer.on('window:maximize-change', listener)
    return () => ipcRenderer.removeListener('window:maximize-change', listener)
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

  // shell
  openFolder: (p) => ipcRenderer.invoke('shell:open-folder', p),
  showInFolder: (p) => ipcRenderer.invoke('shell:show-in-folder', p),
  /** 系统默认浏览器打开外部 http(s) 链接 */
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  /** 用指定 IDE 打开路径，id 取自 detectIdes 返回项 */
  openInIde: (id, p) => ipcRenderer.invoke('shell:open-in-ide', { id, targetPath: p }),
  /** 读取启动期探测缓存的 IDE 列表（含 available 字段），不会触发新探测 */
  getAvailableIdes: () => ipcRenderer.invoke('ide:get-available'),
  /** 强制重新探测受支持 IDE 的可用性，并刷新主进程缓存 */
  detectIdes: () => ipcRenderer.invoke('ide:detect'),
  deleteFolder: (p, options = {}) =>
    ipcRenderer.invoke('shell:delete-folder', { targetPath: p, force: !!options.force }),
  /** 调起系统原生「文件夹属性」对话框 */
  showProperties: (p) => ipcRenderer.invoke('shell:show-properties', p),
  /** 写入系统剪贴板 */
  copyText: (text) => ipcRenderer.invoke('clipboard:write-text', text),

  // 项目扫描
  scanProjects: () => ipcRenderer.invoke('projects:scan'),

  // 切换 pin 状态，返回最新的 pinned 路径数组
  togglePin: (p) => ipcRenderer.invoke('pin:toggle', p),

  // 应用版本号
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

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
