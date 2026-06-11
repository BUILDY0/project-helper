<template>
  <PageLayout>
    <template #header>
      <div class="settings-header">
        <div class="page-title">
          配置
          <span v-if="appVersion" class="version">v{{ appVersion }}</span>

          <!-- 关闭时隐藏到托盘 -->
          <InlineToggle v-model="config.tray" label="关闭时隐藏到托盘" :tip="TRAY_TIP" />

          <!-- 开机自动运行 -->
          <InlineToggle
            v-model="config.auto_run_startup"
            label="开机自动运行"
            :tip="AUTO_RUN_TIP"
          />

          <!-- 自动检查更新（附带"立即检查"按钮） -->
          <InlineToggle
            v-model="config.auto_check_update"
            label="自动检查更新"
            :tip="AUTO_CHECK_UPDATE_TIP"
          >
            <template #action>
              <UpdateCheckButton
                :current-version="appVersion"
                @result="onUpdateCheckResult"
                @error="onUpdateCheckError"
              />
            </template>
          </InlineToggle>
        </div>
        <BaseButton variant="primary" :loading="saving" @click="onSave">
          {{ saving ? '保存中...' : '保存' }}
        </BaseButton>
      </div>
    </template>

    <div class="settings-fields">
      <!-- 通用 -->
      <SettingFieldGroup title="通用">
        <SettingFieldSection label="配置文件路径">
          <div class="row">
            <BaseInput class="config-path" :model-value="config.config_path" readonly />
            <BaseButton @click="onOpenConfigFile">打开文件</BaseButton>
            <BaseButton @click="onOpenConfigFolder">打开文件夹</BaseButton>
          </div>
          <div class="hint">
            <span>最后修改：{{ formatTime(config.mtime) }}</span>
          </div>
        </SettingFieldSection>

        <SettingFieldSection label="安装包缓存路径">
          <div class="row">
            <div class="wrap">
              <BaseInput class="config-path" :model-value="config.installer_path" readonly />
              <span class="installer-toggle" v-tooltip="AUTO_CLEAR_INSTALLER_TIP">
                <BaseSwitch v-model="config.auto_clear_installer" size="sm" aria-label="自动清理" />
                <span
                  class="installer-toggle__label"
                  @click="config.auto_clear_installer = !config.auto_clear_installer"
                >
                  自动清理
                </span>
              </span>
            </div>
            <BaseButton @click="onOpenInstallerFolder">打开文件夹</BaseButton>
          </div>
        </SettingFieldSection>
      </SettingFieldGroup>

      <!-- IDE 配置（默认IDE / 排除IDE / 自定义脚本） -->
      <IdeConfigCard
        :detected-ides="detectedIdes"
        :model-default="config.ide_cfg.default"
        :model-exclude="config.ide_cfg.exclude"
        :model-extends="config.ide_cfg.extends"
        @update:model-default="(v) => (config.ide_cfg.default = v)"
        @update:model-exclude="(v) => (config.ide_cfg.exclude = v)"
        @update:model-extends="(v) => (config.ide_cfg.extends = v)"
        @request-save-default="onSaveIdeCfg"
        @add-extend="openIdeDialog(null)"
        @edit-extend="(i) => openIdeDialog(i)"
        @remove-extend="removeExtend"
        @move-up="(i) => doMoveExtend(i, -1)"
        @move-down="(i) => doMoveExtend(i, 1)"
        @clear-extends="config.ide_cfg.extends = []"
      />

      <!-- 本地项目 -->
      <SettingFieldGroup title="本地项目">
        <SettingFieldSection label="扫描目录">
          <template #actions>
            <BaseButton
              variant="text"
              inline
              :disabled="!config.paths.length"
              @click="askClearPaths"
            >
              清空
            </BaseButton>
            <BaseButton variant="text" inline @click="addPath">+ 新增</BaseButton>
          </template>
          <div v-if="config.paths.length" class="list">
            <PathListItem
              v-for="(p, i) in config.paths"
              :key="`path-${i}`"
              :path="getPathText(p)"
              remove-message="确认移除该扫描目录？"
              @remove="removePath(i)"
            >
              <template #middle>
                <span class="forced-toggle" v-tooltip="FORCED_TIP">
                  <BaseSwitch
                    :model-value="isForced(p)"
                    size="sm"
                    aria-label="强制命中"
                    @update:model-value="(v) => setForced(i, v)"
                  />
                  <span class="forced-toggle__label" @click="toggleForced(i)">强制命中</span>
                </span>
              </template>
            </PathListItem>
          </div>
          <div v-else class="empty-tip">暂未配置扫描目录</div>
        </SettingFieldSection>

        <SettingFieldSection label="扫描深度">
          <template #actions>
            <BaseButton
              variant="text"
              inline
              :disabled="config.depth === DEFAULT_DEPTH"
              @click="resetDepth"
            >
              重置
            </BaseButton>
          </template>
          <div class="row">
            <BaseNumberInput v-model="config.depth" :min="0" :max="5" />
            <span class="hint inline">默认 1，范围 0 - 5</span>
          </div>
        </SettingFieldSection>

        <SettingFieldSection label="排除文件夹">
          <template #actions>
            <BaseButton
              variant="text"
              inline
              :disabled="!config.exclude_paths.length"
              @click="askClearExcludes"
            >
              清空
            </BaseButton>
            <BaseButton variant="text" inline @click="addExclude">+ 新增</BaseButton>
          </template>
          <div v-if="config.exclude_paths.length" class="list">
            <PathListItem
              v-for="(p, i) in config.exclude_paths"
              :key="`ex-${i}`"
              :path="p"
              remove-message="确认移除该排除项？"
              @remove="removeExclude(i)"
            />
          </div>
          <div v-else class="empty-tip">暂未配置排除项</div>
        </SettingFieldSection>

        <SettingFieldSection label="置顶项目">
          <template #actions>
            <BaseButton
              variant="text"
              inline
              :disabled="!config.pinned.length"
              @click="askClearPinned"
            >
              清空
            </BaseButton>
          </template>
          <div v-if="config.pinned.length" class="list">
            <PathListItem
              v-for="(p, i) in config.pinned"
              :key="`pin-${i}`"
              :path="p"
              remove-message="确认移除该置顶项目？"
              @remove="removePinned(i)"
            >
              <template #prefix><IconPin :size="14" filled class="pin-icon" /></template>
            </PathListItem>
          </div>
          <div v-else class="empty-tip">暂未置顶任何项目</div>
        </SettingFieldSection>
      </SettingFieldGroup>

      <!-- 远程连接项目 -->
      <SettingFieldGroup title="远程连接项目">
        <SettingFieldSection label="项目列表">
          <template #actions>
            <BaseButton
              variant="text"
              inline
              :disabled="!remotePathCount"
              @click="askClearRemotePaths"
            >
              清空
            </BaseButton>
            <BaseButton variant="text" inline @click="openRemoteAddDialog">+ 新增</BaseButton>
          </template>
          <div v-if="remotePathCount" class="list">
            <PathListItem
              v-for="(p, i) in config.remote.paths"
              :key="`rp-${i}`"
              :path="remotePathDisplay(p)"
              remove-message="确认移除该远程项目？"
              @remove="removeRemotePath(i)"
            />
          </div>
          <div v-else class="empty-tip">暂未配置远程项目</div>
        </SettingFieldSection>

        <SettingFieldSection label="置顶项目">
          <template #actions>
            <BaseButton
              variant="text"
              inline
              :disabled="!remotePinnedCount"
              @click="askClearRemotePinned"
            >
              清空
            </BaseButton>
          </template>
          <div v-if="remotePinnedCount" class="list">
            <PathListItem
              v-for="(p, i) in config.remote.pinned"
              :key="`rpin-${i}`"
              :path="p"
              remove-message="确认移除该置顶项目？"
              @remove="removeRemotePinned(i)"
            >
              <template #prefix><IconPin :size="14" filled class="pin-icon" /></template>
            </PathListItem>
          </div>
          <div v-else class="empty-tip">暂未置顶任何远程项目</div>
        </SettingFieldSection>
      </SettingFieldGroup>

      <!-- 帮助 -->
      <SettingField label="帮助">
        <div class="help-list">
          <HelpCircleLink
            v-for="item in HELP_ITEMS"
            :key="item.label"
            :label="item.label"
            :url="item.url"
            :icon="item.icon"
            @action="onHelpAction(item)"
            @error="onHelpOpenError"
          />
        </div>
      </SettingField>
    </div>

    <!-- 二次确认弹窗：清空共用 -->
    <BaseConfirmDialog
      :visible="confirmDlg.visible"
      :title="confirmDlg.title"
      :message="confirmDlg.message"
      :confirm-text="confirmDlg.confirmText"
      @cancel="confirmDlg.visible = false"
      @confirm="onConfirmAction"
    />

    <IdeScriptDialog
      :visible="ideDialogVisible"
      :initial-data="ideDialogData"
      :existing-ids="ideExistingIds"
      :config-dir="configDir"
      @close="ideDialogVisible = false"
      @confirm="onIdeDialogConfirm"
      @validate-error="(msg) => toastRef?.show(msg, 'error')"
      @probe-result="
        (ok) =>
          toastRef?.show(
            ok ? '检测成功，入口可用' : '检测失败，未找到该入口',
            ok ? 'success' : 'error'
          )
      "
      @debug-result="
        (ok, msg) =>
          toastRef?.show(
            ok ? '调试成功，脚本已执行' : `调试失败：${msg || '未知错误'}`,
            ok ? 'success' : 'error'
          )
      "
    />

    <BaseToast ref="toastRef" />

    <AboutDialog
      :visible="aboutVisible"
      @close="aboutVisible = false"
      @copy-success="toastRef?.show('已复制到剪贴板', 'success')"
      @copy-error="(msg) => toastRef?.show(`复制失败：${msg}`, 'error')"
    />

    <AddRemoteDialog
      :visible="remoteAddVisible"
      @close="remoteAddVisible = false"
      @confirm="onRemoteAddConfirm"
      @validate-error="(msg) => toastRef?.show(msg, 'error')"
      @debug-result="
        (ok, msg) =>
          toastRef?.show(
            ok ? '调试成功' : `调试失败：${msg || '未知错误'}`,
            ok ? 'success' : 'error'
          )
      "
    />
  </PageLayout>
</template>

<script setup>
import { ref, watch, onMounted, computed, unref, toRaw } from 'vue'
import PageLayout from '@/components/common/page-layout.vue'
import BaseInput from '@/components/common/base-input.vue'
import BaseButton from '@/components/common/base-button.vue'
import BaseNumberInput from '@/components/common/base-number-input.vue'
import BaseConfirmDialog from '@/components/common/base-confirm-dialog.vue'
import BaseToast from '@/components/common/base-toast.vue'
import HelpCircleLink from '@/components/common/help-circle-link.vue'
import BaseSwitch from '@/components/common/base-switch.vue'
import InlineToggle from '@/components/common/inline-toggle.vue'
import UpdateCheckButton from './components/update-check-button.vue'
import SettingField from './components/setting-field.vue'
import SettingFieldGroup from './components/setting-field-group.vue'
import SettingFieldSection from './components/setting-field-section.vue'
import PathListItem from './components/path-list-item.vue'
import AboutDialog from './components/about-dialog.vue'
import IdeConfigCard from './components/ide-config-card.vue'
import IdeScriptDialog from './components/ide-script-dialog.vue'
import { useConfig } from './composables/use-config.js'
import { useScanPaths, DEFAULT_DEPTH } from './composables/use-scan-paths.js'
import { useExcludePaths } from './composables/use-exclude-paths.js'
import { usePinnedPaths } from './composables/use-pinned-paths.js'
import { useConfirmDialog } from './composables/use-confirm-dialog.js'
import { useUpdateCheck } from './composables/use-update-check.js'
import { useAppVersion } from './composables/use-app-version.js'
import { useIdes } from '@/composables/use-ides.js'
import { useRemotePaths } from './composables/use-remote-paths.js'
import { getPathText } from './utils/path-helper.js'
import { formatTime } from '@/utils/format-time.js'
import { normalizeJSONObject } from '@shared/data.js'
import AddRemoteDialog from '@/pages/projects/remote/components/add-remote-dialog.vue'
import IconPin from '@/components/icons/icon-pin.vue'

// ===== 页面级 UI 文案常量（仅本页使用，直接内联） =====
const TRAY_TIP =
  '开启后，点击关闭按钮会将应用最小化到系统托盘；关闭则点击关闭按钮直接退出。修改后需点击"保存"才会生效。'
const AUTO_RUN_TIP = '开启后，开机时会自动启动 ProjectHelper。修改后需点击"保存"才会生效。'
const AUTO_CHECK_UPDATE_TIP =
  '开启后，应用启动 5 秒后会检查一次新版本，运行期间每隔 1 小时再检查一次。修改后需点击"保存"才会生效。'
const FORCED_TIP = '开启后，扫描时强制命中当前目录。修改后需点击"保存"才会生效。'
const AUTO_CLEAR_INSTALLER_TIP =
  '每次启动后在系统空闲时检测并清理安装包，非必要请勿开启此项，避免升级过程发生意外。修改后需点击"保存"才会生效。'

const HELP_ITEMS = [
  {
    label: '文档',
    icon: 'docs',
    url: 'https://buildy0.github.io/project-helper/'
  },
  {
    label: 'GitHub',
    icon: 'github',
    url: 'https://github.com/BUILDY0/project-helper'
  },
  {
    label: '关于',
    icon: 'info',
    url: ''
  }
]

const props = defineProps({
  active: Boolean
})

const toastRef = ref(null)
const aboutVisible = ref(false)

// 应用版本号
const { appVersion } = useAppVersion()

// 配置加载 / 保存 / 未保存检测
const { config, configLoaded, saving, loadConfig, onSave, hasChanges, discard } = useConfig({
  toastRef
})

/** 批量新增后的提示文案：扫描目录 / 排除目录共用 */
function notifyBatchAdd(added, skipped) {
  if (added && skipped) {
    toastRef.value?.show(`已新增 ${added} 个，${skipped} 个已存在已跳过`, 'success')
  } else if (added) {
    toastRef.value?.show(`已新增 ${added} 个`, 'success')
  } else if (skipped) {
    toastRef.value?.show('所选目录均已存在', 'info')
  }
}

// 扫描目录 / 排除目录 / 置顶
const {
  addPath,
  removePath,
  isForced,
  setForced,
  toggleForced,
  clearAll: clearScanPaths
} = useScanPaths({ config, notifyBatchAdd })
const {
  addExclude,
  removeExclude,
  clearAll: clearExcludePaths
} = useExcludePaths({
  config,
  notifyBatchAdd
})
const { removePinned, clearAll: clearPinnedPaths } = usePinnedPaths({ config })

// 远程项目配置
const {
  removePath: removeRemotePath,
  clearAll: clearRemotePaths,
  removePinned: removeRemotePinned,
  clearPinned: clearRemotePinnedPaths,
  addRemotePath,
  remotePathDisplay
} = useRemotePaths({ config, toastRef })

const remotePathCount = computed(() => config.value.remote?.paths?.length || 0)
const remotePinnedCount = computed(() => config.value.remote?.pinned?.length || 0)

// 远程项目新增弹窗（配置页版本，不需要实时刷新列表，只更新持久化值）
const remoteAddVisible = ref(false)
function openRemoteAddDialog() {
  remoteAddVisible.value = true
}
function onRemoteAddConfirm(data) {
  addRemotePath(data)
  remoteAddVisible.value = false
  toastRef.value?.show('已添加远程项目', 'success')
}

// 通用清空二次确认弹窗：注册各 action 对应的实际操作
const {
  state: confirmDlg,
  ask: openConfirm,
  onConfirm: onConfirmAction
} = useConfirmDialog({
  'clear-paths': () => {
    clearScanPaths()
    toastRef.value?.show('已清空扫描目录', 'success')
  },
  'clear-excludes': () => {
    clearExcludePaths()
    toastRef.value?.show('已清空排除项', 'success')
  },
  'clear-pinned': () => {
    clearPinnedPaths()
    toastRef.value?.show('已清空置顶项目', 'success')
  },
  'clear-remote-paths': () => {
    clearRemotePaths()
    toastRef.value?.show('已清空远程项目列表', 'success')
  },
  'clear-remote-pinned': () => {
    clearRemotePinnedPaths()
    toastRef.value?.show('已清空远程置顶项目', 'success')
  }
})

function askClearPaths() {
  if (!config.value.paths.length) return
  openConfirm({
    title: '清空扫描目录',
    message: `确认清空全部 ${config.value.paths.length} 个扫描目录？保存后生效~`,
    confirmText: '清空',
    action: 'clear-paths'
  })
}

function askClearExcludes() {
  if (!config.value.exclude_paths.length) return
  openConfirm({
    title: '清空排除文件夹',
    message: `确认清空全部 ${config.value.exclude_paths.length} 个排除项？保存后生效~`,
    confirmText: '清空',
    action: 'clear-excludes'
  })
}

function askClearPinned() {
  if (!config.value.pinned.length) return
  openConfirm({
    title: '清空置顶项目',
    message: `确认清空全部 ${config.value.pinned.length} 个置顶项？保存后生效~`,
    confirmText: '清空',
    action: 'clear-pinned'
  })
}

function askClearRemotePaths() {
  if (!remotePathCount.value) return
  openConfirm({
    title: '清空远程项目列表',
    message: `确认清空全部 ${remotePathCount.value} 个远程项目？保存后生效~`,
    confirmText: '清空',
    action: 'clear-remote-paths'
  })
}

function askClearRemotePinned() {
  if (!remotePinnedCount.value) return
  openConfirm({
    title: '清空远程置顶项目',
    message: `确认清空全部 ${remotePinnedCount.value} 个远程置顶项？保存后生效~`,
    confirmText: '清空',
    action: 'clear-remote-pinned'
  })
}

function resetDepth() {
  if (config.value.depth === DEFAULT_DEPTH) return
  config.value.depth = DEFAULT_DEPTH
  toastRef.value?.show('扫描深度已重置', 'success')
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

/** 打开安装包缓存目录 */
async function onOpenInstallerFolder() {
  const p = config.value.installer_path
  if (!p) {
    toastRef.value?.show('安装包缓存路径为空', 'error')
    return
  }
  const r = await window.api.openFolder(p)
  if (!r?.ok) {
    toastRef.value?.show(`打开失败：${r?.message || '未知错误'}`, 'error')
  }
}

function onHelpOpenError(message) {
  toastRef.value?.show(`打开链接失败：${message}`, 'error')
}

async function onHelpAction(item) {
  if (item.icon === 'info') {
    aboutVisible.value = true
  }
}

// 检查更新按钮回调
const { onUpdateCheckResult, onUpdateCheckError } = useUpdateCheck({ toastRef })

// ===== IDE 配置 =====
const { detectedIdes, refresh: refreshIdes } = useIdes()

/** config.json 所在目录，用于弹窗 <path> 占位符预览 */
const configDir = computed(() => {
  const p = config.value.config_path
  if (!p) return ''
  const sep = p.includes('/') ? '/' : '\\'
  return p.split(sep).slice(0, -1).join(sep)
})

const ideDialogVisible = ref(false)
const ideDialogData = ref(null)
/** 编辑时正在编辑的行索引，新增为 null */
const ideEditingIdx = ref(null)

/** 已有用户配置 id 列表（供弹窗重复校验用） */
const ideExistingIds = computed(() =>
  (config.value.ide_cfg.extends || []).map((x) => `${x.entry}::${x.script}`)
)

function openIdeDialog(idx) {
  ideEditingIdx.value = idx
  ideDialogData.value = idx !== null ? { ...(config.value.ide_cfg.extends[idx] || {}) } : null
  ideDialogVisible.value = true
}

/** 检测完成后自动写盘 ide_cfg.default（首次初始化或 IDE 不可用时触发） */
async function onSaveIdeCfg(refresh = false) {
  // config 未加载完成时 IDE 自动修正可能读到默认空值，跳过等 loadConfig 完成后二次触发
  if (!configLoaded.value) return
  try {
    const patchConfig = normalizeJSONObject({
      default: config.value.ide_cfg.default || '',
      exclude: config.value.ide_cfg.exclude || [],
      extends: config.value.ide_cfg.extends || []
    })
    await window.api.saveIdeConfig(patchConfig)
    if (refresh) refreshIdes()
  } catch {}
}

function onIdeDialogConfirm(data) {
  const list = [...(config.value.ide_cfg.extends || [])]
  if (ideEditingIdx.value !== null) {
    list.splice(ideEditingIdx.value, 1, data)
  } else {
    list.push(data)
  }
  config.value.ide_cfg.extends = list
  ideDialogVisible.value = false
  toastRef.value?.show(
    ideEditingIdx.value !== null ? '已更新 IDE 脚本' : '已添加 IDE 脚本',
    'success'
  )
  onSaveIdeCfg(true)
}

function removeExtend(idx) {
  const list = [...(config.value.ide_cfg.extends || [])]
  list.splice(idx, 1)
  config.value.ide_cfg.extends = list
  onSaveIdeCfg(true)
}

function doMoveExtend(idx, dir) {
  const list = [...(config.value.ide_cfg.extends || [])]
  const target = idx + dir
  if (target < 0 || target >= list.length) return
  ;[list[idx], list[target]] = [list[target], list[idx]]
  config.value.ide_cfg.extends = list
  onSaveIdeCfg(true)
}

onMounted(() => {
  loadConfig()
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
  discard
})
</script>

<style scoped>
/* settings 页 header：左侧标题区 + 右侧保存按钮，两端对齐 */
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* settings 主体：纵向堆叠 + field 之间 22px 间距 */
.settings-fields {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.page-title .version {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-tertiary);
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
.pin-icon {
  color: var(--color-accent);
  margin-right: 4px;
}

.wrap {
  flex: 1;
  position: relative;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 扫描目录项右侧"强制命中"开关：放在关闭按钮左边，二者保持适当距离 */
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
.forced-toggle__label,
.installer-toggle__label {
  cursor: pointer;
  user-select: none;
}
.forced-toggle__label:hover,
.installer-toggle__label:hover {
  color: var(--color-text);
}

/* 安装包缓存路径：自动清理开关，样式与"强制命中"一致 */
.installer-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  position: absolute;
  right: 20px;
  height: 100%;
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
.inline-toggle:not(:first-of-type) {
  margin-left: 10px;
}
</style>
