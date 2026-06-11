import { ref } from 'vue'

export function useDeleteProject({ toastRef, projects }) {
  const confirmVisible = ref(false)
  const pendingProject = ref(null)
  const permanentDelete = ref(false)

  function requestDelete(project) {
    pendingProject.value = project
    permanentDelete.value = false
    confirmVisible.value = true
  }

  function onCancelDelete() {
    confirmVisible.value = false
    permanentDelete.value = false
    pendingProject.value = null
  }

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
