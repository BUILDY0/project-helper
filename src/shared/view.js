/**
 * 项目视图类型枚举与归一化（双端共享）
 *
 * 加载约定见 `src/shared/README.md`。
 * view 结构：{ local: ViewType, remote: ViewType }，分别控制本地/远程项目子页的视图。
 */

/** 视图类型：flat=平铺，tags=按标签分类 */
export const ViewType = Object.freeze({ FLAT: 'flat', TAGS: 'tags' })

/** 视图作用端：local=本地项目，remote=远程项目 */
export const ViewSide = Object.freeze({ LOCAL: 'local', REMOTE: 'remote' })

/** 支持的作用端值集合 */
export const VIEW_SIDES = Object.freeze(['local', 'remote'])

/** 把任意输入夹紧到合法的作用端，非法回落 local */
export function normalizeViewSide(v) {
  return VIEW_SIDES.includes(v) ? v : ViewSide.LOCAL
}

/** 支持的视图值集合 */
export const VIEW_VALUES = Object.freeze(['flat', 'tags'])

/** 默认视图：非法 / 缺省值会回落到这个值 */
export const DEFAULT_VIEW = 'flat'

/** 把任意输入夹紧到合法的视图枚举 */
export function normalizeViewType(v) {
  return VIEW_VALUES.includes(v) ? v : DEFAULT_VIEW
}

/** 归一化 view 对象，缺省字段回落默认值 */
export function normalizeView(raw) {
  return {
    local: normalizeViewType(raw?.local),
    remote: normalizeViewType(raw?.remote)
  }
}
