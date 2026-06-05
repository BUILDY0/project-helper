<template>
  <PageLayout ref="layoutRef" @scroll="onBodyScroll">
    <template #header>
      <ProjectsToolbar
        v-model:keyword="keyword"
        :total-count="projects.length"
        :filtered-count="filteredProjects.length"
        :has-filter="!!debouncedKeyword"
        :loading="loading"
        :at-top="atTop"
        @scroll-to-top="scrollToTop"
        @refresh="loadProjects"
      />
    </template>

    <!-- 项目网格 / 空态 / 加载 -->
    <EmptyState v-if="loading && projects.length === 0">正在扫描项目...</EmptyState>
    <EmptyState
      v-else-if="projects.length === 0"
      emoji="📂"
      title="暂无项目"
      tip="请到「配置」页设置扫描路径，然后点击刷新"
    />
    <EmptyState
      v-else-if="debouncedKeyword && filteredProjects.length === 0"
      emoji="🔍"
      title="没有匹配的项目"
      tip="尝试调整搜索关键字或清空搜索"
    />
    <div v-else class="grid">
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

    <!-- 右键菜单 -->
    <BaseContextMenu
      :visible="ctxVisible"
      :x="ctxX"
      :y="ctxY"
      :items="ctxItems"
      :footnote="ctxTarget?.name || ''"
      @close="closeMenu"
      @select="onMenuSelect"
    />

    <!-- 重命名项目 -->
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

    <!-- 删除项目二次确认 -->
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

    <BaseToast ref="toastRef" />
  </PageLayout>
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
import ProjectsToolbar from './components/projects-toolbar.vue'
import EmptyState from './components/empty-state.vue'
import { useIdes } from '@/composables/use-ides.js'
import { useProjects } from './composables/use-projects.js'
import { useProjectSearch } from './composables/use-project-search.js'
import { useScrollToTop } from './composables/use-scroll-to-top.js'
import { useProjectActions } from './composables/use-project-actions.js'
import { useContextMenu } from './composables/use-context-menu.js'
import { useDeleteProject } from './composables/use-delete-project.js'
import { useRenameProject } from './composables/use-rename-project.js'
import { getParentPath } from '@/utils/path.js'

const props = defineProps({
  active: Boolean
})

const toastRef = ref(null)

// 通过 PageLayout 实例拿到滚动容器 DOM；用 computed 延迟取值，规避挂载时序
const layoutRef = ref(null)
const bodyRef = computed(() => layoutRef.value?.bodyRef)

// 可用 IDE 列表来自全局 composable：app 启动时主进程探测一次，渲染层缓存为模块级单例
// excludeIds 从 config 读取，实时过滤右键菜单
const excludeIds = ref([])
const { availableIdes, menuIdes } = useIdes({ excludeIds })

// 切换到项目页 / 挂载时同步最新 exclude 配置
async function syncExcludeIds() {
  try {
    const cfg = await window.api.readConfig()
    excludeIds.value = Array.isArray(cfg.ide_cfg?.exclude) ? cfg.ide_cfg.exclude : []
  } catch {}
}

// 列表加载与刷新
const { projects, loading, loadProjects } = useProjects({ toastRef })

// 搜索 + 防抖 + 过滤
const { keyword, debouncedKeyword, filteredProjects } = useProjectSearch({ projects })

// 滚动容器与"回到顶部"按钮：bodyRef 由 PageLayout 暴露
const { atTop, onBodyScroll, scrollToTop } = useScrollToTop({ bodyRef })

// 卡片快捷动作（双击 / 状态图标 / 置顶）
const { openWithDefaultIde, openGitUrl, openPackageFolder, openReadme, togglePin } =
  useProjectActions({ toastRef, availableIdes, projects })

// 删除二次确认
const {
  confirmVisible,
  pendingProject,
  permanentDelete,
  requestDelete,
  onCancelDelete,
  onConfirmDelete
} = useDeleteProject({ toastRef, projects })

// 重命名：弹窗输入新名称，确认后改名并就地更新列表
const renameInputRef = ref(null)
const { renameVisible, renameValue, requestRename, onCancelRename, onConfirmRename } =
  useRenameProject({ toastRef, projects })

// 弹窗打开后聚焦并选中输入框文本，便于直接覆盖输入
watch(renameVisible, (val) => {
  if (!val) return
  nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
})

// 右键菜单：把分发动作显式注入，避免 composable 之间隐式耦合
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
      requestDelete
    }
  })

// 进入页面或激活 tab 时拉取
onMounted(() => {
  loadProjects()
  syncExcludeIds()
})
watch(
  () => props.active,
  (val) => {
    if (val) {
      loadProjects()
      syncExcludeIds()
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
</style>
