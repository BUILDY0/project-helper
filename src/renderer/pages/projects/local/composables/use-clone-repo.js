import { ref } from 'vue'
import { computeNewPaths } from '@/pages/settings/utils/path-helper.js'
import { normalizeJSONObject } from '@shared/data.js'

/**
 * 克隆 git 仓库流程编排：
 * 表单弹窗 → 执行 clone（右下角进度浮层）→ 完成后把目录加为扫描路径并刷新列表。
 *
 * @param {{
 *   toastRef: import('vue').Ref<any>,
 *   loadProjects: () => void | Promise<void>
 * }} options
 */
export function useCloneRepo({ toastRef, loadProjects }) {
  // 表单弹窗
  const dialogVisible = ref(false)
  // 进度浮层
  const overlayVisible = ref(false)
  const overlayRepo = ref('')
  const overlayStage = ref('')
  const overlayProgress = ref(0)
  const overlayDone = ref(false)
  // git 未安装引导弹窗
  const gitMissingVisible = ref(false)

  // Git 官方下载页
  const GIT_DOWNLOAD_URL = 'https://git-scm.com/install'

  // 各阶段映射到全局进度区间：把 simple-git 每阶段各自 0-100 的进度线性折算成
  // 全程 0-100 的一段，配合单调递增消除切阶段时的进度倒退。
  const STAGE_BANDS = {
    counting: [0, 10],
    compressing: [10, 25],
    receiving: [25, 85],
    resolving: [85, 97],
    writing: [97, 100]
  }

  let currentId = null
  let unbindProgress = null
  // 克隆成功后的本地目录，供"打开项目"使用
  let clonedPath = ''

  function openDialog() {
    dialogVisible.value = true
  }
  function cancelDialog() {
    dialogVisible.value = false
  }

  function resetProgress(repo) {
    overlayRepo.value = repo
    overlayStage.value = ''
    overlayProgress.value = 0
    overlayDone.value = false
  }

  function cleanup() {
    if (unbindProgress) {
      unbindProgress()
      unbindProgress = null
    }
    currentId = null
  }

  /** 把克隆目录加入扫描路径并落盘（已存在则跳过写入，仍会刷新） */
  async function addScanPath(dir) {
    const cfg = await window.api.readConfig()
    const { newPaths, added } = computeNewPaths([dir], cfg.paths || [])
    if (added > 0) {
      cfg.paths.push(...newPaths)
      await window.api.saveConfig(normalizeJSONObject(cfg))
    }
  }

  /** 表单确认：启动克隆任务 */
  async function startClone({ url, dir }) {
    if (currentId) {
      toastRef.value?.show('已有克隆任务进行中', 'info')
      return
    }
    dialogVisible.value = false

    const id = `clone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    currentId = id
    resetProgress(url)
    overlayVisible.value = true

    // 绑定进度：仅消费当前任务 id 的事件，折算成全局单调进度
    unbindProgress = window.api.onCloneProgress((p) => {
      if (!p || p.id !== id) return
      overlayStage.value = p.stage || ''
      const band = STAGE_BANDS[p.stage]
      if (!band) return
      const stageP = typeof p.progress === 'number' ? p.progress : 0
      const mapped = Math.round(band[0] + (stageP / 100) * (band[1] - band[0]))
      // 单调递增：跨阶段/乱序事件均不回退
      overlayProgress.value = Math.max(overlayProgress.value, mapped)
    })

    let res
    try {
      res = await window.api.cloneRepo({ id, url, dir })
    } catch (err) {
      res = { ok: false, message: err?.message || '克隆失败' }
    }
    cleanup()

    if (res?.ok) {
      overlayProgress.value = 100
      overlayDone.value = true
      // 记录目录供"打开项目"用；浮层不再自动关闭，由用户操作关闭
      clonedPath = res.path || dir
      try {
        await addScanPath(clonedPath)
        await loadProjects()
      } catch (err) {
        toastRef.value?.show(`克隆成功，但刷新列表失败：${err.message}`, 'error')
      }
      return
    }

    // 主动取消：静默关闭浮层；真实失败：toast + 关闭浮层
    overlayVisible.value = false
    if (res?.canceled) return
    // git 未安装：弹出带下载引导的专用弹窗，而非笼统的"克隆失败"
    if (res?.gitMissing) {
      gitMissingVisible.value = true
      return
    }
    toastRef.value?.show(`克隆失败：${res?.message || '未知错误'}`, 'error')
  }

  /** git 未安装引导：跳转官方下载页并关闭弹窗 */
  async function openGitDownload() {
    gitMissingVisible.value = false
    try {
      await window.api.openExternal(GIT_DOWNLOAD_URL)
    } catch {
      toastRef.value?.show(`打开下载页失败，请手动访问 ${GIT_DOWNLOAD_URL}`, 'error')
    }
  }

  /** 关闭 git 未安装引导弹窗 */
  function dismissGitMissing() {
    gitMissingVisible.value = false
  }

  /** 完成态"打开项目"：用默认 IDE 打开克隆目录，并关闭浮层 */
  async function openClonedProject() {
    if (!clonedPath) return
    const r = await window.api.openWithDefaultIde(clonedPath)
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
  async function cancelClone() {
    if (!currentId) {
      overlayVisible.value = false
      return
    }
    await window.api.cancelClone(currentId)
    overlayVisible.value = false
  }

  return {
    dialogVisible,
    overlayVisible,
    overlayRepo,
    overlayStage,
    overlayProgress,
    overlayDone,
    gitMissingVisible,
    openDialog,
    cancelDialog,
    startClone,
    cancelClone,
    openGitDownload,
    dismissGitMissing,
    openClonedProject,
    closeOverlay
  }
}
