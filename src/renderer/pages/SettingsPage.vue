<template>
  <section class="page">
    <div class="page-header">
      <div class="page-title">
        配置
        <span v-if="appVersion" class="version">v{{ appVersion }}</span>
      </div>
      <button class="primary-btn" :disabled="saving" @click="onSave">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>

    <div class="page-body">
      <!-- 配置文件路径：只读 input + 两个操作按钮 -->
      <div class="field">
        <div class="label">配置文件路径</div>
        <div class="row">
          <input class="input" :value="config.config_path" readonly />
          <button class="btn" @click="onOpenConfigFile">打开文件</button>
          <button class="btn" @click="onOpenConfigFolder">打开文件夹</button>
        </div>
        <div class="hint">
          <span>最后修改：{{ formatTime(config.mtime) }}</span>
        </div>
      </div>

      <!-- 扫描目录 -->
      <div class="field">
        <div class="label">
          <span>扫描目录</span>
          <div class="label-actions">
            <button class="link-btn" :disabled="!config.paths.length" @click="askClearPaths">
              清空
            </button>
            <button class="link-btn" @click="addPath">+ 新增</button>
          </div>
        </div>
        <ul v-if="config.paths.length" class="list">
          <li v-for="(p, i) in config.paths" :key="`path-${i}`" class="list-item">
            <span class="path-text" v-tooltip.overflow="getPathText(p)">{{ getPathText(p) }}</span>
            <button class="icon-btn" v-tooltip="'移除'" @click="removePath(i)">×</button>
          </li>
        </ul>
        <div v-else class="empty-tip">暂未配置扫描目录</div>
      </div>

      <!-- 扫描深度 -->
      <div class="field">
        <div class="label">
          <span>扫描深度</span>
          <button class="link-btn" :disabled="config.depth === DEFAULT_DEPTH" @click="resetDepth">
            重置
          </button>
        </div>
        <div class="row">
          <NumberInput v-model="config.depth" :min="0" :max="5" />
          <span class="hint inline">默认 1，范围 0 - 5</span>
        </div>
      </div>

      <!-- 排除文件夹 -->
      <div class="field">
        <div class="label">
          <span>排除文件夹</span>
          <div class="label-actions">
            <button
              class="link-btn"
              :disabled="!config.exclude_paths.length"
              @click="askClearExcludes"
            >
              清空
            </button>
            <button class="link-btn" @click="addExclude">+ 新增</button>
          </div>
        </div>
        <ul v-if="config.exclude_paths.length" class="list">
          <li v-for="(p, i) in config.exclude_paths" :key="`ex-${i}`" class="list-item">
            <span class="path-text" v-tooltip.overflow="p">{{ p }}</span>
            <button class="icon-btn" v-tooltip="'移除'" @click="removeExclude(i)">×</button>
          </li>
        </ul>
        <div v-else class="empty-tip">暂未配置排除项</div>
      </div>

      <!-- 置顶项目（pin） -->
      <div class="field">
        <div class="label">
          <span>置顶项目</span>
          <div class="label-actions">
            <button class="link-btn" :disabled="!config.pinned.length" @click="askClearPinned">
              清空
            </button>
          </div>
        </div>
        <ul v-if="config.pinned.length" class="list">
          <li v-for="(p, i) in config.pinned" :key="`pin-${i}`" class="list-item">
            <span class="pin-icon">★</span>
            <span class="path-text" v-tooltip.overflow="p">{{ p }}</span>
            <button class="icon-btn" v-tooltip="'移除'" @click="removePinned(i)">×</button>
          </li>
        </ul>
        <div v-else class="empty-tip">暂未置顶任何项目</div>
      </div>

      <!-- 帮助 -->
      <div class="field">
        <div class="label">帮助</div>
        <div class="help-list">
          <HelpCircleLink
            v-for="item in helpItems"
            :key="item.label"
            :label="item.label"
            :url="item.url"
            :icon="item.icon"
            @error="onHelpOpenError"
          />
        </div>
      </div>
    </div>

    <!-- 二次确认弹窗：清空共用 -->
    <ConfirmDialog
      :visible="confirmDlg.visible"
      :title="confirmDlg.title"
      :message="confirmDlg.message"
      :confirm-text="confirmDlg.confirmText"
      @cancel="confirmDlg.visible = false"
      @confirm="onConfirmAction"
    />

    <Toast ref="toastRef" />
  </section>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import NumberInput from '@/components/NumberInput.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import Toast from '@/components/Toast.vue'
import HelpCircleLink from '@/components/HelpCircleLink.vue'
// 路径类型与 SystemPath 构造统一来自 src/shared，避免与主进程重复声明
import { SystemPath } from '@shared/path-types.js'

const props = defineProps({
  active: Boolean
})

// 应用版本号（来自主进程 app.getVersion()），仅作标题旁的展示用
const appVersion = ref('')

const config = ref({
  config_path: '',
  paths: [],
  depth: 1,
  exclude_paths: [],
  // 置顶项目路径列表
  pinned: [],
  // 配置文件最后修改时间（ms 时间戳），0 表示未知
  mtime: 0
})
const saving = ref(false)
const toastRef = ref(null)

const helpItems = [
  {
    label: '文档',
    icon: 'docs',
    url: 'https://buildy0.github.io/project-helper/'
  },
  {
    label: 'GitHub',
    icon: 'github',
    url: 'https://github.com/BUILDY0/project-helper'
  }
]

function getPathText(item) {
  if (typeof item === 'string') return item
  return typeof item?.path === 'string' ? item.path : ''
}

function getPathKey(item) {
  return getPathText(item).trim().toLowerCase()
}

// 加载/保存成功时记录基线，用于判断是否存在未保存的修改
let originalSnapshot = ''

/** 仅取会持久化的字段做稳定序列化，避免字段顺序差异 */
function snapshot(c) {
  return JSON.stringify({
    paths: [...(c.paths || [])],
    depth: Number(c.depth) || 0,
    exclude_paths: [...(c.exclude_paths || [])],
    pinned: [...(c.pinned || [])]
  })
}

/** 是否有未保存的修改：与基线快照对比 */
function hasChanges() {
  return snapshot(config.value) !== originalSnapshot
}

/**
 * 将时间戳格式化为 YYYY-MM-DD HH:mm:ss
 * @param {number} ms 毫秒时间戳
 */
function formatTime(ms) {
  if (!ms) return '-'
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 加载配置 */
async function loadConfig() {
  const cfg = await window.api.readConfig()
  config.value = {
    config_path: cfg.config_path || '',
    paths: Array.isArray(cfg.paths) ? cfg.paths : [],
    depth: typeof cfg.depth === 'number' ? cfg.depth : 1,
    exclude_paths: Array.isArray(cfg.exclude_paths) ? cfg.exclude_paths : [],
    pinned: Array.isArray(cfg.pinned) ? cfg.pinned : [],
    mtime: typeof cfg.mtime === 'number' ? cfg.mtime : 0
  }
  // 更新基线快照
  originalSnapshot = snapshot(config.value)
}

/** 新增扫描目录 */
async function addPath() {
  const dir = await window.api.selectDirectory()
  if (!dir) return
  const key = getPathKey(dir)
  if (config.value.paths.some((item) => getPathKey(item) === key)) {
    toastRef.value?.show('该目录已存在', 'info')
    return
  }
  config.value.paths.push(new SystemPath({ path: dir }))
}
function removePath(i) {
  config.value.paths.splice(i, 1)
}

/** 新增排除目录 */
async function addExclude() {
  const dir = await window.api.selectDirectory()
  if (!dir) return
  if (config.value.exclude_paths.includes(dir)) {
    toastRef.value?.show('该目录已存在', 'info')
    return
  }
  config.value.exclude_paths.push(dir)
}
function removeExclude(i) {
  config.value.exclude_paths.splice(i, 1)
}

/** 移除单个 pinned 项 */
function removePinned(i) {
  config.value.pinned.splice(i, 1)
}

// ===== 清空二次确认 / 重置 =====
const DEFAULT_DEPTH = 1

// 共用一个确认弹窗，按 action 区分要执行的操作
// 注意：变量名避免使用 confirm（与全局函数同名，模板中无法访问）
const confirmDlg = reactive({
  visible: false,
  title: '',
  message: '',
  confirmText: '确认',
  action: null
})

/** 打开确认弹窗 */
function openConfirm({ title, message, confirmText, action }) {
  confirmDlg.title = title
  confirmDlg.message = message
  confirmDlg.confirmText = confirmText || '确认'
  confirmDlg.action = action
  confirmDlg.visible = true
}

function askClearPaths() {
  if (!config.value.paths.length) return
  openConfirm({
    title: '清空扫描目录',
    message: `确认清空全部 ${config.value.paths.length} 个扫描目录？此操作仅在点击保存后生效。`,
    confirmText: '清空',
    action: 'clear-paths'
  })
}

function askClearExcludes() {
  if (!config.value.exclude_paths.length) return
  openConfirm({
    title: '清空排除文件夹',
    message: `确认清空全部 ${config.value.exclude_paths.length} 个排除项？此操作仅在点击保存后生效。`,
    confirmText: '清空',
    action: 'clear-excludes'
  })
}

function askClearPinned() {
  if (!config.value.pinned.length) return
  openConfirm({
    title: '清空置顶项目',
    message: `确认清空全部 ${config.value.pinned.length} 个置顶项？此操作仅在点击保存后生效。`,
    confirmText: '清空',
    action: 'clear-pinned'
  })
}

function resetDepth() {
  if (config.value.depth === DEFAULT_DEPTH) return
  config.value.depth = DEFAULT_DEPTH
  toastRef.value?.show('扫描深度已重置', 'success')
}

/** 弹窗确认后的实际执行 */
function onConfirmAction() {
  switch (confirmDlg.action) {
    case 'clear-paths':
      config.value.paths = []
      toastRef.value?.show('已清空扫描目录', 'success')
      break
    case 'clear-excludes':
      config.value.exclude_paths = []
      toastRef.value?.show('已清空排除项', 'success')
      break
    case 'clear-pinned':
      config.value.pinned = []
      toastRef.value?.show('已清空置顶项目', 'success')
      break
  }
  confirmDlg.visible = false
  confirmDlg.action = null
}

/** 打开配置文件（默认编辑器） */
async function onOpenConfigFile() {
  const p = config.value.config_path
  if (!p) {
    toastRef.value?.show('配置文件路径为空', 'error')
    return
  }
  const r = await window.api.openFolder(p)
  if (!r?.ok) {
    toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
  }
}
/** 在文件管理器中显示配置文件 */
async function onOpenConfigFolder() {
  const p = config.value.config_path
  if (!p) {
    toastRef.value?.show('配置文件路径为空', 'error')
    return
  }
  const r = await window.api.showInFolder(p)
  if (!r?.ok) {
    toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
  }
}

function onHelpOpenError(message) {
  toastRef.value?.show(`打开链接失败：${message}`, 'error')
}

// 最短 loading 展示时间（毫秒），避免保存过快导致 UI 闪一下
const MIN_LOADING_MS = 1000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 保存配置 */
async function onSave() {
  saving.value = true
  const start = Date.now()
  try {
    // 通过 JSON 序列化剥离 Vue 的 Proxy，避免 IPC structured clone 失败
    const payload = JSON.parse(
      JSON.stringify({
        paths: config.value.paths,
        depth: Number(config.value.depth) || 0,
        exclude_paths: config.value.exclude_paths,
        pinned: config.value.pinned,
        theme: config.value.theme
      })
    )
    await window.api.saveConfig(payload)
    // 落盘成功后重新拉取以刷新最后修改时间
    await loadConfig()
    toastRef.value?.show('配置已保存', 'success')
  } catch (err) {
    toastRef.value?.show(`保存失败：${err.message}`, 'error')
  } finally {
    const remain = MIN_LOADING_MS - (Date.now() - start)
    if (remain > 0) await sleep(remain)
    saving.value = false
  }
}

onMounted(() => {
  loadConfig()
  // 应用版本号：从主进程读取一次，用于在标题旁展示
  window.api
    .getAppVersion?.()
    .then((v) => {
      appVersion.value = v || ''
    })
    .catch(() => {})
})
// 切回该 tab 时同步最新值；若存在未保存修改则保留当前编辑状态，避免覆盖
watch(
  () => props.active,
  (val) => {
    if (val && !hasChanges()) loadConfig()
  }
)

// 暴露给父组件（App.vue）：判断未保存、执行保存、放弃修改
defineExpose({
  hasChanges,
  save: onSave,
  /** 放弃未保存的修改，重新从磁盘加载 */
  discard: loadConfig
})
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
}
.page-title {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.page-title .version {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-tertiary);
}
.primary-btn {
  height: 32px;
  padding: 0 18px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  font-size: 13px;
  transition: background 0.15s;
}
.primary-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
}
.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.field {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
}
.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}
.hint.inline {
  margin-top: 0;
  margin-left: 4px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.input {
  flex: 1;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface-2);
  color: var(--color-text);
  font-size: 13px;
  outline: none;
  user-select: text;
}

.btn {
  height: 32px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  transition: background 0.15s;
}
.btn:hover {
  background: var(--color-hover);
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition:
    color 0.15s,
    background 0.15s;
}
.link-btn:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-hover);
}
.link-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.label-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.list-item {
  display: flex;
  align-items: center;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  font-size: 13px;
}
.pin-icon {
  color: var(--color-accent);
  margin-right: 6px;
  font-size: 13px;
  line-height: 1;
}
.path-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text);
  user-select: text;
}
.icon-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
  font-size: 16px;
  line-height: 1;
  transition:
    background 0.15s,
    color 0.15s;
}
.icon-btn:hover {
  background: var(--color-hover);
  color: var(--color-danger);
}

.empty-tip {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.help-list {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 4px 0 2px;
}
</style>
