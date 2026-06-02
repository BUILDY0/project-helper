const { Tray, Menu, nativeImage } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

// 单例引用：进程内只允许一个托盘实例，避免 dev 热重载或重复调用导致句柄泄漏
let trayInstance = null

/** 加载托盘图标：优先工程根 build/icon.ico，缺失时返回空 image 兜底 */
function loadTrayImage() {
  // __dirname 指向 src/main/modules，回退三层到工程根
  const iconPath = path.join(__dirname, '..', '..', '..', 'build', 'icon.ico')
  try {
    if (fs.existsSync(iconPath)) {
      const img = nativeImage.createFromPath(iconPath)
      if (!img.isEmpty()) return img
    }
  } catch (err) {
    console.error('[tray] 加载图标失败:', err.message)
  }
  return nativeImage.createEmpty()
}

/**
 * 把主窗口前置：从隐藏 / 最小化 / 后台状态恢复到可见前台
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 * @param {{ tab?: string }} [options] 传入 tab 时通知渲染层切换；省略则保持当前页
 */
function showMainWindow(getMainWindow, { tab } = {}) {
  const win = getMainWindow?.()
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  if (!win.isVisible()) win.show()
  win.moveTop()
  win.focus()
  if (tab) {
    // 渲染层订阅 'window:activate' 后走 onRequestTab，可触达未保存提示，避免静默丢数据
    win.webContents.send('window:activate', { tab })
  }
}

/**
 * 创建系统托盘（应用生命周期内常驻）
 *
 * @param {{
 *   getMainWindow: () => import('electron').BrowserWindow | null,
 *   onQuit: () => void
 * }} options
 * @returns {Tray | null} 创建失败返回 null，不阻断启动
 */
function setupTray({ getMainWindow, onQuit }) {
  if (trayInstance) return trayInstance

  let tray
  try {
    tray = new Tray(loadTrayImage())
  } catch (err) {
    console.error('[tray] 创建 Tray 失败:', err.message)
    return null
  }

  tray.setToolTip('ProjectHelper')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主窗口',
      // 菜单项是"回到首页"语义，强制切到项目页
      click: () => showMainWindow(getMainWindow, { tab: 'projects' })
    },
    {
      label: '退出',
      click: () => {
        if (typeof onQuit === 'function') onQuit()
      }
    }
  ])
  tray.setContextMenu(contextMenu)

  // 左键单击与"打开主窗口"菜单项行为一致：恢复窗口并切回项目页
  tray.on('click', () => showMainWindow(getMainWindow, { tab: 'projects' }))

  trayInstance = tray
  return tray
}

/** 释放托盘资源：仅在 before-quit / dev 热重载时调用 */
function destroyTray() {
  if (trayInstance && !trayInstance.isDestroyed()) {
    trayInstance.destroy()
  }
  trayInstance = null
}

module.exports = {
  setupTray,
  destroyTray
}
