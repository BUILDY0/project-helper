/**
 * 检查更新按钮的回调封装：把成功 / 失败映射为 toast 文案
 *
 * @param {{ toastRef: import('vue').Ref }} options
 */
export function useUpdateCheck({ toastRef }) {
  /** UpdateCheckButton 检查完成回调：仅在已是最新时给反馈，发现新版本由 UpdateBanner 接管 */
  function onUpdateCheckResult({ latest, version }) {
    if (latest) {
      toastRef.value?.show(`已是最新版本 v${version}`, 'success')
    }
  }

  function onUpdateCheckError(message) {
    toastRef.value?.show(message || '检查更新失败', 'error')
  }

  return { onUpdateCheckResult, onUpdateCheckError }
}
