import { ref, computed } from 'vue'

/**
 * 全局 IDE 状态（模块级单例）
 *
 * - allDetectedIdes：主进程探测结果全集（含 available=false 的项），用于设置页展示
 * - 检测支持推送机制：ide:detect-progress 事件逐步更新，无需等待全部完成即可渲染
 */
const allDetectedIdes = ref([])

let initPromise = null
let progressUnlisten = null

/**
 * 首次拉取：
 * 1. 先读主进程已缓存结果（ide:get-available），命中即用，零等待。
 * 2. 缓存为空说明主进程仍在探测，注册推送监听后调用 ide:detect 等待完成。
 */
async function fetchOnce() {
  try {
    const cached = (await window.api.getAvailableIdes()) || []
    if (cached.length > 0) {
      allDetectedIdes.value = cached
      return
    }
    // 订阅逐步推送
    if (progressUnlisten) progressUnlisten()
    progressUnlisten = window.api.onIdeDetectProgress((list) => {
      allDetectedIdes.value = list || []
    })
    const fresh = (await window.api.detectIdes()) || []
    allDetectedIdes.value = fresh
  } catch {
    allDetectedIdes.value = []
  } finally {
    if (progressUnlisten) {
      progressUnlisten()
      progressUnlisten = null
    }
  }
}

/**
 * Composable：返回全局 IDE 状态与操作方法
 *
 * @param {{ excludeIds?: import('vue').Ref<string[]> }} [opts]
 *   excludeIds：需要在右键菜单中排除的 IDE id 列表（来自 ide_cfg.exclude）
 */
export function useIdes(opts = {}) {
  if (!initPromise) {
    initPromise = fetchOnce()
  }

  /** 所有已检测的 IDE（含不可用），用于设置页下拉选项 */
  const detectedIdes = computed(() => allDetectedIdes.value)

  /** 检测到的可用 IDE，过滤不可用 */
  const availableIdes = computed(() => allDetectedIdes.value.filter((x) => x.available))

  /**
   * 右键菜单展示的 IDE 列表：仅可用 + 不在 exclude 列表中
   * excludeIds 由调用方传入（响应式 Ref）
   */
  const menuIdes = computed(() => {
    const excludeSet = new Set(opts.excludeIds?.value || [])
    return availableIdes.value.filter((x) => !excludeSet.has(x.id))
  })

  /** 强制重新探测，支持推送回调实时更新 allDetectedIdes */
  async function refresh() {
    try {
      if (progressUnlisten) progressUnlisten()
      progressUnlisten = window.api.onIdeDetectProgress((list) => {
        allDetectedIdes.value = list || []
      })
      const list = (await window.api.detectIdes()) || []
      allDetectedIdes.value = list
    } catch {
      // 保留现有状态，不清空
    } finally {
      if (progressUnlisten) {
        progressUnlisten()
        progressUnlisten = null
      }
    }
  }

  return { detectedIdes, availableIdes, menuIdes, refresh }
}
