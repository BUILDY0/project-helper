/**
 * 扫描目录项的纯函数助手
 *
 * 配置里 `paths` / `pinned` 等字段在不同时期可能是：
 * - 旧版：纯字符串
 * - 新版：{ path, type, cfg } 对象（参见 @shared/path-types.js 的 SystemPath）
 *
 * 这里抽出与 Vue 无关的归一化函数，统一给 settings 页内多处使用。
 */

/** 取扫描目录项的展示文本：兼容旧版纯字符串与新的 SystemPath 对象 */
export function getPathText(item) {
  if (typeof item === 'string') return item
  return typeof item?.path === 'string' ? item.path : ''
}

/** 取去重 / 比较用的归一化 key（小写 + trim） */
export function getPathKey(item) {
  return getPathText(item).trim().toLowerCase()
}
