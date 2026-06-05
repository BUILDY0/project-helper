/**
 * 扫描目录项的纯函数助手
 *
 * 配置里 `paths` / `pinned` 等字段在不同时期可能是：
 * - 旧版：纯字符串
 * - 新版：{ path, type, cfg } 对象（参见 @shared/path-types.js 的 SystemPath）
 *
 * 这里抽出与 Vue 无关的归一化函数，统一给 settings 页内多处使用。
 */

import { SystemPath } from '@shared/path-types.js'

/** 取扫描目录项的展示文本：兼容旧版纯字符串与新的 SystemPath 对象 */
export function getPathText(item) {
  if (typeof item === 'string') return item
  return typeof item?.path === 'string' ? item.path : ''
}

/** 取去重 / 比较用的归一化 key（小写 + trim） */
export function getPathKey(item) {
  return getPathText(item).trim().toLowerCase()
}

/**
 * 计算待新增的路径（去重后返回 SystemPath 数组）
 * @param {(string|object)[]} dirs 待添加的目录路径
 * @param {(string|object)[]} existingPaths 已有路径列表
 * @returns {{ newPaths: SystemPath[], added: number, skipped: number }}
 */
export function computeNewPaths(dirs, existingPaths) {
  const existKeys = new Set(existingPaths.map(getPathKey))
  const newPaths = []
  let skipped = 0
  for (const dir of dirs) {
    const key = getPathKey(dir)
    if (!key || existKeys.has(key)) {
      skipped++
      continue
    }
    existKeys.add(key)
    newPaths.push(new SystemPath({ path: dir }))
  }
  return { newPaths, added: newPaths.length, skipped }
}
