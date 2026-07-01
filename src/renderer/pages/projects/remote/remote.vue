<template>
  <!-- 远程连接项目子页 -->
  <PageLayout ref="layoutRef" @scroll="onBodyScroll">
    <template #header>
      <ProjectsToolbar
        v-model:keyword="keyword"
        :view="view"
        title="远程连接项目"
        search-placeholder="搜索项目（远程信息 / 项目名 / 描述 / #标签）"
        add-tooltip="新增远程连接项目"
        :total-count="projects.length"
        :filtered-count="filteredProjects.length"
        :has-filter="!!debouncedKeyword"
        :loading="loading"
        :at-top="atTop"
        :ides="menuIdes"
        :tags="tagNames"
        @scroll-to-top="scrollToTop"
        @refresh="loadProjects"
        @add="addVisible = true"
        @launch-ide="launchIde"
        @update:view="setView"
      />
    </template>

    <EmptyState v-if="loading && projects.length === 0">正在加载...</EmptyState>
    <EmptyState
      v-else-if="projects.length === 0"
      emoji="🌐"
      title="暂无远程项目"
      tip="点击上方 + 按钮添加远程连接项目"
    />
    <EmptyState
      v-else-if="debouncedKeyword && filteredProjects.length === 0"
      emoji="🔍"
      title="没有匹配的项目"
      tip="尝试调整搜索关键字或清空搜索"
    />
    <template v-else>
      <div v-if="view === ViewType.FLAT" class="grid">
        <RemoteProjectCard
          v-for="p in filteredProjects"
          :key="p.id"
          :project="p"
          :tag-style="typeStyleMap[p.type] || typeStyleMap.DEFAULT"
          :type-label="typeLabelMap[p.type] || '其他'"
          @open="handleOpen"
          @contextmenu="onContextMenu"
          @toggle-pin="togglePin"
        />
      </div>
      <ProjectGroups v-else :groups="projectGroups" :item-key="(p) => p.id">
        <template #default="{ project }">
          <RemoteProjectCard
            :project="project"
            :tag-style="typeStyleMap[project.type] || typeStyleMap.DEFAULT"
            :type-label="typeLabelMap[project.type] || '其他'"
            @open="handleOpen"
            @contextmenu="onContextMenu"
            @toggle-pin="togglePin"
          />
        </template>
      </ProjectGroups>
    </template>

    <BaseContextMenu
      :visible="ctxVisible"
      :x="ctxX"
      :y="ctxY"
      :items="ctxItems"
      :footnote="ctxTarget?.name || ''"
      @close="closeMenu"
      @select="onMenuSelect"
    />

    <AddRemoteDialog
      :visible="addVisible"
      @close="addVisible = false"
      @confirm="onAddConfirm"
      @validate-error="onValidateError"
      @debug-result="onDebugResult"
    />

    <AddRemoteDialog
      v-if="editProject"
      :visible="editVisible"
      :initial-data="editProject"
      @close="closeEditDialog"
      @confirm="onEditConfirm"
      @validate-error="onValidateError"
      @debug-result="onDebugResult"
    />

    <BaseConfirmDialog
      :visible="confirmVisible"
      title="删除项目"
      close-icon
      confirm-text="确认删除"
      @cancel="cancelDelete"
      @confirm="onConfirmDelete"
    >
      <div class="delete-path">{{ pendingProject?.name || '' }}</div>
    </BaseConfirmDialog>

    <TagDialog
      :visible="tagVisible"
      :tags="tagDialogTags"
      :value="tagCurrent"
      @cancel="cancelTag"
      @confirm="confirmTag"
    />

    <BaseToast ref="toastRef" />
  </PageLayout>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import PageLayout from '@/components/common/page-layout.vue'
import BaseContextMenu from '@/components/common/base-context-menu.vue'
import BaseConfirmDialog from '@/components/common/base-confirm-dialog.vue'
import BaseToast from '@/components/common/base-toast.vue'
import ProjectsToolbar from '../common/components/projects-toolbar.vue'
import EmptyState from '../common/components/empty-state.vue'
import RemoteProjectCard from './components/remote-project-card.vue'
import AddRemoteDialog from './components/add-remote-dialog.vue'
import ProjectGroups from '../common/components/project-groups.vue'
import TagDialog from '../common/components/tag-dialog.vue'
import { useIdes } from '@/composables/use-ides.js'
import { useRemoteProjectSearch } from '../common/composables/use-project-search.js'
import { useProjectGroups } from '../common/composables/use-project-groups.js'
import { useProjectView } from '../common/composables/use-project-view.js'
import { useScrollToTop } from '../common/composables/use-scroll-to-top.js'
import { useRemoteProjects } from './composables/use-remote-projects.js'
import { useRemoteContextMenu } from './composables/use-remote-context-menu.js'
import { useTagDialog } from '../common/composables/use-tag-dialog.js'
import { PathType } from '@shared/path-types.js'
import { ViewType } from '@shared/view.js'

const props = defineProps({
  active: Boolean
})

const toastRef = ref(null)
const layoutRef = ref(null)
const bodyRef = computed(() => layoutRef.value?.bodyRef)

const excludeIds = ref([])
const { availableIdes, menuIdes } = useIdes({ excludeIds })

async function syncExcludeIds() {
  try {
    const cfg = await window.api.readConfig()
    excludeIds.value = Array.isArray(cfg.ide_cfg?.exclude) ? cfg.ide_cfg.exclude : []
  } catch {}
}

const { projects, loading, loadProjects, togglePin, deleteProject, updateProject } =
  useRemoteProjects({ toastRef })
const { keyword, debouncedKeyword, filteredProjects } = useRemoteProjectSearch({ projects })
const { atTop, onBodyScroll, scrollToTop } = useScrollToTop({ bodyRef })
const { view, loadView, setView } = useProjectView({ side: 'remote' })
const projectGroups = useProjectGroups(filteredProjects)

// 可用标签名（供搜索框 #标签 自动补全）
const tagNames = ref([])
async function syncTagNames() {
  try {
    const cfg = await window.api.readConfig()
    tagNames.value = Object.keys(cfg.tags || {})
  } catch {}
}

const {
  visible: tagVisible,
  allTags: tagDialogTags,
  current: tagCurrent,
  open: openTagDialog,
  cancel: cancelTag,
  confirm: confirmTag
} = useTagDialog({
  toastRef,
  reload: async () => {
    await loadProjects()
    await syncTagNames()
  }
})

const addVisible = ref(false)
const editVisible = ref(false)
const editProject = ref(null)
const confirmVisible = ref(false)
const pendingProject = ref(null)

/** 类型标签颜色映射（线框、无背景色） */
const typeStyleMap = {
  [PathType.SSH]: {
    color: '#2196F3',
    borderColor: '#1976D2',
    backgroundColor: 'transparent',
    border: '1px solid #1976D2'
  },
  [PathType.WSL]: {
    color: '#9C27B0',
    borderColor: '#7B1FA2',
    backgroundColor: 'transparent',
    border: '1px solid #7B1FA2'
  },
  DEFAULT: {
    color: '#607D8B',
    borderColor: '#455A64',
    backgroundColor: 'transparent',
    border: '1px solid #455A64'
  }
}

const typeLabelMap = {
  [PathType.SSH]: 'SSH',
  [PathType.WSL]: 'WSL',
  [PathType.DEFAULT]: '其他'
}

/** 替换脚本占位符，返回可执行的命令 */
function resolveScript(project, entry) {
  let script = project.cfg?.script || ''
  if (!script) return ''
  script = script.replace(/<entry>/g, entry || '')
  script = script.replace(/<path>/g, project.path || '')
  script = script.replace(/<param>/g, project.cfg?.param || '')
  script = script.replace(/<scheme>/g, project.cfg?.scheme || '')
  script = script.replace(/<dir>/g, project.cfg?.dir || '')
  // 清除未替换的占位符
  script = script.replace(/<[^>]+>/g, '')
  return script.trim()
}

/** 根据 IDE id 查找完整 IDE 对象（含 entry 字段），在所有可用 IDE 中查找 */
function getIdeById(ideId) {
  return availableIdes.value.find((i) => i.id === ideId)
}

/** 按 IDE id 打开远程项目：解析脚本占位符后执行，成功后记录最近打开 */
async function openInIde(ideId, project) {
  const ide = getIdeById(ideId)
  const entry = ide?.entry || ''
  const cmd = resolveScript(project, entry)
  if (!cmd) {
    toastRef.value?.show('脚本代码为空，无法打开', 'error')
    return
  }
  const result = await window.api.debugIdeScript(cmd)
  if (!result?.ok) {
    toastRef.value?.show(`打开失败：${result?.message || '未知错误'}`, 'error')
    return
  }
  // 记录最近打开
  await window.api.appendRecentOpened(project.key).catch(() => {})
}

/** 快速启动 IDE：执行该 IDE 的 entry 命令，仅唤起应用本身（不带项目路径） */
async function launchIde(ide) {
  if (!ide?.entry) {
    toastRef.value?.show('该 IDE 缺少启动命令', 'error')
    return
  }
  const r = await window.api.debugIdeScript(ide.entry)
  if (!r?.ok) {
    toastRef.value?.show(`启动失败：${r?.message || '未知错误'}`, 'error')
  }
}

/** 双击打开：使用默认 IDE（全量查找），fallback 到首个可用 IDE */
async function handleOpen(project) {
  const cfg = await window.api.readConfig()
  const defaultIdeId = cfg.ide_cfg?.default
  const allIdes = availableIdes.value
  let ideId = defaultIdeId
  if (!ideId || !allIdes.some((i) => i.id === ideId)) {
    ideId = allIdes[0]?.id
  }
  if (!ideId) {
    toastRef.value?.show('未检测到可用 IDE', 'error')
    return
  }
  await openInIde(ideId, project)
}

async function copyPath(project) {
  const r = await window.api.copyText(project.path)
  if (r?.ok) {
    toastRef.value?.show('已复制项目路径', 'success', 1200)
  } else {
    toastRef.value?.show(`复制失败：${r?.message || '未知错误'}`, 'error')
  }
}

function requestEdit(project) {
  editProject.value = projects.value.find((p) => p.id === project.id) || project
  editVisible.value = true
}

function requestDelete(project) {
  pendingProject.value = project
  confirmVisible.value = true
}

function closeEditDialog() {
  editVisible.value = false
  editProject.value = null
}

function cancelDelete() {
  confirmVisible.value = false
  pendingProject.value = null
}

function onValidateError(msg) {
  toastRef.value?.show(msg, 'error')
}

function onDebugResult(ok, msg) {
  toastRef.value?.show(ok ? '调试成功' : `调试失败：${msg || '未知错误'}`, ok ? 'success' : 'error')
}

async function onConfirmDelete() {
  const target = pendingProject.value
  confirmVisible.value = false
  pendingProject.value = null
  if (target) {
    await deleteProject(target)
  }
}

async function onAddConfirm(data) {
  addVisible.value = false
  try {
    const cfg = await window.api.readConfig()
    if (!cfg.remote) cfg.remote = { paths: [], pinned: [] }
    cfg.remote.paths.push(data)
    await window.api.saveConfig(cfg)
    toastRef.value?.show('已添加远程项目', 'success')
    loadProjects()
  } catch (err) {
    toastRef.value?.show(`添加失败：${err.message}`, 'error')
  }
}

async function onEditConfirm(data) {
  const target = editProject.value
  editVisible.value = false
  editProject.value = null
  if (target) {
    try {
      await updateProject(target, data)
    } catch (err) {
      toastRef.value?.show(`更新失败：${err.message}`, 'error')
    }
  }
}

const { ctxVisible, ctxX, ctxY, ctxItems, ctxTarget, onContextMenu, onMenuSelect, closeMenu } =
  useRemoteContextMenu({
    availableIdes: menuIdes,
    actions: {
      openInIde,
      copyPath,
      edit: requestEdit,
      togglePin,
      requestDelete,
      tag: openTagDialog
    }
  })

onMounted(() => {
  loadProjects()
  syncExcludeIds()
  syncTagNames()
  loadView()
})
watch(
  () => props.active,
  (val) => {
    if (val) {
      loadProjects()
      syncExcludeIds()
      syncTagNames()
      loadView()
    }
  }
)
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.delete-path {
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: var(--color-hover);
  color: var(--color-text);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
  user-select: text;
}
</style>
