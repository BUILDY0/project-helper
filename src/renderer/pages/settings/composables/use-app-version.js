import { ref, onMounted } from 'vue'

/** 应用版本号：从主进程 app.getVersion() 拉取一次，用于在标题旁展示 */
export function useAppVersion() {
  const appVersion = ref('')

  onMounted(() => {
    window.api
      .getAppVersion?.()
      .then((v) => {
        appVersion.value = v || ''
      })
      .catch(() => {})
  })

  return { appVersion }
}
