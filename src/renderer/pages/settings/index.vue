<template>
  <PageLayout>
    <template #header>
      <div class="settings-header">
        <div class="page-title">
          配置
          <span v-if="appVersion" class="version">v{{ appVersion }}</span>

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
      <!-- 配置文件路径：只读 input + 两个操作按钮 -->
      <SettingField label="配置文件路径">
        <div class="row">
          <BaseInput class="config-path" :model-value="config.config_path" readonly />
          <BaseButton @click="onOpenConfigFile">打开文件</BaseButton>
          <BaseButton @click="onOpenConfigFolder">打开文件夹</BaseButton>
        </div>
        <div class="hint">
          <span>最后修改：{{ formatTime(config.mtime) }}</span>
        </div>
      </SettingField>

      <!-- 扫描目录 -->
      <SettingField label="扫描目录">
        <template #actions>
          <BaseButton variant="text" inline :disabled="!config.paths.length" @click="askClearPaths">
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
      </SettingField>

      <!-- 扫描深度 -->
      <SettingField label="扫描深度">
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
      </SettingField>

      <!-- 排除文件夹 -->
      <SettingField label="排除文件夹">
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
      </SettingField>

      <!-- 置顶项目（pin） -->
      <SettingField label="置顶项目">
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
            <template #prefix><span class="pin-icon">★</span></template>
          </PathListItem>
        </div>
        <div v-else class="empty-tip">暂未置顶任何项目</div>
      </SettingField>

      <!-- 帮助 -->
      <SettingField label="帮助">
        <div class="help-list">
          <HelpCircleLink
            v-for="item in HELP_ITEMS"
            :key="item.label"
            :label="item.label"
            :url="item.url"
            :icon="item.icon"
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

    <BaseToast ref="toastRef" />
  </PageLayout>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
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
import PathListItem from './components/path-list-item.vue'
import { useConfig } from './composables/use-config.js'
import { useScanPaths, DEFAULT_DEPTH } from './composables/use-scan-paths.js'
import { useExcludePaths } from './composables/use-exclude-paths.js'
import { usePinnedPaths } from './composables/use-pinned-paths.js'
import { useConfirmDialog } from './composables/use-confirm-dialog.js'
import { useUpdateCheck } from './composables/use-update-check.js'
import { useAppVersion } from './composables/use-app-version.js'
import { getPathText } from './utils/path-helper.js'
import { formatTime } from '@/utils/format-time.js'

// ===== 页面级 UI 文案常量（仅本页使用，直接内联） =====
const AUTO_RUN_TIP = '开启后，开机时会自动启动 ProjectHelper。修改后需点击"保存"才会生效。'
const AUTO_CHECK_UPDATE_TIP =
  '开启后，应用启动 5 秒后会检查一次新版本，运行期间每隔 1 小时再检查一次。修改后需点击"保存"才会生效。'
const FORCED_TIP = '开启后，扫描时强制命中当前目录。修改后需点击"保存"才会生效。'

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
  }
]

const props = defineProps({
  active: Boolean
})

const toastRef = ref(null)

// 应用版本号
const { appVersion } = useAppVersion()

// 配置加载 / 保存 / 未保存检测
const { config, saving, loadConfig, onSave, hasChanges, discard } = useConfig({ toastRef })

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

function onHelpOpenError(message) {
  toastRef.value?.show(`打开链接失败：${message}`, 'error')
}

// 检查更新按钮回调
const { onUpdateCheckResult, onUpdateCheckError } = useUpdateCheck({ toastRef })

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
.config-path {
  flex: 1;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pin-icon {
  color: var(--color-accent);
  margin-right: 6px;
  font-size: 13px;
  line-height: 1;
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
.forced-toggle__label {
  cursor: pointer;
  user-select: none;
}
.forced-toggle__label:hover {
  color: var(--color-text);
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
