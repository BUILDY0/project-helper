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
  const debouncedKeyword = ref('')
  let keywordTimer = null

  watch(keyword, (val) => {
    if (keywordTimer) clearTimeout(keywordTimer)
    if (!val) {
      debouncedKeyword.value = ''
      return
    }
    keywordTimer = setTimeout(() => {
      debouncedKeyword.value = val
    }, SEARCH_DEBOUNCE_MS)
  })

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

/**
 * 远程项目搜索：除 name/desc/path 外还搜索 cfg.param / cfg.scheme
 */
export function useRemoteProjectSearch({ projects }) {
  const keyword = ref('')
  const debouncedKeyword = ref('')
  let keywordTimer = null

  watch(keyword, (val) => {
    if (keywordTimer) clearTimeout(keywordTimer)
    if (!val) {
      debouncedKeyword.value = ''
      return
    }
    keywordTimer = setTimeout(() => {
      debouncedKeyword.value = val
    }, SEARCH_DEBOUNCE_MS)
  })

  const filteredProjects = computed(() => {
    const kw = debouncedKeyword.value.trim().toLowerCase()
    if (!kw) return projects.value
    return projects.value.filter((p) => {
      const name = (p.cfg?.alias || p.alias || '').toLowerCase()
      const desc = (p.cfg?.desc || p.desc || '').toLowerCase()
      const fullPath = (p.path || '').toLowerCase()
      const param = (p.cfg?.param || '' || '').toLowerCase()
      const scheme = (p.cfg?.scheme || '' || '').toLowerCase()
      return (
        name.includes(kw) ||
        desc.includes(kw) ||
        fullPath.includes(kw) ||
        param.includes(kw) ||
        scheme.includes(kw)
      )
    })
  })

  return { keyword, debouncedKeyword, filteredProjects }
}
