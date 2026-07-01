import { computed } from 'vue'

/** 分组 key 常量 */
export const GROUP_KEY_PINNED = '__pinned__'
export const GROUP_KEY_DEFAULT = '__default__'
export const GROUP_KEY_PREFIX_TAG = 'tag::'

/** 分组展示文案常量 */
export const GROUP_LABEL_PINNED = '置顶'
export const GROUP_LABEL_DEFAULT = '默认'

/**
 * 把项目列表按「置顶 > 标签 > 默认」分组，用于分类视图。
 *
 * 规则（同个项目可命中多个分类）：
 * - 置顶：pinned 为真的项目，至少 1 个时才生成该分组
 * - 标签：命中某标签的项目，按标签名排序，每个标签一个分组
 * - 默认：既未置顶、也没有任何标签的项目，存在时才生成该分组
 *
 * @param {import('vue').Ref<Array>} projects 已过滤的项目列表（响应式）
 * @returns {import('vue').ComputedRef<Array<{ key: string, label: string, projects: Array }>>}
 */
export function useProjectGroups(projects) {
  return computed(() => {
    const list = projects.value || []
    const groups = []

    const pinned = list.filter((p) => p.pinned)
    if (pinned.length) {
      groups.push({ key: GROUP_KEY_PINNED, label: GROUP_LABEL_PINNED, projects: pinned })
    }

    const tagMap = new Map()
    for (const p of list) {
      for (const t of p.tags || []) {
        if (!tagMap.has(t)) tagMap.set(t, [])
        tagMap.get(t).push(p)
      }
    }
    for (const name of [...tagMap.keys()].sort((a, b) => a.localeCompare(b))) {
      groups.push({
        key: `${GROUP_KEY_PREFIX_TAG}${name}`,
        label: name,
        projects: tagMap.get(name)
      })
    }

    // 默认：无标签且未置顶（置顶项归到「置顶」，带标签项归到对应标签）
    const untagged = list.filter((p) => !p.pinned && !(p.tags && p.tags.length))
    if (untagged.length) {
      groups.push({ key: GROUP_KEY_DEFAULT, label: GROUP_LABEL_DEFAULT, projects: untagged })
    }

    return groups
  })
}
