import { ref } from 'vue'
import { getParentPath } from '@/utils/path.js'

/**
 * 项目卡片右键菜单：状态 + 菜单项装配 + 选项分发
 *
 * 菜单项基于「可用 IDE 列表」动态拼装；选中后回调相应的 actions。
 *
 * @param {{
 *   availableIdes: import('vue').Ref<Array>,
 *   actions: {
 *     openInIde: (ideId: string, project: any) => Promise<void> | void,
 *     openFolder: (project: any) => Promise<void> | void,
 *     openParentFolder: (project: any) => Promise<void> | void,
 *     copyPath: (project: any) => Promise<void> | void,
 *     showProperties: (project: any) => Promise<void> | void,
 *     togglePin: (project: any) => Promise<void> | void,
 *     requestDelete: (project: any) => void
 *   }
 * }} options
 */
export function useContextMenu({ availableIdes, actions }) {
  const ctxVisible = ref(false)
  const ctxX = ref(0)
  const ctxY = ref(0)
  const ctxItems = ref([])
  const ctxTarget = ref(null)

  /** 右键弹出菜单：根据 IDE 可用性动态拼装菜单项 */
  function onContextMenu(ev, project) {
    ctxTarget.value = project
    ctxX.value = ev.clientX
    ctxY.value = ev.clientY

    const items = []
    // IDE 打开项：按主进程返回顺序展示（VS Code → CodeBuddy → WebStorm → IDEA → Cursor → Trae）
    // 后面紧跟一个分割符，便于在 IDE 项较多时与其它操作视觉上区分
    for (const ide of availableIdes.value) {
      items.push({ label: ide.label, action: `open-ide:${ide.id}` })
    }
    if (availableIdes.value.length > 0) {
      items.push({ divider: true })
    }
    items.push({ label: '打开项目文件夹', action: 'open-folder' })
    // 根路径（盘符根 / 文件系统根）没有父级，此项不展示
    if (getParentPath(project.path)) {
      items.push({ label: '打开项目父级文件夹', action: 'open-parent-folder' })
    }
    items.push({ label: '复制项目路径', action: 'copy-path' })
    items.push({ label: '查看项目属性', action: 'show-properties' })
    items.push({ divider: true })
    items.push({ label: project.pinned ? '取消置顶' : '置顶', action: 'toggle-pin' })
    items.push({ divider: true })
    items.push({ label: '删除项目', action: 'delete', danger: true })

    ctxItems.value = items
    ctxVisible.value = true
  }

  /** 菜单项点击：分发到 actions */
  async function onMenuSelect(item) {
    const p = ctxTarget.value
    if (!p) return
    // IDE 打开：action 形如 `open-ide:vscode`
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
