const { app, ipcMain } = require('electron')
// electron-updater：从 GitHub Release 拉取版本信息并自动下载更新
const { autoUpdater } = require('electron-updater')

// ==================== 自动更新 ====================
/**
 * 配置 electron-updater：
 * - 启动后立即检查一次更新
 * - 每隔 1 小时再检查一次（保持 app 长时间打开时也能拿到新版本）
 * - 各阶段事件通过 'updater:status' 转发给渲染层做提示
 *
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 *        通过函数获取主窗口引用，避免与 main.js 形成循环依赖
 */
function setupAutoUpdater(getMainWindow) {
  // dev 模式下打包信息不存在，调用会报错；直接跳过
  if (!app.isPackaged) return

  // 由用户在「有新版本」提示中确认后再下载，避免占用流量
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  // 关闭 electron-updater 内部 logger（默认会用 console，错误信息不弹窗，但避免日志噪音）
  autoUpdater.logger = null

  const send = (status, payload) => {
    const mainWindow = getMainWindow?.()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', { status, payload })
    }
  }

  autoUpdater.on('checking-for-update', () => send('checking'))
  autoUpdater.on('update-available', (info) => send('available', info))
  autoUpdater.on('update-not-available', (info) => send('not-available', info))
  autoUpdater.on('error', (err) => send('error', { message: err?.message || String(err) }))
  autoUpdater.on('download-progress', (p) =>
    send('downloading', { percent: p.percent, transferred: p.transferred, total: p.total })
  )
  autoUpdater.on('update-downloaded', (info) => send('downloaded', info))

  // 启动后延迟一点检查，避开应用初始化高峰
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] checkForUpdates 失败:', err.message)
    })
  }, 5000)

  // 长开应用每小时再检查一次
  setInterval(
    () => {
      autoUpdater.checkForUpdates().catch(() => {})
    },
    60 * 60 * 1000
  )
}

/** 注册自动更新与版本号相关的 IPC */
function registerUpdaterIpc() {
  // 渲染层主动触发检查（菜单或按钮）
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      return { ok: false, message: '开发环境不支持检查更新' }
    }
    try {
      const r = await autoUpdater.checkForUpdates()
      return { ok: true, version: r?.updateInfo?.version || '' }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  })

  // 用户确认后开始下载
  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  })

  // 下载完成后立即重启并安装
  ipcMain.handle('updater:quit-and-install', () => {
    autoUpdater.quitAndInstall()
    return { ok: true }
  })

  // 返回当前版本号
  ipcMain.handle('app:get-version', () => app.getVersion())
}

module.exports = {
  setupAutoUpdater,
  registerUpdaterIpc
}
