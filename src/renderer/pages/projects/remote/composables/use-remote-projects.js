import { ref } from 'vue'
import { normalizePathItem, projectKey } from '@shared/path-types.js'
import { normalizeTags, tagsForKey } from '@shared/tags.js'

import { MIN_LOADING_MS } from '../../local/composables/use-projects.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function useRemoteProjects({ toastRef }) {
  const projects = ref([])
  const loading = ref(false)

  async function loadProjects() {
    if (loading.value) return
    loading.value = true
    const start = Date.now()
    try {
      const cfg = await window.api.readConfig()
      const rawPaths = cfg.remote?.paths || []
      const pinnedArr = cfg.remote?.pinned || []
      const pinnedSet = new Set(pinnedArr)
      const tags = normalizeTags(cfg.tags)

      const list = []
      for (const raw of rawPaths) {
        const item = normalizePathItem(raw)
        if (!item) continue
        const key = projectKey(item)
        list.push({
          ...item,
          id: key,
          key: key,
          name: item.cfg?.alias || item.path,
          description: item.cfg?.desc || '',
          pinned: pinnedSet.has(key),
          tags: tagsForKey(tags, key)
        })
      }
      // 置顶优先 + 名称排序
      list.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      projects.value = list
    } catch (err) {
      toastRef.value?.show(`加载远程项目失败：${err.message}`, 'error')
    } finally {
      const remain = MIN_LOADING_MS - (Date.now() - start)
      if (remain > 0) await sleep(remain)
      loading.value = false
    }
  }

  async function togglePin(project) {
    if (!project) return
    try {
      const cfg = await window.api.readConfig()
      const pinned = cfg.remote?.pinned || []
      const key = project.key
      const idx = pinned.indexOf(key)
      if (idx >= 0) {
        pinned.splice(idx, 1)
      } else {
        pinned.push(key)
      }
      cfg.remote.pinned = pinned
      await window.api.saveConfig(cfg)
      await loadProjects()
      toastRef.value?.show(project.pinned ? '已取消置顶' : '已置顶', 'success', 1200)
    } catch (err) {
      toastRef.value?.show(`操作失败：${err.message}`, 'error')
    }
  }

  async function deleteProject(project) {
    if (!project) return
    try {
      const cfg = await window.api.readConfig()
      const paths = cfg.remote?.paths || []
      const key = project.key
      const idx = paths.findIndex((p) => {
        const item = normalizePathItem(p)
        if (!item) return false
        return projectKey(item) === key
      })
      if (idx >= 0) {
        paths.splice(idx, 1)
        // 同步清理 pinned 和最近打开记录
        const pinned = cfg.remote?.pinned || []
        const pinIdx = pinned.indexOf(key)
        if (pinIdx >= 0) pinned.splice(pinIdx, 1)
        cfg.remote.pinned = pinned
        await window.api.saveConfig(cfg)
        await window.api.removeRecentKey(key).catch(() => {})
        await loadProjects()
        toastRef.value?.show('已删除远程项目', 'success')
      }
    } catch (err) {
      toastRef.value?.show(`删除失败：${err.message}`, 'error')
    }
  }

  async function updateProject(project, updatedData) {
    if (!project) return
    try {
      const cfg = await window.api.readConfig()
      const paths = cfg.remote?.paths || []
      const pinned = cfg.remote?.pinned || []
      const oldKey = project.key
      const idx = paths.findIndex((p) => {
        const item = normalizePathItem(p)
        if (!item) return false
        return projectKey(item) === oldKey
      })
      if (idx >= 0) {
        paths[idx] = updatedData
        const newKey = projectKey(normalizePathItem(updatedData))
        if (newKey && newKey !== oldKey) {
          const pinIdx = pinned.indexOf(oldKey)
          if (pinIdx >= 0) {
            pinned[pinIdx] = newKey
            cfg.remote.pinned = pinned
          }
        }
        // 先写盘（config:save 现保留 recent_opened），再替换 key
        await window.api.saveConfig(cfg)
        if (newKey && newKey !== oldKey) {
          await window.api.replaceRecentKey(oldKey, newKey).catch(() => {})
        }
        await loadProjects()
        toastRef.value?.show('已更新项目配置', 'success')
      }
    } catch (err) {
      toastRef.value?.show(`更新失败：${err.message}`, 'error')
    }
  }

  return { projects, loading, loadProjects, togglePin, deleteProject, updateProject }
}
