import { ref } from 'vue'

export const MIN_LOADING_MS = 1000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function useProjects({ toastRef }) {
  const projects = ref([])
  const loading = ref(false)

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
