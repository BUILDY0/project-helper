const { app, BrowserWindow, ipcMain, dialog, shell, Menu, clipboard } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const { exec, spawn } = require('node:child_process')
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
  // 任务栏 / 窗口图标
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

// 全局兜底：避免主进程未捕获异常 / Promise rejection 触发 Electron 原生错误对话框
// 这类异常多来自 autoUpdater 网络失败等非致命场景，仅写日志即可
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
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
  mainWindow = createWindow()

  // 启动期一次性探测可用 IDE（异步，不阻塞窗口）。结果缓存在 detectedIdes，
  // 渲染层通过 ide:get-available 直接读取，整个生命周期内不再重复 exec。
  detectIdesOnce().catch((err) => {
    console.error('[ide] 启动期探测失败:', err.message)
  })

  // 启动后台自动更新检查（仅打包后生效，dev 下 electron-updater 不会执行实际请求）
  setupAutoUpdater()
})

app.on('window-all-closed', () => {
  app.quit()
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

/** 用系统默认浏览器打开外部 url；仅放行 http(s) 协议，避免被恶意路径攻击 */
ipcMain.handle('shell:open-external', async (_e, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return { ok: false, message: '仅支持 http/https 链接' }
  }
  try {
    await shell.openExternal(url)
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err.message }
  }
})

/**
 * 已支持的 IDE 列表：
 * - id：渲染层用来标识/定位的 key
 * - label：菜单展示名
 * - cli：CLI 命令名，依赖系统 PATH 解析（Windows 下通常是 .cmd 包装脚本）
 *
 * 探测：`where <cli>`，能解析到即可用。
 * 打开：`<cli> "<path>"`，路径双引号包裹规避空格。
 *
 * 数组顺序即菜单展示顺序：VS Code → CodeBuddy → 其它 VSCode fork。
 */
const SUPPORTED_IDES = [
  { id: 'vscode', label: 'VS Code 打开', cli: 'code' },
  { id: 'codebuddy', label: 'CodeBuddy 打开', cli: 'buddycn' },
  { id: 'cursor', label: 'Cursor 打开', cli: 'cursor' },
  { id: 'trae', label: 'Trae 打开', cli: 'trae-cn' }
]

/** 探测 CLI 是否可用：执行 `where <cli>`，PATH 能解析到即视为可用 */
function probeIdeCli(cli) {
  return new Promise((resolve) => {
    exec(`where ${cli}`, { shell: true, timeout: 3000, windowsHide: true }, (err, stdout) => {
      resolve({ ok: !err && !!stdout && stdout.trim().length > 0 })
    })
  })
}

/** 启动期一次性探测的结果缓存，渲染层通过 ide:get-available 读取 */
let detectedIdes = []

/** 探测所有受支持的 IDE 可用性，并行执行 */
async function detectIdesOnce() {
  detectedIdes = await Promise.all(
    SUPPORTED_IDES.map(async (ide) => {
      const r = await probeIdeCli(ide.cli)
      return { id: ide.id, label: ide.label, cli: ide.cli, available: r.ok }
    })
  )
  return detectedIdes
}

/** 直接读取启动期缓存；尚未探测完时返回空数组，渲染层可显式调 ide:detect 等待结果 */
ipcMain.handle('ide:get-available', () => detectedIdes)

/** 强制重新探测（例如用户主动点"刷新 IDE"），并更新缓存 */
ipcMain.handle('ide:detect', async () => {
  return await detectIdesOnce()
})

/** 用指定 IDE 打开路径，CLI 名以白名单约束，避免渲染层注入任意命令 */
ipcMain.handle('shell:open-in-ide', (_e, { id, targetPath } = {}) => {
  return new Promise((resolve) => {
    if (!targetPath) return resolve({ ok: false, message: '路径为空' })
    const ide = SUPPORTED_IDES.find((x) => x.id === id)
    if (!ide) return resolve({ ok: false, message: `未知 IDE：${id}` })
    // 用双引号包裹路径，规避路径中空格；CLI 名来自白名单，无注入风险
    const cmd = `${ide.cli} "${targetPath}"`
    exec(cmd, { shell: true, windowsHide: true }, (err, _stdout, stderr) => {
      if (err) resolve({ ok: false, message: stderr || err.message })
      else resolve({ ok: true })
    })
  })
})

/** 写入系统剪贴板：仅 string，避免渲染层传非预期类型 */
ipcMain.handle('clipboard:write-text', (_e, text) => {
  if (typeof text !== 'string') return { ok: false, message: '内容非字符串' }
  try {
    clipboard.writeText(text)
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err.message }
  }
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

/** 调起系统原生「文件夹属性」对话框（Windows） */
ipcMain.handle('shell:show-properties', async (_e, targetPath) => {
  if (!targetPath) return { ok: false, message: '路径为空' }
  try {
    await fsp.access(targetPath, fs.constants.F_OK)
  } catch {
    return { ok: false, message: '文件或文件夹不存在' }
  }

  // PS 脚本：P/Invoke 调 shell32!SHObjectProperties 弹属性框，自跑 60s 消息泵维持对话框
  const safe = String(targetPath).replace(/'/g, "''")
  const ps = `
$target = '${safe}'
Add-Type -Namespace Win32 -Name Shell32 -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("shell32.dll", CharSet = System.Runtime.InteropServices.CharSet.Unicode)]
public static extern bool SHObjectProperties(System.IntPtr hwnd, uint shopObjectType, string pszObjectName, string pszPropertyPage);
'@
Add-Type -AssemblyName System.Windows.Forms
Write-Host 'BEFORE_INVOKE'
[Win32.Shell32]::SHObjectProperties([System.IntPtr]::Zero, 2, $target, '') | Out-Null
$end = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $end) { [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 50 }
`.trim()

  // 写临时 .ps1（UTF-8 BOM 让 PS 5.1 正确解析中文路径），跑完用 BEFORE_INVOKE 确认对话框已弹出
  const tmpFile = path.join(os.tmpdir(), `project-helper-props-${Date.now()}.ps1`)
  try {
    await fsp.writeFile(tmpFile, '\uFEFF' + ps, 'utf-8')
  } catch (err) {
    return { ok: false, message: '写入临时脚本失败: ' + err.message }
  }

  return new Promise((resolve) => {
    const done = (r) => { fsp.unlink(tmpFile).catch(() => {}); resolve(r) }
    const child = spawn('cmd.exe',
      ['/c', 'powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-File', tmpFile],
      { windowsHide: true }
    )
    child.stdout?.on('data', (c) => c.toString('utf-8').includes('BEFORE_INVOKE') && done({ ok: true }))
    child.on('error', (err) => done({ ok: false, message: err.message }))
    child.on('exit', (code) => done({ ok: false, message: `PowerShell 异常退出 (code=${code})` }))
  })
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
 * 在目录下查找 README 文件（大小写不敏感），返回首个匹配的绝对路径；找不到返回 null
 * 仅匹配文件名为 readme.md 的项，避免把 README.txt / README 之类纳入
 */
async function findReadmeFile(dir) {
  let entries = []
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return null
  }
  for (const ent of entries) {
    if (!ent.isFile()) continue
    if (ent.name.toLowerCase() === 'readme.md') {
      return path.join(dir, ent.name)
    }
  }
  return null
}

/**
 * 读取 README 文件第一行作为描述：去除 markdown 标题前缀（# / ## ...）和首尾空白
 * 读取失败或为空返回空串
 */
async function readReadmeFirstLine(readmePath) {
  try {
    const text = await fsp.readFile(readmePath, 'utf-8')
    // 跳过开头的空行，取首个非空行
    const lines = text.split(/\r?\n/)
    for (const raw of lines) {
      const line = raw.replace(/^\uFEFF/, '').trim()
      if (!line) continue
      // 去掉 markdown 标题前缀（# 号及其后空白），保留纯文本
      return line.replace(/^#+\s*/, '').trim()
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * 把 git remote url 标准化为可在浏览器打开的 https 形式：
 * - https://github.com/u/r.git           -> https://github.com/u/r
 * - git@github.com:u/r.git               -> https://github.com/u/r
 * - ssh://git@github.com/u/r.git         -> https://github.com/u/r
 * - github:u/r（package.json 简写）       -> https://github.com/u/r
 * 非 GitHub host 也按通用规则转换（gitlab 等同样适用）。
 */
function normalizeGitUrl(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.trim()
  if (!s) return ''
  // package.json 简写："github:user/repo" / "user/repo"
  const shorthand = s.match(/^(?:github:)?([\w.-]+\/[\w.-]+)$/i)
  if (shorthand) return `https://github.com/${shorthand[1].replace(/\.git$/, '')}`
  // git@host:user/repo(.git)
  const ssh = s.match(/^git@([^:]+):(.+?)(?:\.git)?$/i)
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`
  // ssh://git@host/user/repo(.git)
  s = s.replace(/^ssh:\/\/git@/i, 'https://')
  s = s.replace(/^git\+/i, '')
  s = s.replace(/\.git$/i, '')
  if (!/^https?:\/\//i.test(s)) return ''
  return s
}

/** 从 .git/config 读取 origin 的 url；找不到返回空 */
async function readGitConfigUrl(dir) {
  try {
    const text = await fsp.readFile(path.join(dir, '.git', 'config'), 'utf-8')
    // 简易解析：找到 [remote "origin"] 段内的 url 行
    const m = text.match(/\[remote "origin"\][^[]*?url\s*=\s*(\S+)/i)
    return m ? m[1] : ''
  } catch {
    return ''
  }
}

/**
 * 读取项目的展示信息：
 * - name：package.json 的 name 字段（非空） > 文件夹名
 * - description：package.json.description（非空） > readme.md 第一行（大小写兼容） > 空串
 *   description 来源相互独立：只要 package.json 没给出有效 description，就继续尝试 README。
 * - gitUrl：.git/config origin > package.json.repository（含简写），归一为 https 链接
 * - hasPackageJson：是否存在 package.json（用于卡片展示 Node.js 状态图标）
 */
async function readProjectMeta(dir) {
  const folderName = path.basename(dir)
  const pkgPath = path.join(dir, 'package.json')

  let pkgName = ''
  let pkgDesc = ''
  let pkgRepoUrl = ''
  let hasPackageJson = false
  try {
    const text = await fsp.readFile(pkgPath, 'utf-8')
    const pkg = JSON.parse(text)
    hasPackageJson = true
    if (typeof pkg.name === 'string' && pkg.name.trim()) pkgName = pkg.name.trim()
    if (typeof pkg.description === 'string' && pkg.description.trim()) {
      pkgDesc = pkg.description.trim()
    }
    // repository 可能是 string 或 { url: '...' }
    const repo = pkg.repository
    if (typeof repo === 'string') pkgRepoUrl = repo
    else if (repo && typeof repo.url === 'string') pkgRepoUrl = repo.url
  } catch {
    // 无 package.json 或解析失败：相关字段维持空，统一走下面的回退逻辑
  }

  // 查 readme.md（大小写不敏感）：用作 description 的回退来源，也作为卡片"是否有 README"状态
  const readmePath = await findReadmeFile(dir)
  let description = pkgDesc
  if (!description && readmePath) {
    description = await readReadmeFirstLine(readmePath)
  }

  // gitUrl：.git/config 优先（更准；本地未推送也能拿到实际 origin），其次 package.json.repository
  const rawGit = (await readGitConfigUrl(dir)) || pkgRepoUrl
  const gitUrl = normalizeGitUrl(rawGit)

  return {
    name: pkgName || folderName,
    description,
    gitUrl,
    hasPackageJson,
    readmePath: readmePath || ''
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
    // 命中 exclude 是唯一会跳过当前路径的情况（不收录、不下钻）
    if (excludeSet.has(key)) continue

    // 当前层若是项目则收录，但不影响下钻：monorepo 场景外层项目里可能还有子项目
    if (await isProject(dir)) {
      const meta = await readProjectMeta(dir)
      projects.push({ path: dir, ...meta })
    }

    // 未到深度边界则继续下钻
    if (level < depth) {
      let entries = []
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const ent of entries) {
        if (!ent.isDirectory()) continue
        // 跳过隐藏目录与 node_modules：内含成百上千伪项目，扫描成本与噪音都不可接受
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
  // 关闭 electron-updater 内部 logger（默认会用 console，错误信息不弹窗，但避免日志噪音）
  autoUpdater.logger = null

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
