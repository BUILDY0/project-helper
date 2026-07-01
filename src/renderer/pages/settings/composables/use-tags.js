import { computed } from 'vue'

/**
 * 配置页「标签」分组的增删改：删除标签 / 删除关联路径 / 清空。
 * 直接改 config.value.tags（Record<string, string[]>），由配置页统一保存落盘。
 *
 * @param {{ config: import('vue').Ref<{ tags: Record<string, string[]> }> }} options
 */
export function useTags({ config }) {
  const tagNames = computed(() => Object.keys(config.value.tags || {}))
  const tagCount = computed(() => tagNames.value.length)

  function deleteTag(name) {
    const next = { ...(config.value.tags || {}) }
    delete next[name]
    config.value.tags = next
  }

  function removePath(name, idx) {
    const tags = config.value.tags || {}
    if (!Array.isArray(tags[name])) return
    tags[name].splice(idx, 1)
    config.value.tags = { ...tags }
  }

  function clearAll() {
    config.value.tags = {}
  }

  return { tagNames, tagCount, deleteTag, removePath, clearAll }
}
