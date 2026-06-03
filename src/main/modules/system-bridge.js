const { BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const { exec, spawn } = require('node:child_process')
const os = require('node:os')

const { readConfig, patchConfig, appendRecentOpened } = require('./config-store')
const { bus, Events } = require('./event-bus')

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
 * 优先 detectedIdes[0]（启动期探测的第一个可用 IDE），
 * 降级顺序：vscode CLI → shell.openPath（系统默认程序打开文件夹）
 */
function openProjectWithDefaultIde(targetPath) {
  if (!targetPath) return

  const tryExec = (cli) =>
    new Promise((resolve) => {
      exec(`${cli} "${targetPath}"`, { shell: true, windowsHide: true }, (err) => resolve(!err))
    })

  const notifyOpened = async () => {
    await appendRecentOpened(targetPath).catch(() => {})
    bus.emit(Events.PROJECT_OPENED, { projectPath: targetPath })
  }

  const run = async () => {
    const first = detectedIdes.find((x) => x.available)
    if (first) {
      const ok = await tryExec(first.cli)
      if (ok) {
        notifyOpened()
        return
      }
    }

    // 兜底：vscode
    if (!first || first.cli !== 'code') {
      const ok = await tryExec('code')
      if (ok) {
        notifyOpened()
        return
      }
    }

    // 最终兜底：系统默认程序打开文件夹
    shell
      .openPath(targetPath)
      .then(() => notifyOpened())
      .catch(() => {})
  }

  run().catch((err) => console.error('[tray] 打开项目失败:', err.message))
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
      const cmd = `${ide.cli} "${targetPath}"`
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
