/**
 * 渲染进程可用的纯字符串路径助手（不依赖 Node 的 path 模块）。
 */

/**
 * 计算给定路径的父级目录；已是根路径（盘符根 / 文件系统根）时返回 null。
 *
 * 兼容 Windows（`\`）与 POSIX（`/`）分隔符，调用方据返回值判断是否存在父级。
 *
 * @param {string} p 目标路径
 * @returns {string|null} 父级目录路径；无父级时为 null
 */
export function getParentPath(p) {
  if (typeof p !== 'string') return null
  // 去掉尾部分隔符，使「根」在去尾后退化为可判定的形态
  const s = p.trim().replace(/[\\/]+$/, '')
  if (!s) return null
  // Windows 盘符根：`C:` / `C:\`
  if (/^[a-zA-Z]:$/.test(s)) return null

  const idx = Math.max(s.lastIndexOf('\\'), s.lastIndexOf('/'))
  if (idx < 0) return null
  // 父级即盘符根时补回反斜杠：`C:\foo` → `C:\`
  if (/^[a-zA-Z]:$/.test(s.slice(0, idx))) return s.slice(0, idx + 1)
  // POSIX 根：`/foo` → `/`
  if (idx === 0) return '/'
  return s.slice(0, idx)
}
