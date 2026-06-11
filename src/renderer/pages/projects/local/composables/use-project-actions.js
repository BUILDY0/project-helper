export function useProjectActions({ toastRef, availableIdes, projects }) {
  async function openWithDefaultIde(project) {
    if (availableIdes.value.length === 0) {
      toastRef.value?.show('未检测到可用 IDE，将直接打开项目目录', 'info')
    }
    const r = await window.api.openWithDefaultIde(project.path)
    if (!r?.ok) {
      toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
    }
  }

  async function openGitUrl(project) {
    if (!project?.gitUrl) return
    const r = await window.api.openExternal(project.gitUrl)
    if (!r?.ok) {
      toastRef.value?.show(`打开仓库失败：${r?.message || '未知错误'}`, 'error')
    }
  }

  async function openPackageFolder(project) {
    if (!project?.path) return
    const r = await window.api.openFolder(project.path)
    if (!r?.ok) {
      toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
    }
  }

  async function openReadme(project) {
    if (!project?.readmePath) return
    const r = await window.api.openFolder(project.readmePath)
    if (!r?.ok) {
      toastRef.value?.show(`打开 README 失败：${r?.message || '未知错误'}`, 'error')
    }
  }

  async function togglePin(project) {
    if (!project) return
    try {
      const pinned = await window.api.togglePin(project.path)
      const pinnedSet = new Set((pinned || []).map((p) => p))
      for (const item of projects.value) {
        item.pinned = pinnedSet.has(item.path)
      }
      projects.value.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      toastRef.value?.show(project.pinned ? '已置顶' : '已取消置顶', 'success', 1200)
    } catch (err) {
      toastRef.value?.show(`操作失败：${err.message}`, 'error')
    }
  }

  return { openWithDefaultIde, openGitUrl, openPackageFolder, openReadme, togglePin }
}
