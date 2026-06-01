import { ref } from 'vue'

/**
 * 重命名项目文件夹（弹窗输入新名称 → 调主进程改名 → 就地更新列表）
 *
 * @param {{
 *   toastRef: import('vue').Ref,
 *   projects: import('vue').Ref<Array>
 * }} options
 */
export function useRenameProject({ toastRef, projects }) {
  const renameVisible = ref(false)
  const renameTarget = ref(null)
  const renameValue = ref('')
  const renaming = ref(false)

  /** 由右键菜单触发：打开重命名弹窗，默认填入当前文件夹名 */
  function requestRename(project) {
    renameTarget.value = project
    renameValue.value = project?.name || ''
    renameVisible.value = true
  }

  /** 用户取消 */
  function onCancelRename() {
    renameVisible.value = false
    renameTarget.value = null
    renameValue.value = ''
  }

  /** 用户确认：调用主进程改名，成功后就地更新该项目的 name 与 path */
  async function onConfirmRename() {
    // 改名进行中忽略重复提交（弹窗未关、回车仍可触发）
    if (renaming.value) return
    const p = renameTarget.value
    const newName = renameValue.value.trim()
    if (!p) return onCancelRename()
    // 名称为空或未变化：直接关闭，不触发改名
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
