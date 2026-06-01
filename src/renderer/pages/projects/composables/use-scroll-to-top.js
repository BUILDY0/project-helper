import { ref, unref } from 'vue'

/**
 * 滚动容器与"回到顶部"按钮可用状态。
 *
 * @param {{ bodyRef: import('vue').Ref | (() => any) }} options
 *   bodyRef 最终需指向真实 DOM 节点（具备 scrollTo / scrollTop）；
 *   通常传入 computed(() => layoutRef.value?.bodyRef)，详见 resolveEl 注释。
 */
export function useScrollToTop({ bodyRef } = {}) {
  const atTop = ref(true)

  /**
   * 取真实滚动容器 DOM。
   *
   * 调用方一般传入 computed(() => layoutRef.value?.bodyRef)：
   * - 第一次 unref：解 computed → 拿到 PageLayout defineExpose 暴露的 bodyRef（仍是 ref 对象，
   *   defineExpose 暴露 ref 时 Vue 不会自动解包，与模板自动解包不同）。
   * - 第二次 unref：解 ref → 拿到真实 DOM 节点。
   * 兼容已是 DOM 的情况（unref 对非 ref 原样返回）。
   */
  function resolveEl() {
    const el = unref(bodyRef)
    return unref(el) || el
  }

  /** 平滑滚动到顶部 */
  function scrollToTop() {
    resolveEl()?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** 滚动监听：更新 atTop 用于禁用按钮 */
  function onBodyScroll() {
    atTop.value = (resolveEl()?.scrollTop || 0) <= 0
  }

  return { atTop, onBodyScroll, scrollToTop }
}
