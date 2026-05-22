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

  // 配置
  getConfigPath: () => ipcRenderer.invoke('config:get-path'),
  readConfig: () => ipcRenderer.invoke('config:read'),
  saveConfig: (payload) => ipcRenderer.invoke('config:save', payload),

  // 选择对话框
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  selectFile: () => ipcRenderer.invoke('dialog:select-file'),

  // shell
  openFolder: (p) => ipcRenderer.invoke('shell:open-folder', p),
  showInFolder: (p) => ipcRenderer.invoke('shell:show-in-folder', p),
  openInVscode: (p) => ipcRenderer.invoke('shell:open-in-vscode', p),
  deleteFolder: (p) => ipcRenderer.invoke('shell:delete-folder', p),
  // 调起系统属性对话框（Windows/macOS 支持）
  showProperties: (p) => ipcRenderer.invoke('shell:show-properties', p),

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
