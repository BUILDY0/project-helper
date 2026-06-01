/**
 * 排除目录列表：增 / 删 / 清空
 *
 * @param {{
 *   config: import('vue').Ref<{ exclude_paths: string[] }>,
 *   notifyBatchAdd: (added: number, skipped: number) => void
 * }} options
 */
export function useExcludePaths({ config, notifyBatchAdd }) {
  /** 新增排除目录（支持多选） */
  async function addExclude() {
    const dirs = await window.api.selectDirectory({ multi: true })
    if (!dirs || !dirs.length) return
    const existSet = new Set(config.value.exclude_paths)
    let added = 0
    let skipped = 0
    for (const dir of dirs) {
      if (!dir || existSet.has(dir)) {
        skipped++
        continue
      }
      existSet.add(dir)
      config.value.exclude_paths.push(dir)
      added++
    }
    notifyBatchAdd(added, skipped)
  }

  function removeExclude(i) {
    config.value.exclude_paths.splice(i, 1)
  }

  function clearAll() {
    config.value.exclude_paths = []
  }

  return { addExclude, removeExclude, clearAll }
}
