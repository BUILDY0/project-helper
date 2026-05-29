const { app, ipcMain } = require('electron')
const path = require('node:path')
const fsp = require('node:fs/promises')
const os = require('node:os')

const { normalizePaths } = require('../../shared/path-types.js')
const { DEFAULT_THEME, normalizeTheme } = require('../../shared/theme.js')

// 应用工作目录与配置文件：放在用户主目录下的独立目录，避免污染 home
const APP_HOME = path.join(os.homedir(), '.project-helper')
const CONFIG_PATH = path.join(APP_HOME, 'config.json')

// ==================== 配置读写 ====================

const DEFAULT_CONFIG = {
  paths: [],
  depth: 1,
  exclude_paths: [],
  pinned: [],
  theme: DEFAULT_THEME,
  auto_run_startup: false
}

/** 把读到的原始 json 归一化为完整 config（不含 mtime / config_path） */
function normalizeConfig(json) {
  return {
    paths: normalizePaths(json?.paths),
    depth: typeof json?.depth === 'number' ? json.depth : 1,
    exclude_paths: Array.isArray(json?.exclude_paths) ? json.exclude_paths : [],
    pinned: Array.isArray(json?.pinned) ? json.pinned : [],
    theme: normalizeTheme(json?.theme),
    auto_run_startup: !!json?.auto_run_startup
  }
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
      ...normalizeConfig(json),
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

/**
 * 部分更新配置：读取现有 config，浅合并 patch 后整体写回
 * 用于只想改一两个字段、其它字段保持不变的场景
 */
async function patchConfig(patch) {
  const prev = await readConfig()
  // 仅取持久化字段，剔除 config_path / mtime 等派生字段
  const base = {
    paths: prev.paths,
    depth: prev.depth,
    exclude_paths: prev.exclude_paths,
    pinned: prev.pinned,
    theme: prev.theme,
    auto_run_startup: prev.auto_run_startup
  }
  await writeConfig({ ...base, ...(patch || {}) })
}

async function writePinned(pinned) {
  await patchConfig({ pinned: Array.isArray(pinned) ? pinned : [] })
}

async function writeTheme(theme) {
  await patchConfig({ theme: normalizeTheme(theme) })
}

async function writeAutoRunStartup(enabled) {
  await patchConfig({ auto_run_startup: !!enabled })
}

// ==================== 开机自启 ====================
// 注：本项目仅在 Windows 平台发布，下方代码不再做平台判断

function getSystemLoginItemEnabled() {
  try {
    return !!app.getLoginItemSettings().openAtLogin
  } catch (err) {
    console.error('[config] 读取系统开机自启状态失败:', err.message)
    return false
  }
}

/**
 * 把 auto_run_startup 配置同步到系统层面的开机自启项
 * @returns {{ appliedToSystem: boolean, reason?: string }}
 */
function applyAutoRunStartup(enabled) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[config] dev 模式跳过开机自启写入：', enabled)
    return { appliedToSystem: false, reason: 'dev' }
  }
  try {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      // 显式指定可执行文件路径，避免 electron-updater 升级后用旧 execPath
      path: process.execPath,
      args: []
    })
    return { appliedToSystem: true }
  } catch (err) {
    console.error('[config] 设置开机自启失败:', err.message)
    return { appliedToSystem: false, reason: 'error: ' + err.message }
  }
}

/**
 * 启动期同步：以系统层为准
 * 用户可能在 Windows 启动管理器里手动取消，应用启动时反向修正 config，避免被反复覆盖
 */
async function syncAutoRunStartupOnStartup() {
  const sysEnabled = getSystemLoginItemEnabled()
  const cfg = await readConfig()
  if (cfg.auto_run_startup !== sysEnabled) {
    console.log(
      '[config] 启动期同步开机自启：config=%s, system=%s，以系统层为准',
      cfg.auto_run_startup,
      sysEnabled
    )
    await writeAutoRunStartup(sysEnabled)
  }
}

// ==================== IPC ====================

/** 注册配置类 IPC：config:* 与 pin:toggle */
function registerConfigIpc() {
  ipcMain.handle('config:get-path', () => CONFIG_PATH)

  ipcMain.handle('config:read', async () => {
    return await readConfig()
  })

  ipcMain.handle('config:save', async (_e, payload) => {
    const prev = await readConfig()
    // 兼容字符串/数字两种深度入参，并在 [0, 5] 区间夹紧
    const rawDepth = Number(payload?.depth)
    const depth = Number.isFinite(rawDepth) ? Math.max(0, Math.min(5, rawDepth)) : 1
    const autoRun =
      typeof payload?.auto_run_startup === 'boolean'
        ? payload.auto_run_startup
        : prev.auto_run_startup
    await writeConfig({
      paths: normalizePaths(payload?.paths),
      depth,
      exclude_paths: Array.isArray(payload?.exclude_paths) ? payload.exclude_paths : [],
      pinned: Array.isArray(payload?.pinned) ? payload.pinned : prev.pinned,
      theme: normalizeTheme(payload?.theme ?? prev.theme),
      auto_run_startup: autoRun
    })

    // 仅在变化时调 setLoginItemSettings，避免无谓写注册表
    let autoRunResult = { appliedToSystem: true, reason: 'unchanged' }
    if (autoRun !== prev.auto_run_startup) {
      autoRunResult = applyAutoRunStartup(autoRun)
    }

    return { ok: true, autoRun: autoRunResult }
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
  patchConfig,
  writePinned,
  writeTheme,
  writeAutoRunStartup,
  filterValidPaths,
  applyAutoRunStartup,
  getSystemLoginItemEnabled,
  syncAutoRunStartupOnStartup,
  registerConfigIpc
}
