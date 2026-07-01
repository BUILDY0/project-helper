import { ref, computed, watch } from 'vue'

/** 搜索输入防抖时长（毫秒） */
export const SEARCH_DEBOUNCE_MS = 200

/**
 * 解析搜索串：提取 `#tag` 标签筛选词与剩余文本。
 * - `#a-tag hello` / `hello#a-tag` 均解析为 { text:'hello', tags:['a-tag'] }
 * - 落单的 `#` 不作为标签，并从文本中剔除，避免污染文本匹配
 *
 * @returns {{ text: string, tags: string[] }} 均为小写
 */
export function parseSearchQuery(raw) {
  const tags = []
  let text = String(raw || '').toLowerCase()
  text = text.replace(/#([^\s#]+)/g, (_m, t) => {
    tags.push(t)
    return ' '
  })
  text = text.replace(/#/g, ' ').trim()
  return { text, tags }
}

/** 项目是否命中全部指定标签（标签名小写比较） */
function matchTags(project, tags) {
  if (!tags.length) return true
  const ptags = (project.tags || []).map((t) => String(t).toLowerCase())
  return tags.every((t) => ptags.includes(t))
}

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
    const { text, tags } = parseSearchQuery(debouncedKeyword.value.trim())
    if (!text && !tags.length) return projects.value
    return projects.value.filter((p) => {
      if (!matchTags(p, tags)) return false
      if (!text) return true
      const name = (p.name || '').toLowerCase()
      const desc = (p.description || '').toLowerCase()
      const fullPath = (p.path || '').toLowerCase()
      return name.includes(text) || desc.includes(text) || fullPath.includes(text)
    })
  })

  return { keyword, debouncedKeyword, filteredProjects }
}

/**
 * 远程项目搜索：除 name/desc/path 外还搜索 cfg.param / cfg.scheme，并支持 `#tag` 标签筛选
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
    const { text, tags } = parseSearchQuery(debouncedKeyword.value.trim())
    if (!text && !tags.length) return projects.value
    return projects.value.filter((p) => {
      if (!matchTags(p, tags)) return false
      if (!text) return true
      const name = (p.cfg?.alias || p.alias || '').toLowerCase()
      const desc = (p.cfg?.desc || p.desc || '').toLowerCase()
      const fullPath = (p.path || '').toLowerCase()
      const param = (p.cfg?.param || '' || '').toLowerCase()
      const scheme = (p.cfg?.scheme || '' || '').toLowerCase()
      return (
        name.includes(text) ||
        desc.includes(text) ||
        fullPath.includes(text) ||
        param.includes(text) ||
        scheme.includes(text)
      )
    })
  })

  return { keyword, debouncedKeyword, filteredProjects }
}
