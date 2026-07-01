/**
 * 标签数据归一化（双端共享）
 *
 * 结构：tags: Record<string, string[]>
 * - key：标签名（非空字符串）
 * - value：关联的项目 key 列表（local=path，remote=path::alias）
 *
 * 仅放纯函数；禁止引入 fs/path/electron 等运行环境相关 API。
 */

/** 把任意输入归一化为合法 tags 对象：丢弃空标签名，value 去重并保留字符串项 */
export function normalizeTags(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [name, list] of Object.entries(raw)) {
    const key = typeof name === 'string' ? name.trim() : ''
    if (!key) continue
    const arr = Array.isArray(list) ? list : []
    const seen = new Set()
    const values = []
    for (const item of arr) {
      if (typeof item !== 'string') continue
      const v = item.trim()
      if (!v || seen.has(v)) continue
      seen.add(v)
      values.push(v)
    }
    out[key] = values
  }
  return out
}

/** 项目 key 与标签关联 key 是否相等（路径大小写不敏感，兼容 Windows） */
export function sameTagKey(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase()
}

/** 取某个项目 key 命中的标签名列表 */
export function tagsForKey(tags, key) {
  const out = []
  for (const [name, list] of Object.entries(tags || {})) {
    if ((list || []).some((k) => sameTagKey(k, key))) out.push(name)
  }
  return out
}
