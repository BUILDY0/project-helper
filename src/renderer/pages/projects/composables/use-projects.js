import { ref } from 'vue'

/** 最短 loading 展示时间（毫秒），避免动作过快出现"跳变" */
export const MIN_LOADING_MS = 1000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 项目列表加载与刷新
 *
 * @param {{ toastRef: import('vue').Ref }} options
 *   - toastRef: 用于错误提示的 Toast 组件引用
 * @returns {{
 *   projects: import('vue').Ref<Array>,
 *   loading: import('vue').Ref<boolean>,
 *   loadProjects: () => Promise<void>
 * }}
 */
export function useProjects({ toastRef }) {
  const projects = ref([])
  const loading = ref(false)

  /** 拉取项目列表；并行计时确保 loading 至少持续 MIN_LOADING_MS */
  async function loadProjects() {
    if (loading.value) return
    loading.value = true
    const start = Date.now()
    try {
      const list = await window.api.scanProjects()
      projects.value = list || []
    } catch (err) {
      toastRef.value?.show(`扫描失败：${err.message}`, 'error')
    } finally {
      const remain = MIN_LOADING_MS - (Date.now() - start)
      if (remain > 0) await sleep(remain)
      loading.value = false
    }
  }

  return { projects, loading, loadProjects }
}
