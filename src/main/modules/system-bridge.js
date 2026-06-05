const { BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const { exec, spawn } = require('node:child_process')
const os = require('node:os')

const { readConfig, patchConfig, appendRecentOpened } = require('./config-store')
const { bus, Events } = require('./event-bus')
const { runWithConcurrency } = require('../../shared/task')

/** 创建主窗口：无边框，使用自定义顶部 banner */
function createWindow() {
  // 任务栏 / 窗口图标（__dirname 指向 src/main/modules，需回退三层到工程根）
  const iconPath = path.join(__dirname, '..', '..', '..', 'build', 'icon.ico')
  const winOptions = {
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#f5f5f7',
    webPreferences: {
      // preload 入口：src/preload/index.js
      preload: path.join(__dirname, '..', '..', 'preload', 'index.js'),
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
    // 渲染产物在工程根的 dist/，从 src/main/modules 回退三层
    win.loadFile(path.join(__dirname, '..', '..', '..', 'dist', 'index.html'))
  }

  // 窗口最大化状态变化通知渲染进程，便于切换图标
  win.on('maximize', () => win.webContents.send('window:maximize-change', true))
  win.on('unmaximize', () => win.webContents.send('window:maximize-change', false))

  return win
}

/**
 * 默认 IDE 配置：
 * - id：唯一标识，渲染层 action key；默认配置写死字符串，用户配置自动生成 `${entry}::${script}`
 * - name：IDE 名称，用于占位符 `<name>` 的解析
 * - label：菜单展示名，支持 `<name>`/`<entry>` 占位符
 * - entry：CLI 入口命令，用于 `where <entry>` 探测可用性；多条配置可共享同一 entry，
 *   内部用 Set 去重，每个 entry 只探测一次
 * - script：执行命令模板，支持 `<name>`/`<entry>`/`<path>` 占位符
 *
 * 数组顺序即菜单展示顺序：VS Code → CodeBuddy → 其它 VSCode fork。
 */
const DEFAULT_IDES = [
  { id: 'vscode', name: 'VS Code', entry: 'code', label: '<name> 打开', script: '<entry> <path>' },
  {
    id: 'codebuddy-cn',
    name: 'CodeBuddy CN',
    entry: 'buddycn',
    label: '<name> 打开',
    script: '<entry> <path>'
  },
  { id: 'cursor', name: 'Cursor', entry: 'cursor', label: '<name> 打开', script: '<entry> <path>' },
  {
    id: 'trae-cn',
    name: 'Trae-CN',
    entry: 'trae-cn',
    label: '<name> 打开',
    script: '<entry> <path>'
  }
]

/**
 * 将模板字符串中的静态占位符替换为 ide 对应字段值。
 * - `<name>`  → ide.name
 * - `<entry>` → ide.entry
 * - `<path>`  为运行时参数（目标项目路径），构建期无值，不在此处理，执行时单独替换
 */
function resolveIdeMeta(tpl, ide) {
  return tpl.replace('<name>', ide.name ?? '').replace('<entry>', ide.entry ?? '')
}

/**
 * 将默认配置与用户配置归一化合并为最终 IDE 检测列表。
 * - 默认配置 id 写死；用户配置 id 自动生成为 `${entry}::${script}`
 * - label/script 中的占位符在此统一解析（<path> 除外，执行时再替换）
 * - 顺序：默认配置在前，用户配置追加末尾
 * @param {Array} userIdes 用户自定义 IDE 配置（ide_cfg.extends）
 */
function buildIdeList(userIdes = []) {
  const resolve = (item) => ({
    ...item,
    label: resolveIdeMeta(item.label, item),
    script: resolveIdeMeta(item.script, item)
  })
  const defaults = DEFAULT_IDES.map(resolve)
  const normalized = userIdes.map((item) =>
    resolve({ ...item, id: `${item.entry}::${item.script}` })
  )
  return [...defaults, ...normalized]
}

/**
 * 探测单个 entry 是否可用：执行 `where <entry>`，PATH 能解析到即视为可用
 * @param {string} entry
 * @returns {Promise<boolean>}
 */
function probeIdeEntry(entry) {
  return new Promise((resolve) => {
    exec(`where ${entry}`, { shell: true, timeout: 3000, windowsHide: true }, (err, stdout) => {
      resolve(!err && !!stdout && stdout.trim().length > 0)
    })
  })
}

/** 已检测到的 IDE 列表缓存；渲染层通过 ide:get-available 读取 */
let detectedIdes = []

/** 当前运行时 IDE 列表（默认 + 用户配置合并，每次重新探测时由 detectIdesOnce 刷新） */
let SUPPORTED_IDES = buildIdeList()

/**
 * 推送机制 IDE 检测：
 * - 从 config 读取用户扩展配置，合并重建 SUPPORTED_IDES
 * - 相同 entry 去重，并发数限制为 3
 * - 每完成一个 entry 探测即推送当前结果（发布订阅），视图层可实时渲染
 * - 返回最终完整的 detectedIdes
 * @param {{ onProgress?: (list: Array) => void }} [opts]
 */
async function detectIdesOnce(opts = {}) {
  let userExtends = []
  try {
    const cfg = await readConfig()
    userExtends = Array.isArray(cfg.ide_cfg?.extends) ? cfg.ide_cfg.extends : []
  } catch {}
  SUPPORTED_IDES = buildIdeList(userExtends)

  const uniqueEntries = [...new Set(SUPPORTED_IDES.map((ide) => ide.entry))]
  const entryAvailable = new Map(uniqueEntries.map((e) => [e, false]))

  const buildSnapshot = () =>
    SUPPORTED_IDES.map((ide) => ({
      id: ide.id,
      name: ide.name,
      label: ide.label,
      entry: ide.entry,
      script: ide.script,
      available: entryAvailable.get(ide.entry) ?? false
    }))

  const tasks = uniqueEntries.map((entry) => async () => {
    const ok = await probeIdeEntry(entry)
    entryAvailable.set(entry, ok)
    detectedIdes = buildSnapshot()
    opts.onProgress?.(detectedIdes)
    return ok
  })

  await runWithConcurrency(tasks, 3)
  detectedIdes = buildSnapshot()
  return detectedIdes
}

/**
 * 文件夹重命名后，把配置里记录的路径同步到新位置。
 * 若 p 恰为 oldBase，或位于 oldBase 子孙路径下，则用 newBase 替换其前缀；
 * 否则原样返回。比较在 Windows 下大小写不敏感。
 *
 * @returns {{ value: string, changed: boolean }}
 */
function remapPathPrefix(p, oldBase, newBase) {
  if (typeof p !== 'string' || !p) return { value: p, changed: false }
  const resolved = path.resolve(p)
  const oldResolved = path.resolve(oldBase)
  const lower = resolved.toLowerCase()
  const oldLower = oldResolved.toLowerCase()
  if (lower === oldLower) return { value: newBase, changed: true }
  // 子孙路径：以「oldBase + 分隔符」为前缀，保留其余部分拼到 newBase 之后
  if (lower.startsWith(oldLower + path.sep)) {
    return { value: path.join(newBase, resolved.slice(oldResolved.length)), changed: true }
  }
  return { value: p, changed: false }
}

/**
 * 主进程内部用：用默认 IDE 打开项目路径
 * 优先级：ide_cfg.default 配置的 IDE > 检测到的第一个可用 IDE > vscode CLI > shell.openPath
 * @returns {Promise<{ ok: boolean }>} 托盘调用不关心返回值，渲染层通过 shell:open-with-default 消费
 */
function openProjectWithDefaultIde(targetPath) {
  return new Promise((resolve) => {
    if (!targetPath) return resolve({ ok: false })

    const tryExec = (script) =>
      new Promise((r) => {
        exec(script, { shell: true, windowsHide: true }, (err) => r(!err))
      })

    const notifyOpened = async () => {
      await appendRecentOpened(targetPath).catch(() => {})
      bus.emit(Events.PROJECT_OPENED, { projectPath: targetPath })
    }

    const buildScript = (ide) => ide.script.replace('<path>', `"${targetPath}"`)

    const run = async () => {
      let defaultId = null
      try {
        const cfg = await readConfig()
        defaultId = cfg.ide_cfg?.default ?? null
      } catch {}

      const available = detectedIdes.filter((x) => x.available)

      if (defaultId) {
        const preferred = available.find((x) => x.id === defaultId)
        if (preferred && (await tryExec(buildScript(preferred)))) {
          await notifyOpened()
          return resolve({ ok: true })
        }
      }

      const first = available[0]
      if (first && (await tryExec(buildScript(first)))) {
        await notifyOpened()
        return resolve({ ok: true })
      }

      if (!first || first.entry !== 'code') {
        if (await tryExec(`code "${targetPath}"`)) {
          await notifyOpened()
          return resolve({ ok: true })
        }
      }

      await shell.openPath(targetPath).catch(() => {})
      await notifyOpened()
      resolve({ ok: true })
    }
    run().catch((err) => resolve({ ok: false, message: err.message }))
  })
}

/**
 * 一次性注册所有「主进程 ↔ 系统/窗口」桥接 IPC：
 * - 窗口控制（window:*）
 * - 文件/目录选择对话框（dialog:*）
 * - shell 跳转/删除/外链（shell:*）
 * - IDE 探测与打开（ide:* / shell:open-in-ide）
 * - 剪贴板（clipboard:*）
 * - Windows 原生属性框（shell:show-properties）
 */
function registerSystemBridge() {
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

  // 注：app:quit 由 index.js 注册，直接复用 forceQuit，避免退出语义在两处漂移

  // ==================== 开发模式辅助 ====================
  /** 渲染层用来判断是否处于开发环境，决定是否显示 dev-only 入口（如 console 按钮） */
  ipcMain.handle('app:is-dev', () => process.env.NODE_ENV === 'development')

  /** 切换 DevTools 显示：仅 dev 模式生效，避免打包后用户误打开 */
  ipcMain.handle('devtools:toggle', (e) => {
    if (process.env.NODE_ENV !== 'development') return false
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return false
    if (win.webContents.isDevToolsOpened()) win.webContents.closeDevTools()
    else win.webContents.openDevTools({ mode: 'detach' })
    return win.webContents.isDevToolsOpened()
  })

  // ==================== 选择目录/文件 ====================
  /**
   * 选择目录
   * @param {object} [options]
   * @param {boolean} [options.multi=false] 是否允许多选
   * @returns {Promise<string|string[]|null>} 单选返回字符串、多选返回数组；取消返回 null
   */
  ipcMain.handle('dialog:select-directory', async (e, options = {}) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const multi = !!options?.multi
    const properties = ['openDirectory']
    if (multi) properties.push('multiSelections')
    const result = await dialog.showOpenDialog(win, { properties })
    if (result.canceled || result.filePaths.length === 0) return null
    return multi ? result.filePaths : result.filePaths[0]
  })

  ipcMain.handle('dialog:select-file', async (e, options = {}) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const multi = !!options?.multi
    const properties = ['openFile']
    if (multi) properties.push('multiSelections')
    const result = await dialog.showOpenDialog(win, { properties })
    if (result.canceled || result.filePaths.length === 0) return null
    return multi ? result.filePaths : result.filePaths[0]
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

  // ==================== IDE 探测 / 打开 ====================
  /** 直接读取启动期缓存；尚未探测完时返回空数组，渲染层可显式调 ide:detect 等待结果 */
  ipcMain.handle('ide:get-available', () => detectedIdes)

  /**
   * 强制重新探测 IDE 可用性，并通过 ide:detect-progress 事件逐步推送结果。
   * 返回最终完整列表。
   */
  ipcMain.handle('ide:detect', async (e) => {
    const sender = e.sender
    return await detectIdesOnce({
      onProgress: (list) => {
        if (!sender.isDestroyed()) {
          sender.send('ide:detect-progress', list)
        }
      }
    })
  })

  /**
   * 探测单个 entry 是否存在（弹窗"检测"按钮用）
   * @param {string} entry
   * @returns {Promise<{ ok: boolean }>}
   */
  ipcMain.handle('ide:probe-entry', async (_e, entry) => {
    if (!entry || typeof entry !== 'string') return { ok: false }
    const ok = await probeIdeEntry(entry.trim())
    return { ok }
  })

  /**
   * 调试 IDE 脚本：执行占位符已替换好的命令，仅用于验证脚本可执行
   * @param {string} cmd 已完成占位替换的命令字符串
   */
  ipcMain.handle('ide:debug-script', (_e, cmd) => {
    return new Promise((resolve) => {
      if (!cmd || typeof cmd !== 'string') return resolve({ ok: false, message: '命令为空' })
      exec(
        cmd.trim(),
        { shell: true, timeout: 5000, windowsHide: true },
        (err, _stdout, stderr) => {
          if (err) resolve({ ok: false, message: stderr?.trim() || err.message })
          else resolve({ ok: true })
        }
      )
    })
  })

  /**
   * 保存 ide_cfg 到 config.json（patch 写，不影响其他字段）
   * @param {{ default?: string, exclude?: string[], extends?: Array }} payload
   */
  ipcMain.handle('ide:save-config', async (_e, payload) => {
    try {
      const ideCfg = {
        default: typeof payload?.default === 'string' ? payload.default : '',
        exclude: Array.isArray(payload?.exclude) ? payload.exclude : [],
        extends: Array.isArray(payload?.extends) ? payload.extends : []
      }
      await patchConfig({ ide_cfg: ideCfg })
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  })

  /**
   * 用"默认 IDE"打开路径：直接调用 openProjectWithDefaultIde，复用降级链。
   */
  ipcMain.handle('shell:open-with-default', (_e, targetPath) => {
    return openProjectWithDefaultIde(targetPath)
  })

  /** 用指定 IDE 打开路径，id 取自 detectedIdes；script 中 `<entry>` 和 `<path>` 自动替换 */
  ipcMain.handle('shell:open-in-ide', (_e, { id, targetPath } = {}) => {
    return new Promise((resolve) => {
      if (!targetPath) return resolve({ ok: false, message: '路径为空' })
      const ide = SUPPORTED_IDES.find((x) => x.id === id)
      if (!ide) return resolve({ ok: false, message: `未知 IDE：${id}` })
      const cmd = ide.script.replace('<path>', `"${targetPath}"`)
      exec(cmd, { shell: true, windowsHide: true }, async (err, _stdout, stderr) => {
        if (err) {
          resolve({ ok: false, message: stderr || err.message })
        } else {
          await appendRecentOpened(targetPath).catch(() => {})
          bus.emit(Events.PROJECT_OPENED, { projectPath: targetPath })
          resolve({ ok: true })
        }
      })
    })
  })

  // ==================== 剪贴板 ====================
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

  // ==================== 删除文件夹 ====================
  /** 删除项目文件夹：默认移入回收站，force=true 时递归永久删除 */
  ipcMain.handle('shell:delete-folder', async (_e, payload) => {
    const targetPath = typeof payload === 'string' ? payload : payload?.targetPath
    const forceDelete = typeof payload === 'object' && !!payload?.force
    if (!targetPath) return { ok: false, message: '路径为空' }
    try {
      await fsp.access(targetPath, fs.constants.F_OK)
      if (forceDelete) {
        await fsp.rm(targetPath, { recursive: true, force: true })
      } else {
        await shell.trashItem(targetPath)
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  })

  // ==================== 重命名文件夹 ====================
  /**
   * 重命名项目文件夹：在原父级目录下改名。
   * - 校验新名非空且不含路径分隔符 / Windows 文件名非法字符
   * - 目标已存在（非纯大小写变化）时拒绝，避免覆盖
   * - 成功后把配置中记录的扫描根 / 排除路径 / 置顶同步到新位置
   * 返回 { ok, path }，path 为改名后的新绝对路径
   */
  ipcMain.handle('shell:rename-folder', async (_e, payload) => {
    const targetPath = payload?.targetPath
    const newName = typeof payload?.newName === 'string' ? payload.newName.trim() : ''
    if (!targetPath) return { ok: false, message: '路径为空' }
    if (!newName) return { ok: false, message: '名称不能为空' }
    if (/[\\/:*?"<>|]/.test(newName)) {
      return { ok: false, message: '名称不能包含 \\ / : * ? " < > | 等字符' }
    }

    try {
      await fsp.access(targetPath, fs.constants.F_OK)
    } catch {
      return { ok: false, message: '原文件夹不存在' }
    }

    const newPath = path.join(path.dirname(targetPath), newName)
    // 名称未变化：无需任何操作
    if (path.basename(targetPath) === newName) return { ok: true, path: newPath }

    // 目标已存在则拒绝；仅纯大小写变化（同一路径）放行，交给 rename 处理
    if (newPath.toLowerCase() !== targetPath.toLowerCase()) {
      try {
        await fsp.access(newPath, fs.constants.F_OK)
        return { ok: false, message: '同级目录下已存在同名文件夹' }
      } catch {
        // 不存在，可以改名
      }
    }

    try {
      await fsp.rename(targetPath, newPath)
    } catch (err) {
      return { ok: false, message: err.message }
    }

    // 同步配置中记录的路径（扫描根 / 排除路径 / 置顶），避免改名后扫描不到或残留失效项。
    // 同时覆盖被重命名文件夹的子孙路径（如配置项恰好位于其内部）。
    try {
      const cfg = await readConfig()
      let changed = false

      const nextPaths = (cfg.paths || []).map((item) => {
        const r = remapPathPrefix(item.path, targetPath, newPath)
        if (!r.changed) return item
        changed = true
        return { ...item, path: r.value }
      })
      const nextExcludes = (cfg.exclude_paths || []).map((p) => {
        const r = remapPathPrefix(p, targetPath, newPath)
        if (r.changed) changed = true
        return r.value
      })
      const nextPinned = (cfg.pinned || []).map((p) => {
        const r = remapPathPrefix(p, targetPath, newPath)
        if (r.changed) changed = true
        return r.value
      })

      if (changed) {
        await patchConfig({
          paths: nextPaths,
          exclude_paths: nextExcludes,
          pinned: nextPinned
        })
      }
    } catch (err) {
      console.error('[rename] 同步配置路径失败:', err.message)
    }

    return { ok: true, path: newPath }
  })

  // ==================== Windows 原生属性框 ====================
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
      const done = (r) => {
        fsp.unlink(tmpFile).catch(() => {})
        resolve(r)
      }
      const child = spawn(
        'cmd.exe',
        ['/c', 'powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-STA', '-File', tmpFile],
        { windowsHide: true }
      )
      child.stdout?.on(
        'data',
        (c) => c.toString('utf-8').includes('BEFORE_INVOKE') && done({ ok: true })
      )
      child.on('error', (err) => done({ ok: false, message: err.message }))
      child.on('exit', (code) => done({ ok: false, message: `PowerShell 异常退出 (code=${code})` }))
    })
  })
}

module.exports = {
  createWindow,
  detectIdesOnce,
  registerSystemBridge,
  /**
   * 主进程内部用：用默认 IDE 打开项目路径
   * 优先 detectedIdes[0]，不存在则尝试 vscode，再降级 shell.openPath
   */
  openProjectWithDefaultIde
}
