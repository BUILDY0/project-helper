import { ref, unref } from 'vue'

/**
 * 滚动容器与"回到顶部"按钮可用状态。
 */
export function useScrollToTop({ bodyRef } = {}) {
  const atTop = ref(true)

  function resolveEl() {
    const el = unref(bodyRef)
    return unref(el) || el
  }

  function scrollToTop() {
    resolveEl()?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onBodyScroll() {
    atTop.value = (resolveEl()?.scrollTop || 0) <= 0
  }

  return { atTop, onBodyScroll, scrollToTop }
}
