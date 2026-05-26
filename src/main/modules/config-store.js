const { ipcMain } = require('electron')
const path = require('node:path')
const fsp = require('node:fs/promises')
const os = require('node:os')

// 应用工作目录与配置文件：放在用户主目录下的独立目录，避免污染 home
const APP_HOME = path.join(os.homedir(), '.project-helper')
const CONFIG_PATH = path.join(APP_HOME, 'config.json')

// ==================== 配置读写 ====================
// 支持的主题枚举；非法或缺省值会回落到 light
const THEME_VALUES = ['light', 'dark']
const DEFAULT_THEME = 'light'
const DEFAULT_CONFIG = {
  paths: [],
  depth: 1,
  exclude_paths: [],
  pinned: [],
  theme: DEFAULT_THEME
}

/** 把任意输入夹紧到合法的主题枚举 */
function normalizeTheme(v) {
  return THEME_VALUES.includes(v) ? v : DEFAULT_THEME
}

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

  // 写入默认模板
  try {
    await writeConfig(DEFAULT_CONFIG)
    console.log('[config] 已创建默认配置文件:', CONFIG_PATH)
  } catch (err) {
    console.error('[config] 创建默认配置失败:', err.message)
    throw err
  }
}

/** 序列化并落盘配置文件，统一序列化格式 */
async function writeConfig(data) {
  await fsp.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8')
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
      theme: normalizeTheme(json.theme),
      mtime
    }
  } catch (err) {
    // 文件解析失败时返回默认值，避免页面崩溃
    return { config_path: CONFIG_PATH, ...DEFAULT_CONFIG, mtime: 0 }
  }
}

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
    pinned: Array.isArray(pinned) ? pinned : [],
    theme: normalizeTheme(prev.theme)
  }
  await writeConfig(data)
}

/** 写入 theme 字段，复用其它字段不变 */
async function writeTheme(theme) {
  const prev = await readConfig()
  const data = {
    paths: prev.paths,
    depth: prev.depth,
    exclude_paths: prev.exclude_paths,
    pinned: prev.pinned,
    theme: normalizeTheme(theme)
  }
  await writeConfig(data)
}

/** 注册配置类 IPC：config:* 与 pin:toggle */
function registerConfigIpc() {
  ipcMain.handle('config:get-path', () => CONFIG_PATH)

  ipcMain.handle('config:read', async () => {
    return await readConfig()
  })

  ipcMain.handle('config:save', async (_e, payload) => {
    // 持久化 paths/depth/exclude_paths/pinned/theme 字段；pinned/theme 未传则保留原值
    const prev = await readConfig()
    // 兼容字符串/数字两种深度入参，并在 [0, 5] 区间夹紧
    const rawDepth = Number(payload?.depth)
    const depth = Number.isFinite(rawDepth) ? Math.max(0, Math.min(5, rawDepth)) : 1
    const data = {
      paths: Array.isArray(payload?.paths) ? payload.paths : [],
      depth,
      exclude_paths: Array.isArray(payload?.exclude_paths) ? payload.exclude_paths : [],
      pinned: Array.isArray(payload?.pinned) ? payload.pinned : prev.pinned,
      theme:
        payload?.theme !== undefined ? normalizeTheme(payload.theme) : normalizeTheme(prev.theme)
    }
    await writeConfig(data)
    return true
  })

  /** 仅保存主题，不影响其他字段 —— 用于切换主题时立即写盘 */
  ipcMain.handle('config:save-theme', async (_e, theme) => {
    await writeTheme(theme)
    return true
  })

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
}

module.exports = {
  APP_HOME,
  CONFIG_PATH,
  ensureConfigFile,
  readConfig,
  writePinned,
  writeTheme,
  filterValidPaths,
  registerConfigIpc
}
