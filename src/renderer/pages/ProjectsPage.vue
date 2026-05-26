<template>
  <section class="page">
    <!-- 顶部工具栏：标题 + 搜索 + 回到顶部 + 刷新 -->
    <div class="page-header">
      <div class="page-title">
        我的项目
        <!-- 用定宽容器包裹 count，避免筛选时数字位数变化导致后面元素位移 -->
        <div class="count-wrap">
          <span class="count">
            <template v-if="debouncedKeyword">{{ filteredProjects.length }} /</template>
            {{ projects.length }}
          </span>
        </div>
        <!-- 搜索框：紧挨项目数，留一点间距 -->
        <div class="search-box">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16">
            <path
              d="M11.7 10.3a5 5 0 1 0-1.4 1.4l3 3 1.4-1.4-3-3zM7 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
              fill="currentColor"
            />
          </svg>
          <input
            v-model="keyword"
            class="search-input"
            type="text"
            placeholder="搜索项目（路径 / 项目名 / 描述）"
          />
          <button v-if="keyword" class="search-clear" title="清空" @click="keyword = ''">×</button>
        </div>
      </div>
      <div class="header-actions">
        <button class="icon-action" title="回到顶部" :disabled="atTop" @click="scrollToTop">
          <svg width="14" height="14" viewBox="0 0 16 16">
            <path d="M8 3l5 5h-3v5H6V8H3l5-5z" fill="currentColor" />
          </svg>
        </button>
        <button class="refresh-btn" :disabled="loading" @click="loadProjects">
          <svg width="14" height="14" viewBox="0 0 16 16" :class="{ spin: loading }">
            <!-- 顺时针刷新：箭头位于右上、开口朝右上，配合 CSS 360deg 顺时针动画 -->
            <path
              d="M8 3a5 5 0 1 0 4.546 2.914l1.378-.638A6.5 6.5 0 1 1 8 1.5V0l3 2.5L8 5V3z"
              fill="currentColor"
            />
          </svg>
          <span>{{ loading ? '扫描中...' : '刷新' }}</span>
        </button>
      </div>
    </div>

    <!-- 项目网格 / 空态 / 加载 -->
    <div ref="bodyRef" class="page-body" @scroll="onBodyScroll">
      <div v-if="loading && projects.length === 0" class="placeholder">正在扫描项目...</div>
      <div v-else-if="projects.length === 0" class="placeholder">
        <div class="ph-emoji">📂</div>
        <div class="ph-title">暂无项目</div>
        <div class="ph-tip">请到「配置」页设置扫描路径，然后点击刷新</div>
      </div>
      <div v-else-if="debouncedKeyword && filteredProjects.length === 0" class="placeholder">
        <div class="ph-emoji">🔍</div>
        <div class="ph-title">没有匹配的项目</div>
        <div class="ph-tip">尝试调整搜索关键字或清空搜索</div>
      </div>
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
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="ctxVisible"
      :x="ctxX"
      :y="ctxY"
      :items="ctxItems"
      :footnote="ctxTarget?.name || ''"
      @close="ctxVisible = false"
      @select="onMenuSelect"
    />

    <!-- 删除项目二次确认 -->
    <ConfirmDialog
      :visible="confirmVisible"
      title="删除项目"
      :message="`确认删除该项目文件夹吗？此操作将从磁盘永久删除：\n${pendingProject?.path || ''}`"
      confirm-text="删除"
      @cancel="confirmVisible = false"
      @confirm="onConfirmDelete"
    />

    <!-- toast -->
    <Toast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import ProjectCard from '@/components/ProjectCard.vue'
import ContextMenu from '@/components/ContextMenu.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import Toast from '@/components/Toast.vue'
import { useIdes } from '@/composables/useIdes'

const props = defineProps({
  active: Boolean
})

const projects = ref([])
const loading = ref(false)
const toastRef = ref(null)

// 滚动容器与回到顶部按钮的可用状态
const bodyRef = ref(null)
const atTop = ref(true)

// 搜索关键字：模糊匹配 项目名 / 项目描述 / 文件夹名，命中任一即保留
const keyword = ref('')
// 经防抖后的关键字，参与实际过滤；输入变化时延迟 200ms 同步
const debouncedKeyword = ref('')
let keywordTimer = null
const SEARCH_DEBOUNCE_MS = 200

watch(keyword, (val) => {
  if (keywordTimer) clearTimeout(keywordTimer)
  // 清空时立即生效，体验更顺滑
  if (!val) {
    debouncedKeyword.value = ''
    return
  }
  keywordTimer = setTimeout(() => {
    debouncedKeyword.value = val
  }, SEARCH_DEBOUNCE_MS)
})

/** 过滤后的项目列表（基于防抖后的关键字） */
const filteredProjects = computed(() => {
  const kw = debouncedKeyword.value.trim().toLowerCase()
  if (!kw) return projects.value
  return projects.value.filter((p) => {
    const name = (p.name || '').toLowerCase()
    const desc = (p.description || '').toLowerCase()
    const fullPath = (p.path || '').toLowerCase()
    return name.includes(kw) || desc.includes(kw) || fullPath.includes(kw)
  })
})

/** 平滑滚动到顶部 */
function scrollToTop() {
  bodyRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

/** 滚动监听：更新 atTop 用于禁用按钮 */
function onBodyScroll() {
  atTop.value = (bodyRef.value?.scrollTop || 0) <= 0
}

// 右键菜单状态
const ctxVisible = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const ctxItems = ref([])
const ctxTarget = ref(null)

// 删除确认状态
const confirmVisible = ref(false)
const pendingProject = ref(null)

// 最短 loading 展示时间（毫秒），避免动作过快出现"跳变"
const MIN_LOADING_MS = 1000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 拉取项目列表 */
async function loadProjects() {
  if (loading.value) return
  loading.value = true
  // 与扫描动作并行计时，确保 loading 至少持续 MIN_LOADING_MS
  const start = Date.now()
  try {
    const list = await window.api.scanProjects()
    projects.value = list || []
  } catch (err) {
    toastRef.value?.show(`扫描失败：${err.message}`, 'error')
  } finally {
    const remain = MIN_LOADING_MS - (Date.now() - start)
    if (remain > 0) await sleep(remain)
    loading.value = false
  }
}

// 可用 IDE 列表来自全局 composable：app 启动时主进程探测一次，渲染层缓存为模块级单例
// 这里只读，不做任何探测；用户切换页面 / 频繁打开右键菜单都不会再次触发 exec
const { availableIdes } = useIdes()

/** 双击：用首个可用 IDE 打开（VS Code 优先，其次 CodeBuddy ...） */
async function openWithDefaultIde(project) {
  const first = availableIdes.value[0]
  if (!first) {
    toastRef.value?.show('未检测到可用 IDE，请先安装并将 CLI 加入 PATH', 'error')
    return
  }
  const r = await window.api.openInIde(first.id, project.path)
  if (!r?.ok) {
    toastRef.value?.show(
      `无法启动 ${first.label.replace(' 打开', '')}：${r?.message || '未知错误'}`,
      'error'
    )
  }
}

/** 状态图标：GitHub 图标点击，外部浏览器打开仓库地址 */
async function openGitUrl(project) {
  if (!project?.gitUrl) return
  const r = await window.api.openExternal(project.gitUrl)
  if (!r?.ok) {
    toastRef.value?.show(`打开仓库失败：${r?.message || '未知错误'}`, 'error')
  }
}

/** 状态图标：Node.js 图标点击，打开项目文件夹 */
async function openPackageFolder(project) {
  if (!project?.path) return
  const r = await window.api.openFolder(project.path)
  if (!r?.ok) {
    toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
  }
}

/** 状态图标：Markdown 图标点击，用系统默认应用打开 readme.md */
async function openReadme(project) {
  if (!project?.readmePath) return
  const r = await window.api.openFolder(project.readmePath)
  if (!r?.ok) {
    toastRef.value?.show(`打开 README 失败：${r?.message || '未知错误'}`, 'error')
  }
}

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
  items.push({ label: '复制项目路径', action: 'copy-path' })
  items.push({ label: '查看项目属性', action: 'show-properties' })
  items.push({ divider: true })
  items.push({ label: project.pinned ? '取消置顶' : '置顶', action: 'toggle-pin' })
  items.push({ divider: true })
  items.push({ label: '删除项目', action: 'delete', danger: true })

  ctxItems.value = items
  ctxVisible.value = true
}

/** 菜单项点击 */
async function onMenuSelect(item) {
  const p = ctxTarget.value
  if (!p) return
  // IDE 打开：action 形如 `open-ide:vscode`
  if (typeof item.action === 'string' && item.action.startsWith('open-ide:')) {
    const id = item.action.slice('open-ide:'.length)
    const r = await window.api.openInIde(id, p.path)
    if (!r?.ok) {
      toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
    }
    return
  }
  if (item.action === 'open-folder') {
    const r = await window.api.openFolder(p.path)
    if (!r?.ok) {
      toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
    }
  } else if (item.action === 'copy-path') {
    const r = await window.api.copyText(p.path)
    if (r?.ok) {
      toastRef.value?.show('已复制项目路径', 'success', 1200)
    } else {
      toastRef.value?.show(`复制失败：${r?.message || '未知错误'}`, 'error')
    }
  } else if (item.action === 'show-properties') {
    const r = await window.api.showProperties(p.path)
    if (!r?.ok) {
      toastRef.value?.show(`查看属性失败：${r?.message || '未知错误'}`, 'error')
    }
  } else if (item.action === 'toggle-pin') {
    await togglePin(p)
  } else if (item.action === 'delete') {
    pendingProject.value = p
    confirmVisible.value = true
  }
}

/**
 * 切换 pin 状态：调用主进程持久化，结果回写后重排序
 * 同步处理「pin 路径已失效」由主进程统一过滤
 */
async function togglePin(project) {
  if (!project) return
  try {
    const pinned = await window.api.togglePin(project.path)
    const pinnedSet = new Set((pinned || []).map((p) => p))
    // 回写每张卡片的 pinned 字段并重排序：pinned 优先 + 名称
    for (const item of projects.value) {
      item.pinned = pinnedSet.has(item.path)
    }
    projects.value.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    toastRef.value?.show(project.pinned ? '已置顶' : '已取消置顶', 'success', 1200)
  } catch (err) {
    toastRef.value?.show(`操作失败：${err.message}`, 'error')
  }
}

/** 删除二次确认通过 */
async function onConfirmDelete() {
  const p = pendingProject.value
  confirmVisible.value = false
  if (!p) return
  const r = await window.api.deleteFolder(p.path)
  if (r?.ok) {
    toastRef.value?.show('已删除项目文件夹', 'success')
    // 从列表中移除并刷新
    projects.value = projects.value.filter((x) => x.path !== p.path)
  } else {
    toastRef.value?.show(`删除失败：${r?.message || '未知错误'}`, 'error')
  }
  pendingProject.value = null
}

// 进入页面或激活 tab 时拉取
onMounted(() => {
  loadProjects()
})
watch(
  () => props.active,
  (val) => {
    if (val) loadProjects()
  }
)
</script>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px 22px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-shrink: 0;
  gap: 12px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 搜索框：放在标题与右侧操作之间，自动撑满剩余空间 */
/* 搜索框：紧跟项目数右侧，与标题留 8px 间距，固定宽度避免抢占其它操作空间 */
.search-box {
  margin-left: 8px;
  width: 260px;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.search-box:focus-within {
  border-color: var(--color-primary);
}
.search-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-text);
  user-select: text;
}
.search-input::placeholder {
  color: var(--color-text-tertiary);
}
.search-clear {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 14px;
  line-height: 1;
  border-radius: 50%;
  /* 用 flex 居中字符，避免基线偏移 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.search-clear:hover {
  background: var(--color-hover);
  color: var(--color-text);
}
/* 包裹 count 的固定宽度容器，避免筛选时数字位数变化引起后续元素位移 */
.count-wrap {
  width: 72px;
  display: inline-flex;
  align-items: center;
  /* 左对齐，紧跟 "我的项目" 四个字之后 */
  justify-content: flex-start;
}
.count {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-hover);
  padding: 2px 8px;
  border-radius: 999px;
  /* count 自身保持紧凑，由 .count-wrap 占位 */
  white-space: nowrap;
}
.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  /* 始终保持在右侧，不被左侧标题/搜索/未来新增元素挤动 */
  margin-left: auto;
  flex-shrink: 0;
}
.icon-action {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  transition:
    background 0.15s,
    color 0.15s,
    opacity 0.15s;
}
.icon-action:hover:not(:disabled) {
  background: var(--color-hover);
}
.icon-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  transition: background 0.15s;
}
.refresh-btn:hover:not(:disabled) {
  background: var(--color-hover);
}
.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.page-body {
  flex: 1;
  overflow-y: auto;
  /* 顶部留白：卡片 hover 时 transform: translateY(-1px) 上抬，并伴随阴影外溢，
     若顶部紧贴容器边缘会被 overflow 裁切；这里给一点缓冲空间避免溢出截断 */
  padding-top: 4px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  gap: 8px;
}
.ph-emoji {
  font-size: 40px;
}
.ph-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}
.ph-tip {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
