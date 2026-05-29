/**
 * 主题相关常量与归一化函数（双端共享）
 *
 * 加载约定见 `src/shared/README.md`。
 */

/** 应用支持的主题集合 */
export const THEME_VALUES = Object.freeze(['light', 'dark'])

/** 默认主题：非法 / 缺省值会回落到这个值 */
export const DEFAULT_THEME = 'light'

/** 把任意输入夹紧到合法的主题枚举 */
export function normalizeTheme(v) {
  return THEME_VALUES.includes(v) ? v : DEFAULT_THEME
}
