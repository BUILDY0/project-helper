import { SystemPath } from '@shared/path-types.js'
import { computeNewPaths } from '../utils/path-helper.js'

/** 默认扫描深度（与主进程的默认值保持一致） */
export const DEFAULT_DEPTH = 1

/**
 * 扫描目录配置：增 / 删 / 强制命中开关 / 清空
 *
 * @param {{
 *   config: import('vue').Ref<{ paths: any[] }>,
 *   notifyBatchAdd: (added: number, skipped: number) => void
 * }} options
 */
export function useScanPaths({ config, notifyBatchAdd }) {
  /** 新增扫描目录（支持多选） */
  async function addPath() {
    const dirs = await window.api.selectDirectory({ multi: true })
    if (!dirs || !dirs.length) return
    const { newPaths, added, skipped } = computeNewPaths(dirs, config.value.paths)
    config.value.paths.push(...newPaths)
    notifyBatchAdd(added, skipped)
  }

  function removePath(i) {
    config.value.paths.splice(i, 1)
  }

  /** 读取某个扫描目录项的"强制命中"开关值 */
  function isForced(item) {
    return !!(item && typeof item === 'object' && item.cfg && item.cfg.forced === true)
  }

  /**
   * 设置某个扫描目录项的"强制命中"开关值
   * - 仅修改内存中的 item.cfg.forced，待用户点击"保存"才落盘
   * - 兼容旧版字符串路径：自动升级为 SystemPath 对象
   */
  function setForced(i, val) {
    const cur = config.value.paths[i]
    const next = !!val
    if (typeof cur === 'string') {
      config.value.paths[i] = new SystemPath({ path: cur, cfg: { forced: next } })
      return
    }
    if (cur && typeof cur === 'object') {
      if (!cur.cfg || typeof cur.cfg !== 'object') cur.cfg = {}
      cur.cfg.forced = next
    }
  }

  /** 点击文字标签时，与开关同步切换 */
  function toggleForced(i) {
    setForced(i, !isForced(config.value.paths[i]))
  }

  function clearAll() {
    config.value.paths = []
  }

  return {
    addPath,
    removePath,
    isForced,
    setForced,
    toggleForced,
    clearAll
  }
}
