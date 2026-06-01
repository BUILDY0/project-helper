import { ref } from 'vue'

/**
 * 删除项目二次确认（含「永久删除」开关）
 *
 * @param {{
 *   toastRef: import('vue').Ref,
 *   projects: import('vue').Ref<Array>
 * }} options
 */
export function useDeleteProject({ toastRef, projects }) {
  const confirmVisible = ref(false)
  const pendingProject = ref(null)
  const permanentDelete = ref(false)

  /** 由右键菜单 / 卡片操作触发：打开二次确认弹窗 */
  function requestDelete(project) {
    pendingProject.value = project
    permanentDelete.value = false
    confirmVisible.value = true
  }

  /** 用户取消 */
  function onCancelDelete() {
    confirmVisible.value = false
    permanentDelete.value = false
    pendingProject.value = null
  }

  /** 用户确认：调用主进程删除 / 移入回收站，并从列表移除 */
  async function onConfirmDelete() {
    const p = pendingProject.value
    const shouldPermanentDelete = permanentDelete.value
    confirmVisible.value = false
    permanentDelete.value = false
    if (!p) {
      pendingProject.value = null
      return
    }
    const r = await window.api.deleteFolder(p.path, { force: shouldPermanentDelete })
    if (r?.ok) {
      toastRef.value?.show(
        shouldPermanentDelete ? '已永久删除项目文件夹' : '已移入回收站',
        'success'
      )
      // 从列表中移除
      projects.value = projects.value.filter((x) => x.path !== p.path)
    } else {
      const actionText = shouldPermanentDelete ? '永久删除' : '移入回收站'
      toastRef.value?.show(`${actionText}失败：${r?.message || '未知错误'}`, 'error')
    }
    pendingProject.value = null
  }

  return {
    confirmVisible,
    pendingProject,
    permanentDelete,
    requestDelete,
    onCancelDelete,
    onConfirmDelete
  }
}
