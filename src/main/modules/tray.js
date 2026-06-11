const { Tray, Menu, nativeImage, app } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

// 单例引用：进程内只允许一个托盘实例，避免 dev 热重载或重复调用导致句柄泄漏
let trayInstance = null

/** 加载托盘图标：打包后从 extraResources 读取，dev 从工程根 build/ 读取 */
function loadTrayImage() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '..', '..', '..', 'build', 'icon.ico')
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
 * 构建右键菜单模板并更新托盘菜单
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 * @param {() => void} onQuit
 * @param {{ name: string, path: string }[]} recentProjects 最近修改的项目列表（最多5个）
 * @param {(projectPath: string) => void} openProject 打开项目的回调
 */
/**
 * 截断过长的项目名：超过 maxLen 时保留首尾，中间用省略号替换
 * 例：maxLen=32，"very-long-project-name-here-foo-bar" → "very-long-project-name-…oo-bar"
 */
function truncateName(name, maxLen = 32) {
  if (name.length <= maxLen) return name
  const half = Math.floor((maxLen - 1) / 2)
  return name.slice(0, half) + '…' + name.slice(name.length - (maxLen - 1 - half))
}

function buildContextMenu(getMainWindow, onQuit, recentProjects, openProject) {
  const template = []

  if (recentProjects && recentProjects.length > 0) {
    template.push({
      label: '最近打开项目',
      enabled: false
    })
    for (const proj of recentProjects) {
      template.push({
        label: `${proj.isRemote ? '🌐' : '📁'} ${truncateName(proj.name)}`,
        click: () => openProject({ key: proj.key, isRemote: proj.isRemote })
      })
    }
    template.push({ type: 'separator' })
  }

  template.push(
    {
      label: '打开主窗口',
      click: () => showMainWindow(getMainWindow, { tab: 'projects' })
    },
    {
      label: '退出',
      click: () => {
        if (typeof onQuit === 'function') onQuit()
      }
    }
  )

  return Menu.buildFromTemplate(template)
}

/**
 * 创建系统托盘（应用生命周期内常驻）
 *
 * @param {{
 *   getMainWindow: () => import('electron').BrowserWindow | null,
 *   onQuit: () => void,
 *   openProject: (projectPath: string) => void
 * }} options
 * @returns {Tray | null} 创建失败返回 null，不阻断启动
 */
function setupTray({ getMainWindow, onQuit, openProject }) {
  if (trayInstance) return trayInstance

  let tray
  try {
    tray = new Tray(loadTrayImage())
  } catch (err) {
    console.error('[tray] 创建 Tray 失败:', err.message)
    return null
  }

  tray.setToolTip('ProjectHelper')
  tray.setContextMenu(buildContextMenu(getMainWindow, onQuit, [], openProject))

  // 左键单击与"打开主窗口"菜单项行为一致：恢复窗口并切回项目页
  tray.on('click', () => showMainWindow(getMainWindow, { tab: 'projects' }))

  trayInstance = tray
  return tray
}

/**
 * 用新的最近项目列表更新托盘右键菜单
 * @param {{ name: string, path: string }[]} recentProjects
 * @param {() => import('electron').BrowserWindow | null} getMainWindow
 * @param {() => void} onQuit
 * @param {(projectPath: string) => void} openProject
 */
function updateTrayMenu(recentProjects, getMainWindow, onQuit, openProject) {
  if (!trayInstance || trayInstance.isDestroyed()) return
  trayInstance.setContextMenu(buildContextMenu(getMainWindow, onQuit, recentProjects, openProject))
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
  destroyTray,
  updateTrayMenu
}
