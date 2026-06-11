import { ref } from 'vue'

export function useRenameProject({ toastRef, projects }) {
  const renameVisible = ref(false)
  const renameTarget = ref(null)
  const renameValue = ref('')
  const renaming = ref(false)

  function requestRename(project) {
    renameTarget.value = project
    renameValue.value = project?.name || ''
    renameVisible.value = true
  }

  function onCancelRename() {
    renameVisible.value = false
    renameTarget.value = null
    renameValue.value = ''
  }

  async function onConfirmRename() {
    if (renaming.value) return
    const p = renameTarget.value
    const newName = renameValue.value.trim()
    if (!p) return onCancelRename()
    if (!newName || newName === p.name) return onCancelRename()

    renaming.value = true
    const r = await window.api.renameFolder(p.path, newName)
    renaming.value = false
    if (r?.ok) {
      const target = projects.value.find((x) => x.path === p.path)
      if (target) {
        target.path = r.path
        target.name = newName
      }
      toastRef.value?.show('重命名成功', 'success')
      onCancelRename()
    } else {
      toastRef.value?.show(`重命名失败：${r?.message || '未知错误'}`, 'error')
    }
  }

  return {
    renameVisible,
    renameTarget,
    renameValue,
    renaming,
    requestRename,
    onCancelRename,
    onConfirmRename
  }
}
