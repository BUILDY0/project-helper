import { ref } from 'vue'
import { getParentPath } from '@/utils/path.js'

export function useContextMenu({ availableIdes, actions }) {
  const ctxVisible = ref(false)
  const ctxX = ref(0)
  const ctxY = ref(0)
  const ctxItems = ref([])
  const ctxTarget = ref(null)

  function onContextMenu(ev, project) {
    ctxTarget.value = project
    ctxX.value = ev.clientX
    ctxY.value = ev.clientY

    const items = []
    for (const ide of availableIdes.value) {
      items.push({ label: ide.label, action: `open-ide:${ide.id}` })
    }
    if (availableIdes.value.length > 0) {
      items.push({ divider: true })
    }
    items.push({ label: '打开项目文件夹', action: 'open-folder' })
    const hasParent = Boolean(getParentPath(project.path))
    if (hasParent) {
      items.push({ label: '打开项目父级文件夹', action: 'open-parent-folder' })
    }
    items.push({ label: '复制项目路径', action: 'copy-path' })
    if (hasParent) {
      items.push({ label: '复制项目父级路径', action: 'copy-parent-path' })
    }
    items.push({ label: '重命名', action: 'rename' })
    items.push({ label: '查看项目属性', action: 'show-properties' })
    items.push({ divider: true })
    items.push({ label: project.pinned ? '取消置顶' : '置顶', action: 'toggle-pin' })
    items.push({ divider: true })
    items.push({ label: '删除项目', action: 'delete', danger: true })

    ctxItems.value = items
    ctxVisible.value = true
  }

  async function onMenuSelect(item) {
    const p = ctxTarget.value
    if (!p) return
    if (typeof item.action === 'string' && item.action.startsWith('open-ide:')) {
      const id = item.action.slice('open-ide:'.length)
      await actions.openInIde(id, p)
      return
    }
    if (item.action === 'open-folder') {
      await actions.openFolder(p)
    } else if (item.action === 'open-parent-folder') {
      await actions.openParentFolder(p)
    } else if (item.action === 'copy-path') {
      await actions.copyPath(p)
    } else if (item.action === 'copy-parent-path') {
      await actions.copyParentPath(p)
    } else if (item.action === 'rename') {
      await actions.rename(p)
    } else if (item.action === 'show-properties') {
      await actions.showProperties(p)
    } else if (item.action === 'toggle-pin') {
      await actions.togglePin(p)
    } else if (item.action === 'delete') {
      actions.requestDelete(p)
    }
  }

  function closeMenu() {
    ctxVisible.value = false
  }

  return {
    ctxVisible,
    ctxX,
    ctxY,
    ctxItems,
    ctxTarget,
    onContextMenu,
    onMenuSelect,
    closeMenu
  }
}
