const { ipcMain, BrowserWindow } = require('electron')
const fsp = require('node:fs/promises')
const path = require('node:path')
const simpleGit = require('simple-git')

/**
 * git 克隆模块：基于 simple-git，支持进度推送与取消。
 *
 * - 每个任务由渲染层生成的 id 标识，主进程用 AbortController 挂钩取消。
 * - clone 过程通过 `git:clone-progress` 事件把 { id, method, stage, progress } 推给渲染层。
 * - simple-git 传入 progress 回调即自动附加 --progress，无需手动解析 stderr。
 */

/** 进行中的任务表：id -> { controller } */
const tasks = new Map()

/** 路径是否存在 */
async function pathExists(p) {
  try {
    await fsp.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * 检测系统是否安装 git。
 * 缺失时 simple-git 底层 spawn 抛 ENOENT，这里统一转成布尔值供前置判断。
 */
async function isGitInstalled() {
  try {
    await simpleGit().raw(['--version'])
    return true
  } catch {
    return false
  }
}

/**
 * 清理半成品目录（取消/失败时调用）。
 * - 目录为本次任务新建（此前不存在）：整体删除。
 * - 目录此前已存在（且当时为空）：仅清理其中的半成品内容，保留原目录。
 *
 * 取消时底层 git 进程刚被 kill，Windows 上 .git 内文件可能仍被占用或为只读，
 * 立即删除会抛 EBUSY/ENOTEMPTY/EPERM。故先短暂等待句柄释放，再用 maxRetries
 * 让 fs.rm 自动重试（EPERM 时会 chmod 只读文件后重删）。清理失败静默忽略。
 */
async function cleanupPartialDir(dir, existedBefore) {
  // 等待 git 进程退出并释放文件句柄
  await new Promise((r) => setTimeout(r, 150))
  const rmOpts = { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }
  try {
    if (existedBefore) {
      const entries = await fsp.readdir(dir)
      await Promise.all(entries.map((name) => fsp.rm(path.join(dir, name), rmOpts)))
    } else {
      await fsp.rm(dir, rmOpts)
    }
  } catch {
    // 清理失败忽略
  }
}

/**
 * 判定目录是否为空（不存在视为可用）。
 * git clone 要求目标目录为空或不存在，提前校验给出清晰错误。
 */
async function isDirEmptyOrMissing(dir) {
  try {
    const entries = await fsp.readdir(dir)
    return entries.length === 0
  } catch (err) {
    // 不存在即可用；其它错误（如权限）向上暴露
    if (err && err.code === 'ENOENT') return true
    throw err
  }
}

function registerGitCloneIpc() {
  /**
   * 克隆仓库
   * @param {{ id: string, url: string, dir: string }} payload
   * @returns {Promise<{ ok: boolean, path?: string, canceled?: boolean, gitMissing?: boolean, message?: string }>}
   */
  ipcMain.handle('git:clone', async (e, payload) => {
    const { id, url, dir } = payload || {}
    if (!id || !url || !dir) return { ok: false, message: '参数缺失' }
    if (tasks.has(id)) return { ok: false, message: '任务已存在' }

    // 前置检查：系统未安装 git 时直接给出显式提示，避免走到克隆才报晦涩错误
    if (!(await isGitInstalled())) {
      return { ok: false, gitMissing: true, message: '未检测到 Git，请先安装 Git 后重试' }
    }

    const sender = e.sender
    const controller = new AbortController()
    tasks.set(id, { controller })

    // 记录目录初始状态：用于取消/失败时精准清理半成品
    const dirExistedBefore = await pathExists(dir)

    try {
      // 目标目录存在则要求为空；不存在则递归创建
      if (!(await isDirEmptyOrMissing(dir))) {
        tasks.delete(id)
        return { ok: false, message: '目标目录已存在且非空' }
      }
      await fsp.mkdir(dir, { recursive: true })

      const git = simpleGit({
        // 传入 progress 回调后 simple-git 自动附加 --progress 并解析进度
        progress({ method, stage, progress }) {
          if (!sender.isDestroyed()) {
            sender.send('git:clone-progress', { id, method, stage, progress })
          }
        },
        // 关联取消信号：controller.abort() 会杀掉底层 git 进程
        abort: controller.signal
      })

      await git.clone(url, dir)
      tasks.delete(id)
      return { ok: true, path: dir }
    } catch (err) {
      tasks.delete(id)
      const canceled = controller.signal.aborted
      // 取消或失败都可能残留半成品目录，统一清理
      await cleanupPartialDir(dir, dirExistedBefore)
      // 主动取消：区分于真实失败，渲染层据此静默关闭浮层
      if (canceled) return { ok: false, canceled: true, message: '已取消' }
      return { ok: false, message: err?.message || '克隆失败' }
    }
  })

  /** 取消指定 id 的克隆任务 */
  ipcMain.handle('git:clone-cancel', (_e, payload) => {
    const id = typeof payload === 'string' ? payload : payload?.id
    const task = id && tasks.get(id)
    if (!task) return { ok: false }
    task.controller.abort()
    tasks.delete(id)
    return { ok: true }
  })
}

module.exports = { registerGitCloneIpc }
