/**
 * 项目卡片上的快捷动作（双击打开 IDE、打开仓库、打开文件夹、打开 README、置顶切换）
 *
 * 这些动作大多与列表数据无关，仅在 toast 提示和置顶持久化处依赖外部状态。
 *
 * @param {{
 *   toastRef: import('vue').Ref,
 *   availableIdes: import('vue').Ref<Array>,
 *   projects: import('vue').Ref<Array>
 * }} options
 */
export function useProjectActions({ toastRef, availableIdes, projects }) {
  /**
   * 双击：调主进程 openWithDefaultIde，优先级由主进程统一管理：
   * ide_cfg.default > 第一个可用 IDE > vscode > 文件管理器打开
   */
  async function openWithDefaultIde(project) {
    // 无任何可用 IDE 时给予提示（主进程会降级到文件管理器，这里额外提示用户）
    if (availableIdes.value.length === 0) {
      toastRef.value?.show('未检测到可用 IDE，将直接打开项目目录', 'info')
    }
    const r = await window.api.openWithDefaultIde(project.path)
    if (!r?.ok) {
      toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
    }
  }

  /** 状态图标：GitHub 图标点击，外部浏览器打开仓库地址 */
  async function openGitUrl(project) {
    if (!project?.gitUrl) return
    const r = await window.api.openExternal(project.gitUrl)
    if (!r?.ok) {
      toastRef.value?.show(`打开仓库失败：${r?.message || '未知错误'}`, 'error')
    }
  }

  /** 状态图标：Node.js 图标点击，打开项目文件夹 */
  async function openPackageFolder(project) {
    if (!project?.path) return
    const r = await window.api.openFolder(project.path)
    if (!r?.ok) {
      toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
    }
  }

  /** 状态图标：Markdown 图标点击，用系统默认应用打开 readme.md */
  async function openReadme(project) {
    if (!project?.readmePath) return
    const r = await window.api.openFolder(project.readmePath)
    if (!r?.ok) {
      toastRef.value?.show(`打开 README 失败：${r?.message || '未知错误'}`, 'error')
    }
  }

  /**
   * 切换 pin 状态：调用主进程持久化，结果回写后重排序
   * 同步处理「pin 路径已失效」由主进程统一过滤
   */
  async function togglePin(project) {
    if (!project) return
    try {
      const pinned = await window.api.togglePin(project.path)
      const pinnedSet = new Set((pinned || []).map((p) => p))
      // 回写每张卡片的 pinned 字段并重排序：pinned 优先 + 名称
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
