import { ref, computed, watch } from 'vue'

/** 搜索输入防抖时长（毫秒） */
export const SEARCH_DEBOUNCE_MS = 200

/**
 * 项目搜索：关键字 + 防抖 + 模糊过滤
 *
 * 命中规则：项目名 / 项目描述 / 完整路径任一包含关键字（不区分大小写）。
 *
 * @param {{ projects: import('vue').Ref<Array> }} options
 * @returns {{
 *   keyword: import('vue').Ref<string>,
 *   debouncedKeyword: import('vue').Ref<string>,
 *   filteredProjects: import('vue').ComputedRef<Array>
 * }}
 */
export function useProjectSearch({ projects }) {
  const keyword = ref('')
  // 经防抖后的关键字，参与实际过滤；输入变化时延迟 SEARCH_DEBOUNCE_MS 同步
  const debouncedKeyword = ref('')
  let keywordTimer = null

  watch(keyword, (val) => {
    if (keywordTimer) clearTimeout(keywordTimer)
    // 清空时立即生效，体验更顺滑
    if (!val) {
      debouncedKeyword.value = ''
      return
    }
    keywordTimer = setTimeout(() => {
      debouncedKeyword.value = val
    }, SEARCH_DEBOUNCE_MS)
  })

  /** 过滤后的项目列表（基于防抖后的关键字） */
  const filteredProjects = computed(() => {
    const kw = debouncedKeyword.value.trim().toLowerCase()
    if (!kw) return projects.value
    return projects.value.filter((p) => {
      const name = (p.name || '').toLowerCase()
      const desc = (p.description || '').toLowerCase()
      const fullPath = (p.path || '').toLowerCase()
      return name.includes(kw) || desc.includes(kw) || fullPath.includes(kw)
    })
  })

  return { keyword, debouncedKeyword, filteredProjects }
}
