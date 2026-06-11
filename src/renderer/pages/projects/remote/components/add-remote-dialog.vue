<template>
  <Teleport to="body">
    <transition name="remote-dialog-fade">
      <div v-if="visible" class="remote-dialog__mask" @click.self="onMaskClick">
        <!-- 步骤 1：选择连接方式 -->
        <div v-if="step === 1" class="remote-dialog">
          <div class="remote-dialog__head">
            <span class="remote-dialog__title">创建远程连接项目</span>
            <button class="remote-dialog__close" aria-label="关闭" @click="onClose">×</button>
          </div>
          <div class="remote-dialog__body remote-dialog__picker">
            <button class="picker-card" @click="startForm('ssh')">
              <div class="picker-icon">
                <IconNewtab :size="48" />
              </div>
              <span class="picker-card__overlay">SSH</span>
              <span class="picker-label">创建SSH连接</span>
            </button>
            <button class="picker-card" @click="startForm('wsl')">
              <div class="picker-icon">
                <IconNewtab :size="48" />
              </div>
              <span class="picker-card__overlay">WSL</span>
              <span class="picker-label">创建WSL连接</span>
            </button>
            <button class="picker-card" @click="startForm('other')">
              <div class="picker-icon">
                <IconNewtab :size="48" />
              </div>
              <span class="picker-card__overlay">其他</span>
              <span class="picker-label">创建其他协议的连接</span>
            </button>
          </div>
        </div>

        <!-- 步骤 2：填写表单 -->
        <div v-else class="remote-dialog remote-dialog--form">
          <div class="remote-dialog__head">
            <span class="remote-dialog__title">
              {{ formTitle }}
            </span>
            <button class="remote-dialog__close" aria-label="关闭" @click="onClose">×</button>
          </div>
          <div class="remote-dialog__body">
            <!-- 项目名 -->
            <div class="form-row">
              <label class="form-label">项目名</label>
              <BaseInput v-model="form.alias" placeholder="请输入项目名称" clearable />
            </div>

            <!-- 项目描述 -->
            <div class="form-row">
              <label class="form-label">项目描述</label>
              <BaseInput v-model="form.desc" placeholder="请输入项目描述（选填）" clearable />
            </div>

            <!-- 远程地址 / 分发系统 / 远程地址（other） -->
            <div class="form-row">
              <label class="form-label">
                <template v-if="mode === 'ssh'">
                  远程地址
                  <code>&lt;path&gt;</code>
                </template>
                <template v-else-if="mode === 'wsl'">
                  分发系统
                  <code>&lt;path&gt;</code>
                </template>
                <template v-else>
                  远程地址
                  <code>&lt;path&gt;</code>
                </template>
              </label>
              <BaseInput v-model="form.path" :placeholder="pathPlaceholder" clearable />
            </div>

            <!-- 参数 -->
            <div class="form-row">
              <label class="form-label">
                参数
                <code>&lt;param&gt;</code>
              </label>
              <BaseSelect
                v-model="paramValue"
                :options="paramOptions"
                :placeholder="'请选择参数'"
                clearable
                @change="onParamChange"
              />
              <BaseInput
                v-if="paramCustomVisible"
                v-model="form.param"
                placeholder="请输入自定义参数"
                clearable
                class="mt6"
              />
            </div>

            <!-- 协议 -->
            <div class="form-row">
              <label class="form-label">
                协议
                <code>&lt;scheme&gt;</code>
              </label>
              <BaseSelect
                v-model="schemeValue"
                :options="schemeOptions"
                :placeholder="'请选择协议'"
                clearable
                @change="onSchemeChange"
              />
              <BaseInput
                v-if="schemeCustomVisible"
                v-model="form.scheme"
                placeholder="请输入自定义协议"
                clearable
                class="mt6"
              />
            </div>

            <!-- IDE 打开路径 -->
            <div class="form-row">
              <label class="form-label">
                IDE打开路径
                <code>&lt;dir&gt;</code>
              </label>
              <BaseInput v-model="form.dir" :placeholder="dirPlaceholder" clearable />
            </div>

            <!-- 脚本代码 -->
            <div class="form-row">
              <div class="form-label-row script-label-row">
                <label class="form-label">
                  脚本代码
                  <code>&lt;script&gt;</code>
                </label>
                <BaseSelect
                  v-model="scriptEntry"
                  :options="ideOptions"
                  placeholder="选择 IDE 入口"
                  class="script-entry-select"
                />
                <div class="form-label-btns">
                  <BaseButton variant="text" inline @click="insertPlaceholder('<entry>')">
                    +程序入口
                  </BaseButton>
                  <template v-if="mode === 'ssh'">
                    <BaseButton variant="text" inline @click="insertPlaceholder('<path>')">
                      +远程地址
                    </BaseButton>
                  </template>
                  <template v-else-if="mode === 'wsl'">
                    <BaseButton variant="text" inline @click="insertPlaceholder('<path>')">
                      +分发系统
                    </BaseButton>
                  </template>
                  <template v-else>
                    <BaseButton variant="text" inline @click="insertPlaceholder('<path>')">
                      +远程地址
                    </BaseButton>
                  </template>
                  <BaseButton variant="text" inline @click="insertPlaceholder('<param>')">
                    +参数
                  </BaseButton>
                  <BaseButton variant="text" inline @click="insertPlaceholder('<scheme>')">
                    +协议
                  </BaseButton>
                  <BaseButton variant="text" inline @click="insertPlaceholder('<dir>')">
                    +打开路径
                  </BaseButton>
                </div>
              </div>
              <BaseInput
                v-model="form.script"
                :placeholder="'请输入脚本代码，如 <entry> <param> <scheme>+<path> <dir>'"
                clearable
              />
              <div class="form-inline mt6">
                <ShellCode class="flex1">
                  <code>{{ resolvedScript }}</code>
                </ShellCode>
                <BaseButton
                  :disabled="!resolvedScript"
                  variant="text"
                  tone="primary"
                  inline
                  :loading="debugging"
                  @click="onDebug"
                >
                  调试
                </BaseButton>
              </div>
            </div>
          </div>

          <div class="remote-dialog__foot">
            <BaseButton variant="primary" @click="onConfirm">确认</BaseButton>
          </div>
        </div>

        <BaseConfirmDialog
          :visible="dirtyConfirmVisible"
          title="确认退出"
          @confirm="onDirtyConfirm"
          @cancel="dirtyConfirmVisible = false"
        >
          当前表单内容已变更，是否继续退出？
        </BaseConfirmDialog>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import BaseInput from '@/components/common/base-input.vue'
import BaseButton from '@/components/common/base-button.vue'
import BaseSelect from '@/components/common/base-select.vue'
import ShellCode from '@/components/common/shell-code.vue'
import BaseConfirmDialog from '@/components/common/base-confirm-dialog.vue'
import IconNewtab from '@/components/icons/icon-newtab.vue'
import { PathType, normalizePathItem, SshPath, WslPath, DefaultPath } from '@shared/path-types.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  initialData: { type: Object, default: null }
})
const emit = defineEmits(['close', 'confirm', 'validate-error', 'debug-result'])

// 步骤：1=选择连接方式, 2=填写表单
const step = ref(1)
const mode = ref('') // 'ssh' | 'wsl' | 'other'
const isEdit = computed(() => !!props.initialData)

const form = reactive({
  alias: '',
  desc: '',
  path: '',
  param: '',
  scheme: '',
  dir: '',
  script: ''
})

const formTitle = computed(() => {
  if (isEdit.value) return '修改远程项目配置'
  const titles = { ssh: '创建 SSH 连接', wsl: '创建 WSL 连接', other: '创建其他协议连接' }
  return titles[mode.value] || '创建远程连接'
})

const pathPlaceholder = computed(() => {
  if (mode.value === 'ssh')
    return '请输入地址，格式 [username@][hostname|ip][:port]，如 root@192.168.1.1:5173'
  if (mode.value === 'wsl') return '请输入分发系统，格式 Ubuntu'
  return '请输入远程地址'
})

const dirPlaceholder = computed(() => {
  if (mode.value === 'ssh') return '请输入路径，如 /data/'
  if (mode.value === 'wsl') return '请输入路径，如 /home/%USERNAME%'
  return '请输入路径，如 /root/'
})

/** 下拉框"其他"哨兵值——避免空串被 BaseSelect 当作"未选中"不显示标签 */
const OTHER_KEY = '__other__'

const PARAM_OPTIONS = [
  { value: '--remote', label: '--remote（vscode标准）' },
  { value: '--folder-uri', label: '--folder-uri（vscode指定目录）' },
  { value: '--file-uri', label: '--file-uri（vscode指定文件）' },
  { value: OTHER_KEY, label: '其他' }
]

const paramValue = ref('')
const schemeValue = ref('')

/** 自定义输入显隐：派生自下拉选中值 */
const paramCustomVisible = computed(() => paramValue.value === OTHER_KEY)
const schemeCustomVisible = computed(() => schemeValue.value === OTHER_KEY)

const paramOptions = PARAM_OPTIONS

const schemeOptions = computed(() => {
  if (paramValue.value === OTHER_KEY) {
    return [{ value: OTHER_KEY, label: '其他' }]
  }
  if (mode.value === 'ssh') {
    return [
      { value: 'ssh-remote', label: 'ssh-remote' },
      { value: OTHER_KEY, label: '其他' }
    ]
  }
  if (mode.value === 'wsl') {
    return [
      { value: 'wsl', label: 'wsl' },
      { value: OTHER_KEY, label: '其他' }
    ]
  }
  return [{ value: OTHER_KEY, label: '其他' }]
})

// ===== 事件驱动联动：单向，仅在用户 change 时触发，读数据时不干扰 =====
// 规则：
// 1. param change → scheme 选第一项 + script 按模板填充（找不到模板则清空）
// 2. scheme change → 不影响其他
// 3. script change → 不影响其他
// 4. 新建 / 编辑均适用

function onParamChange(val) {
  if (val === OTHER_KEY) {
    form.param = ''
  } else if (val !== '') {
    form.param = val
  }
  // scheme 自动选第一项
  const opts = schemeOptions.value
  if (opts.length > 0) {
    schemeValue.value = opts[0].value
    onSchemeChange(opts[0].value)
  }
  autoFillScript(val)
}

function onSchemeChange(val) {
  if (val === OTHER_KEY) {
    form.scheme = ''
  } else if (val !== '') {
    form.scheme = val
  }
}

function autoFillScript(rawVal) {
  const param = rawVal === OTHER_KEY ? '' : rawVal
  if (!param) {
    form.script = ''
    return
  }
  if (param === '--remote') {
    form.script = '<entry> <param> <scheme>+<path> <dir>'
  } else if (param === '--folder-uri' || param === '--file-uri') {
    form.script = '<entry> <param> vscode-remote://<scheme>+<path><dir>'
  } else {
    form.script = ''
  }
}

// IDE 入口选择
const scriptEntry = ref('')
const ideOptions = ref([])
const allIdes = ref([])

async function loadIdes() {
  try {
    const cached = await window.api.getAvailableIdes()
    allIdes.value = cached || []
    ideOptions.value = allIdes.value
      .filter((i) => i.available)
      .map((i) => ({ value: i.id, label: i.name }))
    // 取默认 IDE
    const cfg = await window.api.readConfig()
    const defaultId = cfg.ide_cfg?.default || ''
    if (defaultId && ideOptions.value.some((o) => o.value === defaultId)) {
      scriptEntry.value = defaultId
    } else if (ideOptions.value.length > 0) {
      scriptEntry.value = ideOptions.value[0].value
    }
  } catch {}
}

const resolvedScript = computed(() => {
  let script = form.script || ''
  if (!script) return ''
  // 替换 entry
  const ide = allIdes.value.find((i) => i.id === scriptEntry.value)
  const entryVal = ide?.entry || ''
  script = script.replace(/<entry>/g, entryVal || '<entry>')
  script = script.replace(/<path>/g, form.path || '<path>')
  script = script.replace(/<param>/g, form.param || '<param>')
  script = script.replace(/<scheme>/g, form.scheme || '<scheme>')
  script = script.replace(/<dir>/g, form.dir || '<dir>')
  return script
})

function insertPlaceholder(placeholder) {
  const cur = form.script
  const needSpace = cur.length > 0 && cur[cur.length - 1] !== ' '
  form.script = cur + (needSpace ? ' ' : '') + placeholder
}

const debugging = ref(false)
async function onDebug() {
  if (!resolvedScript.value) return
  debugging.value = true
  try {
    const cleaned = resolvedScript.value.replace(/"[^"]*"/g, '"test"')
    const result = await window.api.debugIdeScript(cleaned)
    emit('debug-result', result?.ok ?? false, result?.message)
  } finally {
    debugging.value = false
  }
}

// 表单校验
function validate() {
  if (!form.alias.trim()) {
    emit('validate-error', '项目名不能为空')
    return false
  }
  if (!form.path.trim()) {
    emit('validate-error', mode.value === 'wsl' ? '分发系统不能为空' : '远程地址不能为空')
    return false
  }
  if (!form.param.trim() && !paramCustomVisible.value) {
    emit('validate-error', '参数不能为空')
    return false
  }
  if (mode.value !== 'other' && !form.scheme.trim() && !schemeCustomVisible.value) {
    emit('validate-error', '协议不能为空')
    return false
  }
  if (!form.script.trim()) {
    emit('validate-error', '脚本代码不能为空')
    return false
  }
  return true
}

function buildPathObject() {
  const cfg = {
    alias: form.alias.trim(),
    desc: form.desc.trim(),
    param: form.param.trim(),
    scheme: form.scheme.trim(),
    dir: form.dir.trim(),
    script: form.script.trim()
  }
  const pathVal = form.path.trim()
  switch (mode.value) {
    case 'ssh':
      return new SshPath({ path: pathVal, cfg })
    case 'wsl':
      return new WslPath({ path: pathVal, cfg })
    default:
      return new DefaultPath({ path: pathVal, cfg })
  }
}

function onConfirm() {
  if (!validate()) return
  const obj = buildPathObject()
  emit('confirm', {
    path: obj.path,
    type: obj.type,
    cfg: { ...obj.cfg }
  })
}

function startForm(type) {
  mode.value = type
  step.value = 2
  form.alias = ''
  form.desc = ''
  form.path = ''
  form.param = ''
  form.scheme = ''
  form.dir = ''
  form.script = ''
  paramValue.value = ''
  schemeValue.value = ''
  scriptEntry.value = ideOptions.value[0]?.value || ''
}

// 脏检测与关闭
const dirty = computed(() => Boolean(form.alias || form.path || form.script))
const dirtyConfirmVisible = ref(false)

function onClose() {
  if (step.value === 2 && dirty.value) {
    dirtyConfirmVisible.value = true
    return
  }
  emit('close')
}
function onDirtyConfirm() {
  dirtyConfirmVisible.value = false
  emit('close')
}
function onMaskClick() {
  onClose()
}

// 可见性 / 初始数据切换：immediate 确保 v-if 创建时已有 initialData 也能触发
watch(
  () => props.visible,
  (v) => {
    if (v) {
      if (props.initialData) {
        // 编辑模式：直接显示真实数据，无 watcher 干扰
        const d = props.initialData
        const type = d.type
        mode.value = type === PathType.SSH ? 'ssh' : type === PathType.WSL ? 'wsl' : 'other'
        const rawParam = d.cfg?.param || ''
        const rawScheme = d.cfg?.scheme || ''
        form.alias = d.cfg?.alias || ''
        form.desc = d.cfg?.desc || ''
        form.path = d.path || ''
        form.param = rawParam
        form.scheme = rawScheme
        form.dir = d.cfg?.dir || ''
        form.script = d.cfg?.script || ''
        // 恢复下拉：匹配已知选项用原值，否则 OTHER_KEY（显隐由 computed 派生）
        paramValue.value = PARAM_OPTIONS.some((o) => o.value === rawParam) ? rawParam : OTHER_KEY
        schemeValue.value = schemeOptions.value.some((o) => o.value === rawScheme)
          ? rawScheme
          : OTHER_KEY
        step.value = 2
      } else {
        step.value = 1
        mode.value = ''
      }
      loadIdes()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.remote-dialog__mask {
  position: fixed;
  inset: 0;
  background: var(--color-mask);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.remote-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 620px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.remote-dialog--form {
  width: 720px;
}
.remote-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.remote-dialog__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.remote-dialog__close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 18px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition:
    background 0.15s,
    color 0.15s;
}
.remote-dialog__close:hover {
  background: var(--color-hover);
  color: var(--color-text);
}
.remote-dialog__body {
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.remote-dialog__picker {
  flex-direction: row;
  justify-content: space-evenly;
  padding: 24px 20px;
}
.remote-dialog__foot {
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* 选择器卡片 */
.picker-card {
  position: relative;
  width: 140px;
  height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-2);
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
  color: var(--color-text);
}
.picker-card:hover {
  border-color: var(--color-accent-border);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.picker-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  position: relative;
}
.picker-card__overlay {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  pointer-events: none;
}
.picker-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
}

/* 表单行 */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  line-height: 22px;
}
.form-label code {
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-hover);
  border-radius: 3px;
  padding: 1px 4px;
  margin-left: 4px;
}
.form-label-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex-wrap: wrap;
}
.form-label-btns {
  margin-left: auto;
  display: flex;
  gap: 2px;
}
.form-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}
.flex1 {
  flex: 1;
  min-width: 0;
}
.mt6 {
  margin-top: 6px;
}
.script-entry-select {
  width: 150px;
  height: 24px;
  min-height: 24px;
}

/* 动画 */
.remote-dialog-fade-enter-active,
.remote-dialog-fade-leave-active {
  transition: opacity 0.15s;
}
.remote-dialog-fade-enter-from,
.remote-dialog-fade-leave-to {
  opacity: 0;
}
</style>
