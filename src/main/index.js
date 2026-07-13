const { app, Menu, ipcMain } = require('electron')

const {
  ensureConfigFile,
  syncAutoRunStartupOnStartup,
  registerConfigIpc,
  readConfig,
  readRecentOpened
} = require('./modules/config-store')
const {
  createWindow,
  detectIdesOnce,
  registerSystemBridge,
  openProjectWithDefaultIde,
  openRemoteProjectByKey
} = require('./modules/system-bridge')
const { registerScannerIpc, getRecentProjects } = require('./modules/project-scanner')
const {
  setupAutoUpdater,
  registerUpdaterIpc,
  clearInstallerCacheIfEnabled
} = require('./modules/updater')
const { setupTray, destroyTray, updateTrayMenu } = require('./modules/tray')
const { registerGitCloneIpc } = require('./modules/git-clone')
const { registerFsCopyIpc } = require('./modules/fs-copy')
const { bus, Events } = require('./modules/event-bus')

// 主窗口引用：autoUpdater 等模块通过 getMainWindow() 获取，避免循环依赖
let mainWindow = null

/** 激活已有主窗口：用于第二次启动应用、托盘点击等"切回当前实例"场景 */
function activateMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  // 关闭→隐藏到托盘后，窗口处于 hidden 状态，需要显式 show
  if (!mainWindow.isVisible()) {
    mainWindow.show()
  }

  mainWindow.moveTop()
  mainWindow.focus()
}

/**
 * 真正退出应用：托盘菜单"退出"、自动更新安装等场景调用。
 * 必须先置 isQuitting=true，否则会被 close 监听器拦下变成"隐藏到托盘"。
 */
function forceQuit() {
  app.isQuitting = true
  app.quit()
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

  // 订阅配置变更：close 事件需要同步读取 trayEnabled，因此把它挂在 app 上即时刷新
  bus.on(Events.CONFIG_SAVED, ({ config }) => {
    app.trayEnabled = config?.tray !== false
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
    registerGitCloneIpc()
    registerFsCopyIpc()

    // app:quit 由 index.js 注册，复用 forceQuit；
    // 渲染层/托盘菜单需要"彻底退出"时使用，避免误用 window:close 被托盘策略拦截
    ipcMain.handle('app:quit', forceQuit)

    // 启动期读一次 tray 配置，初始化关闭按钮的行为；后续变更由 CONFIG_SAVED 事件驱动
    let initialTrayEnabled = true
    try {
      const cfg = await readConfig()
      initialTrayEnabled = cfg.tray !== false
    } catch (err) {
      console.error('[startup] 读取 tray 配置失败，按默认隐藏到托盘处理:', err.message)
    }
    app.trayEnabled = initialTrayEnabled

    mainWindow = createWindow()

    // 拦截关闭：app.trayEnabled=true 时隐藏到托盘，否则放行让窗口正常退出
    mainWindow.on('close', (e) => {
      if (app.isQuitting) return
      if (app.trayEnabled !== false) {
        e.preventDefault()
        mainWindow.hide()
      } else {
        // 关闭即退出：放行 close，由 window-all-closed 收尾
        app.isQuitting = true
      }
    })

    // 托盘常驻
    setupTray({
      getMainWindow: () => mainWindow,
      onQuit: forceQuit,
      openProject: ({ key, isRemote }) => {
        if (isRemote) {
          openRemoteProjectByKey(key).catch(() => {})
        } else {
          openProjectWithDefaultIde(key)
        }
      }
    })

    // 项目扫描完成后，更新托盘菜单中的最近打开项目列表
    const { normalizePathItem, projectKey } = require('../shared/path-types.js')
    let lastScannedProjects = []
    const refreshTrayRecent = async () => {
      const recentOpened = await readRecentOpened()
      // 本地项目：通过 getRecentProjects 匹配扫描结果
      const localRecent = getRecentProjects(lastScannedProjects, recentOpened, 5)
      // 远程项目：从 config 读取，匹配 recent_opened
      const cfg = await readConfig()
      const remotePaths = cfg.remote?.paths || []
      const recentSet = new Set(recentOpened.map((r) => r.path))
      const remoteRecent = []
      for (const raw of remotePaths) {
        const item = normalizePathItem(raw)
        if (!item) continue
        const key = projectKey(item)
        if (recentSet.has(key)) {
          remoteRecent.push({ key, name: item.cfg?.alias || item.path })
        }
      }
      // 合并排序：按 openedAt 降序，最近打开的在首位
      const recentMap = new Map(recentOpened.map((r) => [r.path, r.openedAt]))
      const merged = [
        ...localRecent.map((p) => ({
          key: p.path,
          name: p.name,
          isRemote: false,
          openedAt: recentMap.get(p.path) || 0
        })),
        ...remoteRecent.map((p) => ({
          key: p.key,
          name: p.name,
          isRemote: true,
          openedAt: recentMap.get(p.key) || 0
        }))
      ]
        .sort((a, b) => b.openedAt - a.openedAt)
        .slice(0, 8)

      updateTrayMenu(
        merged,
        () => mainWindow,
        forceQuit,
        ({ key, isRemote }) => {
          if (isRemote) {
            openRemoteProjectByKey(key).catch(() => {})
          } else {
            openProjectWithDefaultIde(key)
          }
        }
      )
    }

    bus.on(Events.PROJECTS_SCANNED, ({ projects }) => {
      lastScannedProjects = projects
      refreshTrayRecent()
    })

    // 托盘打开项目后轻量刷新：appendRecentOpened 已在 system-bridge 写盘，此处只重读记录重排
    bus.on(Events.PROJECT_OPENED, () => {
      refreshTrayRecent()
    })

    // 启动期一次性探测可用 IDE（异步，不阻塞窗口）。结果缓存在 system-bridge 模块，
    // 渲染层通过 ide:get-available 直接读取，整个生命周期内不再重复 exec。
    detectIdesOnce().catch((err) => {
      console.error('[ide] 启动期探测失败:', err.message)
    })

    // 启动后台自动更新检查（仅打包后生效，dev 下 electron-updater 不会执行实际请求）
    setupAutoUpdater(() => mainWindow)

    // 启动 5 秒后执行安装包缓存清理（独立于 isPackaged，dev 下也可验证）
    setTimeout(() => {
      clearInstallerCacheIfEnabled().catch((err) => {
        console.error('[installer-cleaner] 清理失败:', err.message)
      })
    }, 5000)
  })
}

// 窗口全部关闭：仅在显式退出时才让进程结束；隐藏到托盘场景需驻留进程
app.on('window-all-closed', () => {
  if (app.isQuitting || app.trayEnabled === false) {
    app.quit()
  }
})

// 退出前释放托盘句柄，避免 dev 热重载或异常退出时残留
app.on('before-quit', () => {
  app.isQuitting = true
  destroyTray()
})
