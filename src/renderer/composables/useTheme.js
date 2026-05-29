import { ref } from 'vue'
import { DEFAULT_THEME, normalizeTheme } from '@shared/theme.js'

/**
 * 主题管理（模块级单例，整个 app 生命周期共享同一份响应式状态）
 *
 * 数据流：
 * 1. main.js 启动时调用 initTheme()：从 config.json 读取 theme 字段并应用到 <html data-theme>。
 * 2. setTheme(value)：立即更新内存 + DOM + 持久化（TopBanner 快捷开关使用）。
 * 3. applyTheme(value)：仅更新内存 + DOM，不触发持久化（SettingsPage 保存成功后使用）。
 *
 * 主题枚举与归一化函数统一来自 @shared/theme，避免与主进程重复声明。
 */

const currentTheme = ref(DEFAULT_THEME)
let initPromise = null

/** 把主题应用到 <html data-theme=...>，由 CSS 变量 :root[data-theme='dark'] 接管换肤 */
function applyThemeToDom(theme) {
  document.documentElement.setAttribute('data-theme', normalizeTheme(theme))
}

/** 从主进程读取一次配置，初始化主题；失败则回退默认 */
async function fetchInitialTheme() {
  try {
    const cfg = await window.api.readConfig()
    const t = normalizeTheme(cfg?.theme)
    currentTheme.value = t
    applyThemeToDom(t)
  } catch {
    currentTheme.value = DEFAULT_THEME
    applyThemeToDom(DEFAULT_THEME)
  }
}

/** 切换主题：立即生效 + 持久化；同值短路 */
async function setTheme(theme) {
  const t = normalizeTheme(theme)
  if (t === currentTheme.value) return
  currentTheme.value = t
  applyThemeToDom(t)
  try {
    await window.api.saveTheme?.(t)
  } catch (err) {
    // 写盘失败不回滚 UI：下次启动会回到上次成功保存的值
    // eslint-disable-next-line no-console
    console.error('[theme] 保存主题失败:', err?.message || err)
  }
}

/** 仅刷新内存 + DOM，不写盘；用于"已通过 saveConfig 落盘后"把主题刷到 UI */
function applyTheme(theme) {
  const t = normalizeTheme(theme)
  if (t === currentTheme.value) return
  currentTheme.value = t
  applyThemeToDom(t)
}

/** 在 main.js 入口调用一次，确保首屏避免主题闪烁 */
export function initTheme() {
  if (!initPromise) initPromise = fetchInitialTheme()
  return initPromise
}

/** 组件中使用：取响应式当前主题、写盘切换、纯刷新切换 */
export function useTheme() {
  return {
    currentTheme,
    setTheme,
    applyTheme
  }
}
