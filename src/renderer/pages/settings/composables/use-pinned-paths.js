/**
 * 置顶项目列表：移除 / 清空
 *
 * 注意：这里只处理「移除」与「清空」；新增 pinned 是在 ProjectsPage 通过 togglePin 完成的。
 *
 * @param {{ config: import('vue').Ref<{ pinned: string[] }> }} options
 */
export function usePinnedPaths({ config }) {
  function removePinned(i) {
    config.value.pinned.splice(i, 1)
  }

  function clearAll() {
    config.value.pinned = []
  }

  return { removePinned, clearAll }
}
