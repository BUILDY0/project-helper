const { app, ipcMain } = require('electron')
// electron-updater：从 GitHub Release 拉取版本信息并自动下载更新
const { autoUpdater } = require('electron-updater')
const path = require('node:path')
const fsp = require('node:fs/promises')
const { readConfig, getInstallerDir } = require('./config-store')

// ==================== 自动更新 ====================
/**
 * 配置 electron-updater：
 * - 启动 5 秒后检查一次，运行期间每隔 1 小时再检查一次（仅当 auto_check_update 为 true）
 * - 渲染层手动触发的 'updater:check' 不受该开关影响
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
  // 关闭 electron-updater 内部 logger，避免日志噪音
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

  /** 每次定时触发时实时读取 config，保证用户改了配置后立即生效 */
  async function isAutoCheckEnabled() {
    try {
      const cfg = await readConfig()
      return cfg.auto_check_update !== false
    } catch {
      // 读取失败按默认开启处理，避免漏检
      return true
    }
  }

  // 启动后延迟 5 秒检查，避开应用初始化高峰
  setTimeout(async () => {
    if (await isAutoCheckEnabled()) {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[updater] checkForUpdates 失败:', err.message)
      })
    }
  }, 5000)

  // 长开应用每小时再检查一次
  setInterval(
    async () => {
      if (!(await isAutoCheckEnabled())) return
      autoUpdater.checkForUpdates().catch(() => {})
    },
    60 * 60 * 1000
  )
}

/**
 * 若 auto_clear_installer 开启，递归删除安装包缓存目录内的所有条目，保留目录本身。
 * 任何单个条目删除失败仅打日志，不中断其余清理。
 */
async function clearInstallerCacheIfEnabled() {
  let cfg
  try {
    cfg = await readConfig()
  } catch {
    return
  }
  if (!cfg.auto_clear_installer) return

  const installerDir = getInstallerDir()
  let entries
  try {
    entries = await fsp.readdir(installerDir)
  } catch {
    // 目录不存在或无法读取，无需处理
    return
  }
  if (!entries.length) return

  console.log(`[installer-cleaner] 清理 ${installerDir}，共 ${entries.length} 个条目`)
  for (const name of entries) {
    const full = path.join(installerDir, name)
    try {
      await fsp.rm(full, { recursive: true, force: true })
    } catch (err) {
      console.error(`[installer-cleaner] 删除失败: ${full}`, err.message)
    }
  }
  console.log('[installer-cleaner] 清理完成')
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
    // 置位以绕过"关闭→隐藏托盘"拦截，确保升级流程能真正退出主进程
    app.isQuitting = true
    autoUpdater.quitAndInstall()
    return { ok: true }
  })

  // 返回当前版本号
  ipcMain.handle('app:get-version', () => app.getVersion())

  // 关于弹窗所需运行时信息
  ipcMain.handle('app:get-info', () => {
    const os = require('os')
    return {
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      v8: process.versions.v8,
      os: `${os.type()} ${process.arch} ${os.release()}`
    }
  })
}

module.exports = {
  setupAutoUpdater,
  registerUpdaterIpc,
  clearInstallerCacheIfEnabled
}
