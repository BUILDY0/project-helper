import { reactive } from 'vue'

/**
 * 通用「清空 / 重置」二次确认弹窗
 *
 * 设计：复用同一个弹窗实例 + 一个 action 字段，业务方注册 handlers 字典。
 *
 * 用法：
 * ```js
 * const { state, ask, onConfirm } = useConfirmDialog({
 *   'clear-paths': () => { ... },
 *   'clear-excludes': () => { ... }
 * })
 * ask({ title, message, confirmText, action: 'clear-paths' })
 * ```
 *
 * @param {Record<string, () => void>} handlers action -> handler
 */
export function useConfirmDialog(handlers = {}) {
  // 注意：变量名避免使用 confirm（与全局函数同名，模板中无法访问）
  const state = reactive({
    visible: false,
    title: '',
    message: '',
    confirmText: '确认',
    action: null
  })

  function ask({ title, message, confirmText, action }) {
    state.title = title
    state.message = message
    state.confirmText = confirmText || '确认'
    state.action = action
    state.visible = true
  }

  function close() {
    state.visible = false
  }

  function onConfirm() {
    const fn = handlers[state.action]
    if (typeof fn === 'function') fn()
    state.visible = false
    state.action = null
  }

  return { state, ask, close, onConfirm }
}
