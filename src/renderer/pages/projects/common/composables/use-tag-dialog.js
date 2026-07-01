import { ref } from 'vue'
import { normalizeTags, tagsForKey, sameTagKey } from '@shared/tags.js'

/**
 * 打标签弹窗的状态与持久化（本地 / 远程项目共用）。
 *
 * 项目 key 约定：local=project.path，remote=project.key（path::alias）。
 * 确认后将 key 从所有标签移除，再写入选中标签，落盘后触发 reload 重新扫描/加载。
 *
 * @param {{ toastRef: import('vue').Ref, reload?: () => Promise<void> | void }} options
 */
export function useTagDialog({ toastRef, reload }) {
  const visible = ref(false)
  const target = ref(null)
  const allTags = ref([])
  const current = ref([])

  function keyOf(project) {
    return project?.key || project?.path || ''
  }

  async function open(project) {
    if (!project) return
    target.value = project
    try {
      const cfg = await window.api.readConfig()
      const tags = normalizeTags(cfg.tags)
      allTags.value = Object.keys(tags)
      current.value = tagsForKey(tags, keyOf(project))
    } catch {
      allTags.value = []
      current.value = []
    }
    visible.value = true
  }

  function cancel() {
    visible.value = false
    target.value = null
  }

  async function confirm(selected) {
    const project = target.value
    if (!project) return
    const key = keyOf(project)
    try {
      const cfg = await window.api.readConfig()
      const tags = normalizeTags(cfg.tags)
      // 先从所有标签移除该项目 key，避免取消勾选的标签残留
      for (const name of Object.keys(tags)) {
        tags[name] = tags[name].filter((k) => !sameTagKey(k, key))
      }
      // 写入选中标签（不存在则新建）
      for (const raw of selected || []) {
        const name = String(raw).trim()
        if (!name) continue
        if (!tags[name]) tags[name] = []
        if (!tags[name].some((k) => sameTagKey(k, key))) tags[name].push(key)
      }
      cfg.tags = tags
      await window.api.saveConfig(cfg)
      visible.value = false
      target.value = null
      toastRef.value?.show('已更新标签', 'success', 1200)
      await reload?.()
    } catch (err) {
      toastRef.value?.show(`打标签失败：${err.message}`, 'error')
    }
  }

  return { visible, target, allTags, current, open, cancel, confirm }
}
