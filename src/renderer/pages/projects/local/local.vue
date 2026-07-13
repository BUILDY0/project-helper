<template>
  <!-- 本地项目子页：卡片网格 + 空态 + 右键菜单 + 对话框 + 目录拖拽添加 -->
  <div
    class="local-drop-zone"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <PageLayout ref="layoutRef" @scroll="onBodyScroll">
      <template #header>
        <ProjectsToolbar
          v-model:keyword="keyword"
          :view="view"
          title="本地项目"
          search-placeholder="搜索项目（路径 / 项目名 / 描述 / #标签）"
          add-tooltip="新增扫描目录，后续可以在配置页中管理"
          :total-count="projects.length"
          :filtered-count="filteredProjects.length"
          :has-filter="!!debouncedKeyword"
          :loading="loading"
          :at-top="atTop"
          :ides="menuIdes"
          :tags="tagNames"
          clone-enabled
          @scroll-to-top="scrollToTop"
          @refresh="loadProjects"
          @add="openAddScan"
          @clone-repo="openCloneDialog"
          @launch-ide="launchIde"
          @update:view="setView"
        />
      </template>

      <EmptyState v-if="loading && projects.length === 0">正在扫描项目...</EmptyState>
      <EmptyState
        v-else-if="projects.length === 0"
        emoji="📂"
        title="暂无项目"
        tip="点击上方 + 按钮添加扫描目录"
      />
      <EmptyState
        v-else-if="debouncedKeyword && filteredProjects.length === 0"
        emoji="🔍"
        title="没有匹配的项目"
        tip="尝试调整搜索关键字或清空搜索"
      />
      <template v-else>
        <div v-if="view === ViewType.FLAT" class="grid">
          <ProjectCard
            v-for="p in filteredProjects"
            :key="p.path"
            :project="p"
            @open="openWithDefaultIde"
            @contextmenu="onContextMenu"
            @toggle-pin="togglePin"
            @open-git="openGitUrl"
            @open-pkg="openPackageFolder"
            @open-readme="openReadme"
          />
        </div>
        <ProjectGroups v-else :groups="projectGroups" :item-key="(p) => p.path">
          <template #default="{ project }">
            <ProjectCard
              :project="project"
              @open="openWithDefaultIde"
              @contextmenu="onContextMenu"
              @toggle-pin="togglePin"
              @open-git="openGitUrl"
              @open-pkg="openPackageFolder"
              @open-readme="openReadme"
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

      <BaseConfirmDialog
        :visible="renameVisible"
        title="重命名项目"
        close-icon
        confirm-text="确定"
        confirm-tone="primary"
        @cancel="onCancelRename"
        @confirm="onConfirmRename"
      >
        <div class="rename-body">
          <BaseInput
            ref="renameInputRef"
            v-model="renameValue"
            placeholder="请输入新的文件夹名称"
            @enter="onConfirmRename"
          />
        </div>
      </BaseConfirmDialog>

      <BaseConfirmDialog
        :visible="confirmVisible"
        title="删除项目"
        close-icon
        :confirm-text="permanentDelete ? '永久删除' : '移入回收站'"
        @cancel="onCancelDelete"
        @confirm="onConfirmDelete"
      >
        <div class="delete-confirm">
          <div class="delete-path">{{ pendingProject?.path || '' }}</div>
          <label class="permanent-delete-option">
            <span
              class="delete-help-icon"
              v-tooltip:bottom="'开启后将直接从磁盘移除，无法从回收站恢复。'"
            >
              i
            </span>
            <span class="permanent-delete-copy">永久删除</span>
            <BaseSwitch v-model="permanentDelete" tone="danger" aria-label="永久删除" />
          </label>
        </div>
      </BaseConfirmDialog>

      <BaseConfirmDialog
        :visible="addScanVisible"
        title="确认添加扫描目录"
        close-icon
        confirm-text="确认添加"
        confirm-tone="primary"
        :width="520"
        @cancel="cancelAddScan"
        @confirm="confirmAddScan"
      >
        <div v-if="addScanPending.length" class="add-scan-list">
          <PathListItem
            v-for="(p, i) in addScanPending"
            :key="`add-scan-${i}`"
            :path="p.path"
            remove-message="确认移除该目录？"
            @remove="removeAddScanAt(i)"
          >
            <template #middle>
              <span class="forced-toggle" v-tooltip="ADD_FORCED_TIP">
                <BaseSwitch
                  :model-value="isAddScanForced(p)"
                  size="sm"
                  aria-label="强制命中"
                  @update:model-value="(v) => setAddScanForced(i, v)"
                />
                <span class="forced-toggle__label" @click="toggleAddScanForced(i)">强制命中</span>
              </span>
            </template>
          </PathListItem>
        </div>
        <div v-else class="add-scan-empty">已无待添加目录</div>
      </BaseConfirmDialog>

      <BaseToast ref="toastRef" />
    </PageLayout>

    <TagDialog
      :visible="tagVisible"
      :tags="tagDialogTags"
      :value="tagCurrent"
      @cancel="cancelTag"
      @confirm="confirmTag"
    />

    <CloneRepoDialog
      :visible="cloneDialogVisible"
      @cancel="cancelCloneDialog"
      @confirm="startClone"
    />

    <CloneProgressOverlay
      :visible="cloneOverlayVisible"
      :repo="cloneRepo"
      :stage="cloneStage"
      :progress="cloneProgress"
      :done="cloneDone"
      @cancel="cancelClone"
      @open="openClonedProject"
      @close="closeCloneOverlay"
    />

    <CopyProjectDialog
      :visible="copyDialogVisible"
      :project="copyProject"
      @cancel="cancelCopyDialog"
      @confirm="startCopy"
    />

    <CopyProgressOverlay
      :visible="copyOverlayVisible"
      :source="copySource"
      :progress="copyProgress"
      :done="copyDone"
      @cancel="cancelCopy"
      @open="openCopiedProject"
      @close="closeCopyOverlay"
    />

    <BaseConfirmDialog
      :visible="cloneGitMissingVisible"
      title="未检测到 Git"
      confirm-text="前往下载 Git"
      cancel-text="稍后再说"
      confirm-tone="primary"
      :width="420"
      @cancel="dismissGitMissing"
      @confirm="openGitDownload"
    >
      <div class="git-missing-guide">
        <p>克隆仓库需要系统已安装 Git，但当前未检测到可用的 Git。</p>
        <p>请前往官网下载安装，安装完成后重启应用再重试克隆。</p>
      </div>
    </BaseConfirmDialog>

    <transition name="drop-overlay-fade">
      <div v-if="isDragging" class="drop-overlay">
        <div class="drop-overlay__inner">
          <span class="drop-overlay__text">拖拽可以快速添加扫描目录…</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import PageLayout from '@/components/common/page-layout.vue'
import BaseContextMenu from '@/components/common/base-context-menu.vue'
import BaseConfirmDialog from '@/components/common/base-confirm-dialog.vue'
import BaseInput from '@/components/common/base-input.vue'
import BaseToast from '@/components/common/base-toast.vue'
import BaseSwitch from '@/components/common/base-switch.vue'
import ProjectCard from './components/project-card.vue'
import ProjectsToolbar from '../common/components/projects-toolbar.vue'
import ProjectGroups from '../common/components/project-groups.vue'
import EmptyState from '../common/components/empty-state.vue'
import TagDialog from '../common/components/tag-dialog.vue'
import CloneRepoDialog from './components/clone-repo-dialog.vue'
import CloneProgressOverlay from './components/clone-progress-overlay.vue'
import CopyProjectDialog from './components/copy-project-dialog.vue'
import CopyProgressOverlay from './components/copy-progress-overlay.vue'
import { useIdes } from '@/composables/use-ides.js'
import { useProjects } from './composables/use-projects.js'
import { useProjectSearch } from '../common/composables/use-project-search.js'
import { useProjectGroups } from '../common/composables/use-project-groups.js'
import { useProjectView } from '../common/composables/use-project-view.js'
import { ViewType } from '@shared/view.js'
import { useScrollToTop } from '../common/composables/use-scroll-to-top.js'
import { useProjectActions } from './composables/use-project-actions.js'
import { useContextMenu } from './composables/use-context-menu.js'
import { useDeleteProject } from './composables/use-delete-project.js'
import { useRenameProject } from './composables/use-rename-project.js'
import { useTagDialog } from '../common/composables/use-tag-dialog.js'
import { getParentPath } from '@/utils/path.js'
import PathListItem from '@/pages/settings/components/path-list-item.vue'
import { useAddScanDirDialog } from './composables/use-add-scan-dir-dialog.js'
import { useCloneRepo } from './composables/use-clone-repo.js'
import { useCopyProject } from './composables/use-copy-project.js'
import { useDirDrop } from './composables/use-dir-drop.js'

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

const { projects, loading, loadProjects } = useProjects({ toastRef })
const { keyword, debouncedKeyword, filteredProjects } = useProjectSearch({ projects })
const { view, loadView, setView } = useProjectView({ side: 'local' })
const projectGroups = useProjectGroups(filteredProjects)

// 可用标签名（供搜索框 #标签 自动补全），随项目刷新同步
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
const { atTop, onBodyScroll, scrollToTop } = useScrollToTop({ bodyRef })
const { openWithDefaultIde, openGitUrl, openPackageFolder, openReadme, togglePin } =
  useProjectActions({ toastRef, availableIdes, projects })

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

const {
  confirmVisible,
  pendingProject,
  permanentDelete,
  requestDelete,
  onCancelDelete,
  onConfirmDelete
} = useDeleteProject({ toastRef, projects })

const renameInputRef = ref(null)
const { renameVisible, renameValue, requestRename, onCancelRename, onConfirmRename } =
  useRenameProject({ toastRef, projects })

// 复制项目：表单弹窗 + 右下角进度浮层（在右键菜单 actions 引用前声明）
const {
  dialogVisible: copyDialogVisible,
  dialogProject: copyProject,
  overlayVisible: copyOverlayVisible,
  overlaySource: copySource,
  overlayProgress: copyProgress,
  overlayDone: copyDone,
  openDialog: openCopyDialog,
  cancelDialog: cancelCopyDialog,
  startCopy,
  cancelCopy,
  openCopiedProject,
  closeOverlay: closeCopyOverlay
} = useCopyProject({ toastRef, loadProjects })

watch(renameVisible, (val) => {
  if (!val) return
  nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
})

const { ctxVisible, ctxX, ctxY, ctxItems, ctxTarget, onContextMenu, onMenuSelect, closeMenu } =
  useContextMenu({
    availableIdes: menuIdes,
    actions: {
      openInIde: async (ideId, project) => {
        const r = await window.api.openInIde(ideId, project.path)
        if (!r?.ok) {
          toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
        }
      },
      openFolder: async (project) => {
        const r = await window.api.openFolder(project.path)
        if (!r?.ok) {
          toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
        }
      },
      openParentFolder: async (project) => {
        const parent = getParentPath(project.path)
        if (!parent) {
          toastRef.value?.show('已是根目录，没有父级文件夹', 'info')
          return
        }
        const r = await window.api.openFolder(parent)
        if (!r?.ok) {
          toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
        }
      },
      copyPath: async (project) => {
        const r = await window.api.copyText(project.path)
        if (r?.ok) {
          toastRef.value?.show('已复制项目路径', 'success', 1200)
        } else {
          toastRef.value?.show(`复制失败：${r?.message || '未知错误'}`, 'error')
        }
      },
      copyParentPath: async (project) => {
        const parent = getParentPath(project.path)
        if (!parent) {
          toastRef.value?.show('已是根目录，没有父级路径', 'info')
          return
        }
        const r = await window.api.copyText(parent)
        if (r?.ok) {
          toastRef.value?.show('已复制项目父级路径', 'success', 1200)
        } else {
          toastRef.value?.show(`复制失败：${r?.message || '未知错误'}`, 'error')
        }
      },
      showProperties: async (project) => {
        const r = await window.api.showProperties(project.path)
        if (!r?.ok) {
          toastRef.value?.show(`查看属性失败：${r?.message || '未知错误'}`, 'error')
        }
      },
      rename: requestRename,
      togglePin,
      requestDelete,
      tag: openTagDialog,
      copyProject: openCopyDialog
    }
  })

const ADD_FORCED_TIP = '开启后，扫描时强制命中该目录。'
const {
  visible: addScanVisible,
  pendingPaths: addScanPending,
  open: openAddScan,
  openFromPaths: openAddScanFromPaths,
  removeAt: removeAddScanAt,
  isForced: isAddScanForced,
  setForced: setAddScanForced,
  toggleForced: toggleAddScanForced,
  cancel: cancelAddScan,
  confirm: confirmAddScan
} = useAddScanDirDialog({ toastRef, loadProjects })

// 拖拽目录到本地项目区域 → 复用添加扫描目录弹窗
const { isDragging, onDragEnter, onDragOver, onDragLeave, onDrop } = useDirDrop({
  toastRef,
  onDirs: openAddScanFromPaths
})

// 克隆 git 仓库：表单弹窗 + 右下角进度浮层
const {
  dialogVisible: cloneDialogVisible,
  overlayVisible: cloneOverlayVisible,
  overlayRepo: cloneRepo,
  overlayStage: cloneStage,
  overlayProgress: cloneProgress,
  overlayDone: cloneDone,
  gitMissingVisible: cloneGitMissingVisible,
  openDialog: openCloneDialog,
  cancelDialog: cancelCloneDialog,
  startClone,
  cancelClone,
  openGitDownload,
  dismissGitMissing,
  openClonedProject,
  closeOverlay: closeCloneOverlay
} = useCloneRepo({ toastRef, loadProjects })

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
.local-drop-zone {
  position: relative;
  height: 100%;
}
/* dragging 遮罩：覆盖整个本地项目区域，提示可拖拽添加 */
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-mask));
  /* 让 drop 事件落到外层 drop-zone，避免遮罩自身吞掉子元素冒泡 */
  pointer-events: none;
}
.drop-overlay__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 40px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-lg);
}
.drop-overlay__text {
  font-size: 14px;
  font-weight: 600;
}
.drop-overlay-fade-enter-active,
.drop-overlay-fade-leave-active {
  transition: opacity 0.15s;
}
.drop-overlay-fade-enter-from,
.drop-overlay-fade-leave-to {
  opacity: 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.delete-confirm {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rename-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
.permanent-delete-option {
  display: inline-flex;
  align-items: center;
  align-self: flex-end;
  gap: 8px;
  min-height: 32px;
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}
.permanent-delete-copy {
  font-size: 13px;
}
.delete-help-icon {
  width: 15px;
  height: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-hover);
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.add-scan-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}
.add-scan-empty {
  font-size: 12px;
  color: var(--color-text-tertiary);
  padding: 8px 0;
}
.git-missing-guide {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.git-missing-guide p {
  margin: 0;
}
.forced-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  margin-right: 20px;
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.forced-toggle__label {
  cursor: pointer;
  user-select: none;
}
.forced-toggle__label:hover {
  color: var(--color-text);
}
</style>
