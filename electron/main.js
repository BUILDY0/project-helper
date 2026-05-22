const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const { exec } = require('node:child_process')
const os = require('node:os')
// electron-updater：从 GitHub Release 拉取版本信息并自动下载更新
const { autoUpdater } = require('electron-updater')

// 应用工作目录与配置文件：放在用户主目录下的独立目录，避免污染 home
const APP_HOME = path.join(os.homedir(), '.project-helper')
const CONFIG_PATH = path.join(APP_HOME, 'config.json')

// 主窗口引用：autoUpdater 等模块需要向渲染进程 push 事件
let mainWindow = null

/** 创建主窗口：无边框，使用自定义顶部 banner */
function createWindow() {
  // 任务栏 / 窗口图标：仅构建 Windows 版本，使用 build/icon.ico
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico')
  const winOptions = {
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  }
  // 仅当图标文件存在时才设置，避免开发阶段无图标导致黑色默认图
  try {
    if (fs.existsSync(iconPath)) winOptions.icon = iconPath
  } catch {}
  const win = new BrowserWindow(winOptions)

  // 开发环境加载 vite dev server，生产环境加载打包产物
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // 窗口最大化状态变化通知渲染进程，便于切换图标
  win.on('maximize', () => win.webContents.send('window:maximize-change', true))
  win.on('unmaximize', () => win.webContents.send('window:maximize-change', false))

  return win
}

app.whenReady().then(async () => {
  // 移除默认菜单，避免 alt 键唤起系统菜单
  Menu.setApplicationMenu(null)
  // 启动时确保配置文件存在；失败仅打印日志，不阻塞窗口创建
  try {
    await ensureConfigFile()
  } catch (err) {
    console.error('[startup] 初始化配置文件失败:', err.message)
  }
  mainWindow = createWindow()

  // 启动后台自动更新检查（仅打包后生效，dev 下 electron-updater 不会执行实际请求）
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ==================== 窗口控制 ====================
ipcMain.handle('window:minimize', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.minimize()
})
ipcMain.handle('window:toggle-maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return false
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
  return win.isMaximized()
})
ipcMain.handle('window:close', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.close()
})

// ==================== 配置读写 ====================
const DEFAULT_CONFIG = { paths: [], depth: 1, exclude_paths: [], pinned: [] }

/**
 * 确保配置文件存在；不存在则写入默认模板。
 * 处理边界：路径被同名目录占用时抛错；父目录不存在时尝试创建。
 */
async function ensureConfigFile() {
  try {
    const stat = await fsp.stat(CONFIG_PATH)
    if (!stat.isFile()) {
      // 路径已被同名目录占用，主动报错，避免后续 openPath 失败但不知道原因
      throw new Error(`配置路径已被非文件占用: ${CONFIG_PATH}`)
    }
    return
  } catch (err) {
    // 仅当文件不存在时才创建；其它错误向上抛
    if (err && err.code !== 'ENOENT') {
      console.error('[config] 检查配置文件失败:', err.message)
      throw err
    }
  }

  // 文件不存在，确保父目录存在
  try {
    await fsp.mkdir(APP_HOME, { recursive: true })
  } catch (err) {
    console.error('[config] 创建工作目录失败:', err.message)
    throw err
  }

  // 兼容旧版本：如果旧路径存在 ~/config.json，则迁移到新路径，保留用户配置
  const LEGACY_CONFIG = path.join(os.homedir(), 'config.json')
  try {
    const legacyStat = await fsp.stat(LEGACY_CONFIG)
    if (legacyStat.isFile()) {
      await fsp.rename(LEGACY_CONFIG, CONFIG_PATH)
      console.log('[config] 已迁移旧配置到:', CONFIG_PATH)
      return
    }
  } catch {
    // 旧文件不存在或无法访问，忽略
  }

  // 写入默认模板
  try {
    await fsp.writeFile(
      CONFIG_PATH,
      JSON.stringify(DEFAULT_CONFIG, null, 2),
      'utf-8'
    )
    console.log('[config] 已创建默认配置文件:', CONFIG_PATH)
  } catch (err) {
    console.error('[config] 创建默认配置失败:', err.message)
    throw err
  }
}

/** 读取配置文件，缺省返回默认值 */
async function readConfig() {
  // 读取前先确保文件存在，避免运行期被外部删除导致后续操作找不到文件
  try {
    await ensureConfigFile()
  } catch (err) {
    // 创建失败不阻塞读取流程，仍返回默认值
    console.error('[config] ensureConfigFile 失败，使用默认值:', err.message)
    return { config_path: CONFIG_PATH, ...DEFAULT_CONFIG, mtime: 0 }
  }
  try {
    const text = await fsp.readFile(CONFIG_PATH, 'utf-8')
    const json = JSON.parse(text)
    // 读取文件 mtime 用于在 UI 展示最后修改时间；失败则置 0
    let mtime = 0
    try {
      const stat = await fsp.stat(CONFIG_PATH)
      mtime = stat.mtimeMs
    } catch {}
    return {
      config_path: CONFIG_PATH,
      paths: Array.isArray(json.paths) ? json.paths : [],
      depth: typeof json.depth === 'number' ? json.depth : 1,
      exclude_paths: Array.isArray(json.exclude_paths) ? json.exclude_paths : [],
      pinned: Array.isArray(json.pinned) ? json.pinned : [],
      mtime
    }
  } catch (err) {
    // 文件解析失败时返回默认值，避免页面崩溃
    return { config_path: CONFIG_PATH, ...DEFAULT_CONFIG, mtime: 0 }
  }
}

ipcMain.handle('config:get-path', () => CONFIG_PATH)

ipcMain.handle('config:read', async () => {
  return await readConfig()
})

ipcMain.handle('config:save', async (_e, payload) => {
  // 持久化 paths/depth/exclude_paths/pinned 字段；pinned 未传则保留原值
  const prev = await readConfig()
  // 兼容字符串/数字两种深度入参，并在 [0, 5] 区间夹紧
  const rawDepth = Number(payload?.depth)
  const depth = Number.isFinite(rawDepth) ? Math.max(0, Math.min(5, rawDepth)) : 1
  const data = {
    paths: Array.isArray(payload?.paths) ? payload.paths : [],
    depth,
    exclude_paths: Array.isArray(payload?.exclude_paths) ? payload.exclude_paths : [],
    pinned: Array.isArray(payload?.pinned) ? payload.pinned : prev.pinned
  }
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8')
  return true
})

/**
 * 从一组 path 中过滤掉已经失效（不存在或不是目录）的项
 * 用于清理 pinned，避免冗余数据残留
 */
async function filterValidPaths(list) {
  const arr = Array.isArray(list) ? list : []
  const result = []
  for (const p of arr) {
    try {
      const stat = await fsp.stat(p)
      if (stat.isDirectory()) result.push(p)
    } catch {
      // 路径不存在或访问失败，丢弃
    }
  }
  return result
}

/** 写入 pinned 字段，复用其它字段不变 */
async function writePinned(pinned) {
  const prev = await readConfig()
  const data = {
    paths: prev.paths,
    depth: prev.depth,
    exclude_paths: prev.exclude_paths,
    pinned: Array.isArray(pinned) ? pinned : []
  }
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

/** 切换某个项目的 pin 状态，返回最新 pinned 数组 */
ipcMain.handle('pin:toggle', async (_e, targetPath) => {
  if (!targetPath) return []
  const cfg = await readConfig()
  const key = path.resolve(targetPath)
  // 先做一次失效清理，避免冗余数据残留
  let pinned = await filterValidPaths(cfg.pinned)
  const idx = pinned.findIndex((p) => path.resolve(p) === key)
  if (idx >= 0) pinned.splice(idx, 1)
  else pinned.push(key)
  await writePinned(pinned)
  return pinned
})

// ==================== 选择目录/文件 ====================
ipcMain.handle('dialog:select-directory', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:select-file', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// ==================== Shell 操作 ====================
/** 用系统默认程序打开文件或文件夹 */
ipcMain.handle('shell:open-folder', async (_e, targetPath) => {
  if (!targetPath) return { ok: false, message: '路径为空' }
  try {
    await fsp.access(targetPath, fs.constants.F_OK)
  } catch {
    return { ok: false, message: '文件或文件夹不存在' }
  }
  // shell.openPath 失败时返回非空错误字符串
  const err = await shell.openPath(targetPath)
  if (err) return { ok: false, message: err }
  return { ok: true }
})

/** 在文件管理器中显示并选中目标 */
ipcMain.handle('shell:show-in-folder', async (_e, targetPath) => {
  if (!targetPath) return { ok: false, message: '路径为空' }
  try {
    await fsp.access(targetPath, fs.constants.F_OK)
  } catch {
    return { ok: false, message: '文件或文件夹不存在' }
  }
  shell.showItemInFolder(targetPath)
  return { ok: true }
})

/** 用 vscode 打开指定路径，本质执行 `code <path>` */
ipcMain.handle('shell:open-in-vscode', (_e, targetPath) => {
  return new Promise((resolve) => {
    if (!targetPath) return resolve({ ok: false, message: '路径为空' })
    // windows 下 code 实际是 code.cmd，使用 shell:true 让其能找到
    const cmd = process.platform === 'win32' ? `code "${targetPath}"` : `code "${targetPath}"`
    exec(cmd, { shell: true }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, message: stderr || err.message })
      } else {
        resolve({ ok: true })
      }
    })
  })
})

/** 删除项目文件夹（递归） */
ipcMain.handle('shell:delete-folder', async (_e, targetPath) => {
  if (!targetPath) return { ok: false, message: '路径为空' }
  try {
    await fsp.rm(targetPath, { recursive: true, force: true })
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err.message }
  }
})

/**
 * 调起系统原生「属性」对话框
 * - Windows：把 PowerShell 脚本写到临时文件后执行，避免 cmd 引号转义丢失；
 *   通过 Shell.Application 的 InvokeVerb('Properties') 弹出对话框；
 *   在脚本末尾 Start-Sleep 让 COM 实例存活，对话框关闭后再退出。
 * - macOS：通过 osascript 让 Finder 打开 "信息" 窗口
 * - Linux：无统一 API，返回不支持
 */
ipcMain.handle('shell:show-properties', async (_e, targetPath) => {
  if (!targetPath) return { ok: false, message: '路径为空' }
  try {
    await fsp.access(targetPath, fs.constants.F_OK)
  } catch {
    return { ok: false, message: '文件或文件夹不存在' }
  }

  if (process.platform === 'win32') {
    // 写一个临时 ps1 脚本来彻底规避 cmd → powershell 的引号转义问题
    const safe = String(targetPath).replace(/'/g, "''")
    const ps = [
      "$ErrorActionPreference = 'Stop'",
      "$sh = New-Object -ComObject Shell.Application",
      `$folder = $sh.Namespace((Split-Path -Parent '${safe}'))`,
      `$item = $folder.ParseName((Split-Path -Leaf '${safe}'))`,
      "if ($item) { $item.InvokeVerb('Properties') }",
      // 让属性对话框有足够时间显示并被用户关闭，期间保持 COM 引用
      "Start-Sleep -Seconds 60"
    ].join('\r\n')

    const tmpFile = path.join(
      os.tmpdir(),
      `project-helper-props-${Date.now()}.ps1`
    )
    try {
      await fsp.writeFile(tmpFile, ps, 'utf-8')
    } catch (err) {
      return { ok: false, message: err.message }
    }

    return new Promise((resolve) => {
      // detached 让 PS 独立运行，主进程不阻塞；脚本退出后清理临时文件
      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpFile}"`,
        { windowsHide: true },
        (err) => {
          fsp.unlink(tmpFile).catch(() => {})
          if (err) resolve({ ok: false, message: err.message })
          else resolve({ ok: true })
        }
      )
      // 不等待 60 秒：写完脚本后立刻返回成功，让用户继续操作 UI
      resolve({ ok: true })
    })
  }

  if (process.platform === 'darwin') {
    const safe = String(targetPath).replace(/"/g, '\\"')
    const script = `tell application "Finder" to open information window of (POSIX file "${safe}" as alias)`
    return new Promise((resolve) => {
      exec(`osascript -e '${script}'`, (err) => {
        if (err) resolve({ ok: false, message: err.message })
        else resolve({ ok: true })
      })
    })
  }

  return { ok: false, message: '当前系统不支持查看属性' }
})

// ==================== 项目扫描 ====================
/**
 * 判定文件夹是否为一个项目：包含 .git 目录或 package.json 文件
 */
async function isProject(dir) {
  try {
    const [gitStat, pkgStat] = await Promise.allSettled([
      fsp.stat(path.join(dir, '.git')),
      fsp.stat(path.join(dir, 'package.json'))
    ])
    const hasGit = gitStat.status === 'fulfilled' && gitStat.value.isDirectory()
    const hasPkg = pkgStat.status === 'fulfilled' && pkgStat.value.isFile()
    return hasGit || hasPkg
  } catch {
    return false
  }
}

/**
 * 读取项目的展示信息：优先取 package.json 的 name/description
 * 若无 package.json，则名称用文件夹名，简介为空
 */
async function readProjectMeta(dir) {
  const folderName = path.basename(dir)
  const pkgPath = path.join(dir, 'package.json')
  try {
    const text = await fsp.readFile(pkgPath, 'utf-8')
    const pkg = JSON.parse(text)
    return {
      name: typeof pkg.name === 'string' && pkg.name.trim() ? pkg.name : folderName,
      description: typeof pkg.description === 'string' ? pkg.description : ''
    }
  } catch {
    return { name: folderName, description: '' }
  }
}

/** 路径标准化用于 exclude 匹配 */
function normalize(p) {
  return path.resolve(p).toLowerCase()
}

/**
 * 广度优先扫描：从 roots 出发，depth 为搜索边界，命中 exclude 则跳过
 * depth 语义：paths=["a"], depth=1 => 扫描 a/、a/aa/、a/bb/，不进入 a/aa/aaa
 * 即从 root 出发最多向下走 depth 层
 */
async function scanProjects(roots, depth, excludes) {
  const excludeSet = new Set((excludes || []).map(normalize))
  const visited = new Set()
  const projects = []

  // 队列元素：{ dir, level } level 表示相对 root 已下钻的层数
  const queue = []
  for (const r of roots || []) {
    if (!r) continue
    try {
      const stat = await fsp.stat(r)
      if (stat.isDirectory()) queue.push({ dir: path.resolve(r), level: 0 })
    } catch {
      // 路径不存在，跳过
    }
  }

  while (queue.length > 0) {
    const { dir, level } = queue.shift()
    const key = normalize(dir)
    if (visited.has(key)) continue
    visited.add(key)
    if (excludeSet.has(key)) continue

    // 当前层判定是否项目；若是项目则不再下钻
    if (await isProject(dir)) {
      const meta = await readProjectMeta(dir)
      projects.push({ path: dir, name: meta.name, description: meta.description })
      continue
    }

    // 未到深度边界，继续下钻
    if (level < depth) {
      let entries = []
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const ent of entries) {
        if (!ent.isDirectory()) continue
        // 跳过隐藏目录与常见噪音目录，避免无意义扫描
        if (ent.name.startsWith('.')) continue
        if (ent.name === 'node_modules') continue
        queue.push({ dir: path.join(dir, ent.name), level: level + 1 })
      }
    }
  }

  return projects
}

ipcMain.handle('projects:scan', async () => {
  const cfg = await readConfig()

  // 扫描时清理已失效的 pinned 路径，避免冗余残留；如有变化则落盘
  const validPinned = await filterValidPaths(cfg.pinned)
  if (validPinned.length !== (cfg.pinned || []).length) {
    try {
      await writePinned(validPinned)
    } catch (err) {
      console.error('[pin] 清理失效 pinned 失败:', err.message)
    }
  }
  const pinnedSet = new Set(validPinned.map((p) => path.resolve(p)))

  const list = await scanProjects(cfg.paths, cfg.depth, cfg.exclude_paths)
  // 标记每个项目的 pinned 状态
  for (const p of list) p.pinned = pinnedSet.has(path.resolve(p.path))
  // pinned 优先，其次按名称
  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return list
})

// ==================== 自动更新 ====================
/**
 * 配置 electron-updater：
 * - 启动后立即检查一次更新
 * - 每隔 1 小时再检查一次（保持 app 长时间打开时也能拿到新版本）
 * - 各阶段事件通过 'updater:status' 转发给渲染层做提示
 */
function setupAutoUpdater() {
  // dev 模式下打包信息不存在，调用会报错；直接跳过
  if (!app.isPackaged) return

  // 由用户在「有新版本」提示中确认后再下载，避免占用流量
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  const send = (status, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', { status, payload })
    }
  }

  autoUpdater.on('checking-for-update', () => send('checking'))
  autoUpdater.on('update-available', (info) => send('available', info))
  autoUpdater.on('update-not-available', (info) => send('not-available', info))
  autoUpdater.on('error', (err) =>
    send('error', { message: err?.message || String(err) })
  )
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
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 60 * 60 * 1000)
}

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
