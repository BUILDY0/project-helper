import { ref } from 'vue'

/**
 * 目录拖拽到本地项目区域的交互：
 * 维护 dragging 遮罩状态，drop 时提取真实目录路径并回调。
 *
 * dragenter/dragleave 会在子元素间反复冒泡，用进入计数避免遮罩闪烁。
 *
 * @param {{
 *   onDirs: (dirs: string[]) => void | Promise<void>,
 *   toastRef?: import('vue').Ref<any>
 * }} options
 */
export function useDirDrop({ onDirs, toastRef }) {
  const isDragging = ref(false)
  let enterCount = 0

  /** 仅当拖拽内容包含文件时才接管 */
  function hasFiles(e) {
    return Array.from(e.dataTransfer?.types || []).includes('Files')
  }

  function onDragEnter(e) {
    if (!hasFiles(e)) return
    e.preventDefault()
    enterCount++
    isDragging.value = true
  }

  function onDragOver(e) {
    if (!hasFiles(e)) return
    // 必须阻止默认行为，否则不会触发 drop
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave(e) {
    if (!hasFiles(e)) return
    enterCount--
    if (enterCount <= 0) {
      enterCount = 0
      isDragging.value = false
    }
  }

  async function onDrop(e) {
    if (!hasFiles(e)) return
    e.preventDefault()
    enterCount = 0
    isDragging.value = false

    const files = Array.from(e.dataTransfer?.files || [])
    if (!files.length) return

    const paths = files.map((f) => window.api.getPathForFile(f)).filter(Boolean)
    if (!paths.length) return

    const dirs = await window.api.filterDirectories(paths)
    if (!dirs.length) {
      toastRef?.value?.show('请拖拽文件夹', 'info')
      return
    }
    await onDirs(dirs)
  }

  return { isDragging, onDragEnter, onDragOver, onDragLeave, onDrop }
}
