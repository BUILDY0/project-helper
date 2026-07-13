const { ipcMain } = require('electron')
const fsp = require('node:fs/promises')
const path = require('node:path')
const { exec } = require('node:child_process')

/**
 * 项目文件夹复制模块：手动递归复制以支持进度推送与取消。
 *
 * - 每个任务由渲染层生成的 id 标识，取消时置 canceled 标志，在文件间隙检查退出。
 * - 通过 `fs:copy-progress` 事件把 { id, copied, total } 推给渲染层。
 * - 取消/失败时，仅删除本次任务新建的目录（createdRoot），已存在的目录保留。
 */

/** 进行中的任务表：id -> { canceled } */
const tasks = new Map()

async function pathExists(p) {
  try {
    await fsp.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * 给目标设置 Windows 隐藏属性。
 * fsp.copyFile / mkdir 不会保留隐藏属性，导致复制出的 .git 丢失默认隐藏态，
 * 故复制完成后按需重新设置。非 Windows 无该属性，直接跳过。
 */
function setHiddenAttr(p) {
  if (process.platform !== 'win32') return Promise.resolve()
  return new Promise((resolve) => {
    exec(`attrib +h "${p}"`, { windowsHide: true }, () => resolve())
  })
}

/** child 是否等于或位于 parent 内部（Windows 大小写不敏感） */
function isInside(child, parent) {
  const c = path.resolve(child).toLowerCase()
  const p = path.resolve(parent).toLowerCase()
  return c === p || c.startsWith(p + path.sep)
}

/**
 * 求 dest 向上首个不存在的最高祖先目录：即本次 mkdir 会新建的顶层目录。
 * 取消/失败时删除它即可精准回收本任务新建的目录，且不误删原有目录。
 */
async function findCreatedRoot(dest) {
  let cur = path.resolve(dest)
  let highestMissing = null
  while (true) {
    if (await pathExists(cur)) break
    highestMissing = cur
    const parent = path.dirname(cur)
    if (parent === cur) break
    cur = parent
  }
  return highestMissing
}

/** 递归收集源目录下所有条目（相对路径 + 类型），用于计数与逐条复制 */
async function collectEntries(root, task) {
  const list = []
  async function walk(dir, rel) {
    if (task.canceled) throw new Error('__canceled__')
    const entries = await fsp.readdir(dir, { withFileTypes: true })
    for (const ent of entries) {
      const abs = path.join(dir, ent.name)
      const r = rel ? path.join(rel, ent.name) : ent.name
      if (ent.isDirectory()) {
        list.push({ rel: r, kind: 'dir' })
        await walk(abs, r)
      } else if (ent.isSymbolicLink()) {
        list.push({ rel: r, kind: 'symlink' })
      } else {
        list.push({ rel: r, kind: 'file' })
      }
    }
  }
  await walk(root, '')
  return list
}

function registerFsCopyIpc() {
  /**
   * 复制项目文件夹
   * @param {{ id: string, source: string, dest: string, removeGit?: boolean }} payload
   * @returns {Promise<{ ok: boolean, path?: string, canceled?: boolean, message?: string }>}
   */
  ipcMain.handle('fs:copy-project', async (e, payload) => {
    const { id, source, dest, removeGit } = payload || {}
    if (!id || !source || !dest) return { ok: false, message: '参数缺失' }
    if (tasks.has(id)) return { ok: false, message: '任务已存在' }

    const src = path.resolve(source)
    const dst = path.resolve(dest)
    if (src.toLowerCase() === dst.toLowerCase()) {
      return { ok: false, message: '新路径不可与原路径相同' }
    }
    // dest 位于 source 内部会导致复制自身无限递归，提前拦截
    if (isInside(dst, src)) return { ok: false, message: '新路径不能位于原项目内部' }
    if (!(await pathExists(src))) return { ok: false, message: '原项目路径不存在' }

    const sender = e.sender
    const task = { canceled: false }
    tasks.set(id, task)
    // 记录本次会新建的顶层目录，供取消/失败精准回收
    const createdRoot = await findCreatedRoot(dst)

    try {
      const list = await collectEntries(src, task)
      const total = list.length || 1
      await fsp.mkdir(dst, { recursive: true })

      let copied = 0
      let lastSent = 0
      for (const item of list) {
        if (task.canceled) throw new Error('__canceled__')
        const from = path.join(src, item.rel)
        const to = path.join(dst, item.rel)
        if (item.kind === 'dir') {
          await fsp.mkdir(to, { recursive: true })
        } else if (item.kind === 'symlink') {
          // 软链接尽力复制，失败不阻断整体复制
          try {
            const link = await fsp.readlink(from)
            await fsp.symlink(link, to)
          } catch {}
        } else {
          await fsp.mkdir(path.dirname(to), { recursive: true })
          await fsp.copyFile(from, to)
        }
        copied++
        const now = Date.now()
        // 节流推送，末条强制推送保证进度收尾到 100%
        if (now - lastSent > 80 || copied === total) {
          lastSent = now
          if (!sender.isDestroyed()) sender.send('fs:copy-progress', { id, copied, total })
        }
      }

      // 勾选删除原始 git 信息：复制完成后移除新目录下的 .git
      if (removeGit) {
        await fsp
          .rm(path.join(dst, '.git'), {
            recursive: true,
            force: true,
            maxRetries: 5,
            retryDelay: 150
          })
          .catch(() => {})
      } else {
        // 保留 .git 时恢复其默认隐藏属性（复制过程会丢失）
        const gitDir = path.join(dst, '.git')
        if (await pathExists(gitDir)) await setHiddenAttr(gitDir)
      }

      tasks.delete(id)
      return { ok: true, path: dst }
    } catch (err) {
      tasks.delete(id)
      const canceled = task.canceled
      // 仅回收本任务新建的目录；等待句柄释放后重试删除
      if (createdRoot) {
        await new Promise((r) => setTimeout(r, 150))
        await fsp
          .rm(createdRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 })
          .catch(() => {})
      }
      if (canceled) return { ok: false, canceled: true, message: '已取消' }
      return { ok: false, message: err?.message || '复制失败' }
    }
  })

  /** 取消指定 id 的复制任务 */
  ipcMain.handle('fs:copy-cancel', (_e, payload) => {
    const id = typeof payload === 'string' ? payload : payload?.id
    const task = id && tasks.get(id)
    if (!task) return { ok: false }
    task.canceled = true
    return { ok: true }
  })
}

module.exports = { registerFsCopyIpc }
