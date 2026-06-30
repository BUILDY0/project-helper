import { ref } from 'vue'
import { computeNewPaths } from '@/pages/settings/utils/path-helper.js'
import { normalizeJSONObject } from '@shared/data.js'

/**
 * 添加扫描目录的二次确认弹窗：
 * 选目录 → 弹窗内逐项配置（强制命中 / 移除）→ 确认后写盘并重新扫描
 *
 * @param {{
 *   toastRef: import('vue').Ref<any>,
 *   loadProjects: () => void | Promise<void>
 * }} options
 */
export function useAddScanDirDialog({ toastRef, loadProjects }) {
  const visible = ref(false)
  /** 待添加的 SystemPath 列表（弹窗内可编辑 forced / 可移除） */
  const pendingPaths = ref([])
  /** 选目录时读到的 config 快照，确认时直接复用，避免二次读取造成竞态 */
  let savedCfg = null

  async function open() {
    const dirs = await window.api.selectDirectory({ multi: true })
    if (!dirs || !dirs.length) return
    await presentDirs(dirs)
  }

  /** 拖拽入口：paths 已是目录路径数组（由调用方过滤），复用同一弹窗流程 */
  async function openFromPaths(dirs) {
    if (!dirs || !dirs.length) return
    await presentDirs(dirs)
  }

  /** 去重 + 填充待添加列表 + 打开弹窗（选目录 / 拖拽共用） */
  async function presentDirs(dirs) {
    try {
      const cfg = await window.api.readConfig()
      const { newPaths, added } = computeNewPaths(dirs, cfg.paths || [])
      if (added === 0) {
        toastRef.value?.show('所选目录均已存在', 'info')
        return
      }
      pendingPaths.value = newPaths
      savedCfg = cfg
      visible.value = true
    } catch (err) {
      toastRef.value?.show(`添加失败：${err.message}`, 'error')
    }
  }

  function removeAt(i) {
    pendingPaths.value.splice(i, 1)
  }

  function isForced(item) {
    return !!(item && item.cfg && item.cfg.forced === true)
  }

  function setForced(i, val) {
    const item = pendingPaths.value[i]
    if (!item) return
    if (!item.cfg || typeof item.cfg !== 'object') item.cfg = {}
    item.cfg.forced = !!val
  }

  /** 点击文字标签时，与开关同步切换 */
  function toggleForced(i) {
    setForced(i, !isForced(pendingPaths.value[i]))
  }

  function cancel() {
    visible.value = false
    pendingPaths.value = []
    savedCfg = null
  }

  async function confirm() {
    const paths = pendingPaths.value
    if (!paths.length || !savedCfg) {
      cancel()
      return
    }
    try {
      savedCfg.paths.push(...paths)
      // SystemPath 类实例无法跨 IPC structuredClone，先归一化为纯对象
      const payload = normalizeJSONObject(savedCfg)
      await window.api.saveConfig(payload)
      toastRef.value?.show(`已添加 ${paths.length} 个扫描目录`, 'success', 1500)
      cancel()
      loadProjects()
    } catch (err) {
      toastRef.value?.show(`添加失败：${err.message}`, 'error')
    }
  }

  return {
    visible,
    pendingPaths,
    open,
    openFromPaths,
    removeAt,
    isForced,
    setForced,
    toggleForced,
    cancel,
    confirm
  }
}
