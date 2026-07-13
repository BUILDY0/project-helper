import { ref } from 'vue'
import { PathType } from '@shared/path-types.js'

/** 远程项目类型标签颜色映射 */
const TYPE_COLORS = {
  [PathType.SSH]: { color: '#2196F3', border: '#1976D2' },
  [PathType.WSL]: { color: '#9C27B0', border: '#7B1FA2' },
  DEFAULT: { color: '#607D8B', border: '#455A64' }
}

function getTypeStyle(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.DEFAULT
}

function getTypeLabel(type) {
  switch (type) {
    case PathType.SSH:
      return 'SSH'
    case PathType.WSL:
      return 'WSL'
    default:
      return '其他'
  }
}

export function useRemoteContextMenu({ availableIdes, actions }) {
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
    // 仅保留复制路径
    items.push({ label: '修改配置', action: 'edit' })
    items.push({ label: '打标签', action: 'tag' })
    items.push({ label: '复制项目', action: 'copy-project' })
    items.push({ label: '复制项目路径', action: 'copy-path' })
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
    if (item.action === 'copy-path') {
      await actions.copyPath(p)
    } else if (item.action === 'copy-project') {
      await actions.copyProject(p)
    } else if (item.action === 'edit') {
      await actions.edit(p)
    } else if (item.action === 'tag') {
      await actions.tag(p)
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
    closeMenu,
    getTypeStyle,
    getTypeLabel
  }
}
