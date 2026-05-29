const { app, Menu } = require('electron')

const {
  ensureConfigFile,
  syncAutoRunStartupOnStartup,
  registerConfigIpc
} = require('./modules/config-store')
const { createWindow, detectIdesOnce, registerSystemBridge } = require('./modules/system-bridge')
const { registerScannerIpc } = require('./modules/project-scanner')
const { setupAutoUpdater, registerUpdaterIpc } = require('./modules/updater')

// 主窗口引用：autoUpdater 等模块通过 getMainWindow() 获取，避免循环依赖
let mainWindow = null

/** 激活已有主窗口：用于第二次启动应用时切回当前实例 */
function activateMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.moveTop()
  mainWindow.focus()
}

// 全局兜底：避免主进程未捕获异常 / Promise rejection 触发 Electron 原生错误对话框
// 这类异常多来自 autoUpdater 网络失败等非致命场景，仅写日志即可
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    activateMainWindow()
  })

  app.whenReady().then(async () => {
    // 移除默认菜单，避免 alt 键唤起系统菜单
    Menu.setApplicationMenu(null)

    // 启动时确保配置文件存在；失败仅打印日志，不阻塞窗口创建
    try {
      await ensureConfigFile()
    } catch (err) {
      console.error('[startup] 初始化配置文件失败:', err.message)
    }

    // 启动期同步开机自启状态（以系统层为准）
    try {
      await syncAutoRunStartupOnStartup()
    } catch (err) {
      console.error('[startup] 同步开机自启失败:', err.message)
    }

    // 注册各领域 IPC（独立模块自管 handler）
    registerSystemBridge()
    registerConfigIpc()
    registerScannerIpc()
    registerUpdaterIpc()

    mainWindow = createWindow()

    // 启动期一次性探测可用 IDE（异步，不阻塞窗口）。结果缓存在 system-bridge 模块，
    // 渲染层通过 ide:get-available 直接读取，整个生命周期内不再重复 exec。
    detectIdesOnce().catch((err) => {
      console.error('[ide] 启动期探测失败:', err.message)
    })

    // 启动后台自动更新检查（仅打包后生效，dev 下 electron-updater 不会执行实际请求）
    setupAutoUpdater(() => mainWindow)
  })
}

app.on('window-all-closed', () => {
  app.quit()
})
