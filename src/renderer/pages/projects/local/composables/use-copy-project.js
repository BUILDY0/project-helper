import { ref } from 'vue'
import { getPathKey } from '@/pages/settings/utils/path-helper.js'
import { SystemPath } from '@shared/path-types.js'
import { normalizeJSONObject } from '@shared/data.js'

/**
 * 复制项目流程编排：
 * 表单弹窗 → 执行复制（右下角进度浮层，可取消）→ 完成后把新目录加为扫描路径并刷新列表。
 *
 * @param {{
 *   toastRef: import('vue').Ref<any>,
 *   loadProjects: () => void | Promise<void>
 * }} options
 */
export function useCopyProject({ toastRef, loadProjects }) {
  const dialogVisible = ref(false)
  // 待复制项目，供弹窗表单回填原路径
  const dialogProject = ref(null)

  const overlayVisible = ref(false)
  const overlaySource = ref('')
  const overlayProgress = ref(0)
  const overlayDone = ref(false)

  let currentId = null
  let unbindProgress = null
  // 复制成功后的新目录，供"打开项目"使用
  let copiedPath = ''

  function openDialog(project) {
    dialogProject.value = project
    dialogVisible.value = true
  }
  function cancelDialog() {
    dialogVisible.value = false
  }

  function cleanup() {
    if (unbindProgress) {
      unbindProgress()
      unbindProgress = null
    }
    currentId = null
  }

  /** 把新目录以「强制命中(forced)」写入扫描路径并落盘（已存在则升级为 forced） */
  async function saveScanPath(dir) {
    const cfg = await window.api.readConfig()
    cfg.paths = cfg.paths || []
    const key = getPathKey(dir)
    const idx = cfg.paths.findIndex((p) => getPathKey(p) === key)
    if (idx >= 0 && typeof cfg.paths[idx] === 'object') {
      cfg.paths[idx].cfg = { ...(cfg.paths[idx].cfg || {}), forced: true }
    } else if (idx >= 0) {
      // 旧版纯字符串项：替换为带 forced 的对象
      cfg.paths[idx] = new SystemPath({ path: dir, cfg: { forced: true } })
    } else {
      cfg.paths.push(new SystemPath({ path: dir, cfg: { forced: true } }))
    }
    // SystemPath 类实例无法跨 IPC structuredClone，先归一化为纯对象
    await window.api.saveConfig(normalizeJSONObject(cfg))
  }

  /** 表单确认：启动复制任务 */
  async function startCopy({ source, dest, removeGit }) {
    if (currentId) {
      toastRef.value?.show('已有复制任务进行中', 'info')
      return
    }
    dialogVisible.value = false

    const id = `copy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    currentId = id
    overlaySource.value = source
    overlayProgress.value = 0
    overlayDone.value = false
    overlayVisible.value = true

    // 绑定进度：仅消费当前任务 id 的事件，按文件数折算百分比（单调递增）
    unbindProgress = window.api.onCopyProgress((p) => {
      if (!p || p.id !== id) return
      if (p.total > 0) {
        const mapped = Math.round((p.copied / p.total) * 100)
        overlayProgress.value = Math.max(overlayProgress.value, mapped)
      }
    })

    let res
    try {
      res = await window.api.copyProject({ id, source, dest, removeGit })
    } catch (err) {
      res = { ok: false, message: err?.message || '复制失败' }
    }
    cleanup()

    if (res?.ok) {
      overlayProgress.value = 100
      overlayDone.value = true
      // 记录目录供"打开项目"用；浮层完成态展示新项目路径
      copiedPath = res.path || dest
      overlaySource.value = copiedPath
      try {
        await saveScanPath(copiedPath)
        await loadProjects()
      } catch (err) {
        toastRef.value?.show(`复制成功，但刷新列表失败：${err.message}`, 'error')
      }
      return
    }

    // 主动取消：静默关闭浮层；真实失败：toast + 关闭浮层
    overlayVisible.value = false
    if (res?.canceled) return
    toastRef.value?.show(`复制失败：${res?.message || '未知错误'}`, 'error')
  }

  /** 完成态"打开项目"：用默认 IDE 打开新目录，并关闭浮层 */
  async function openCopiedProject() {
    if (!copiedPath) return
    const r = await window.api.openWithDefaultIde(copiedPath)
    if (!r?.ok) {
      toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
    }
    overlayVisible.value = false
  }

  /** 完成态"关闭"：手动关闭浮层 */
  function closeOverlay() {
    overlayVisible.value = false
  }

  /** 浮层"取消"按钮：请求主进程终止任务，并立即隐藏浮层 */
  async function cancelCopy() {
    if (!currentId) {
      overlayVisible.value = false
      return
    }
    await window.api.cancelCopyProject(currentId)
    overlayVisible.value = false
  }

  return {
    dialogVisible,
    dialogProject,
    overlayVisible,
    overlaySource,
    overlayProgress,
    overlayDone,
    openDialog,
    cancelDialog,
    startCopy,
    cancelCopy,
    openCopiedProject,
    closeOverlay
  }
}
