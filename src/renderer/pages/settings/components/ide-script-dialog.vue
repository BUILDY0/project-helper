<template>
  <Teleport to="body">
    <transition name="ide-dialog-fade">
      <div v-if="visible" class="ide-dialog__mask" @click.self="onMaskClick">
        <div class="ide-dialog">
          <!-- 标题 + 关闭 -->
          <div class="ide-dialog__head">
            <span class="ide-dialog__title">{{ isEdit ? '编辑 IDE 脚本' : '新增 IDE 脚本' }}</span>
            <button class="ide-dialog__close" aria-label="关闭" @click="onClose">×</button>
          </div>

          <!-- 表单 -->
          <div class="ide-dialog__body">
            <!-- IDE 名称 -->
            <div class="ide-form-row">
              <div class="ide-form-label-row">
                <label class="ide-form-label">
                  IDE 名称
                  <code>&lt;name&gt;</code>
                </label>
              </div>
              <BaseInput v-model="form.name" placeholder="如 VS Code" clearable />
            </div>

            <!-- 程序入口 -->
            <div class="ide-form-row">
              <div class="ide-form-label-row">
                <label class="ide-form-label">
                  程序入口
                  <code>&lt;entry&gt;</code>
                </label>
              </div>
              <div class="ide-form-inline">
                <BaseInput v-model="form.entry" placeholder="如 code" clearable class="flex1" />
                <BaseButton
                  :disabled="!form.entry"
                  variant="text"
                  tone="primary"
                  inline
                  :loading="probing"
                  @click="onProbeEntry"
                >
                  检测
                </BaseButton>
              </div>
              <ShellCode v-if="form.entry" class="ide-form-preview">
                <code>where {{ form.entry }}</code>
              </ShellCode>
            </div>

            <!-- 菜单文字 -->
            <div class="ide-form-row">
              <div class="ide-form-label-row">
                <label class="ide-form-label">
                  菜单文字
                  <code>&lt;label&gt;</code>
                </label>
                <div class="ide-form-label-btns">
                  <BaseButton variant="text" inline @click="insertPlaceholder('label', '<name>')">
                    + IDE名称
                  </BaseButton>
                  <BaseButton variant="text" inline @click="insertPlaceholder('label', '<entry>')">
                    + 程序入口
                  </BaseButton>
                </div>
              </div>
              <BaseInput v-model="form.label" placeholder="如 &lt;name&gt; 打开" clearable />
              <ShellCode v-if="form.label" class="ide-form-preview">
                <code>{{ resolvedLabel }}</code>
              </ShellCode>
            </div>

            <!-- 脚本代码 -->
            <div class="ide-form-row">
              <div class="ide-form-label-row">
                <label class="ide-form-label">
                  脚本代码
                  <code>&lt;script&gt;</code>
                </label>
                <div class="ide-form-label-btns">
                  <BaseButton variant="text" inline @click="insertPlaceholder('script', '<name>')">
                    + IDE名称
                  </BaseButton>
                  <BaseButton variant="text" inline @click="insertPlaceholder('script', '<entry>')">
                    + 程序入口
                  </BaseButton>
                  <BaseButton variant="text" inline @click="insertPlaceholder('script', '<path>')">
                    + 文件路径
                  </BaseButton>
                </div>
              </div>
              <div class="ide-form-inline">
                <BaseInput
                  v-model="form.script"
                  placeholder="如 &lt;entry&gt; &lt;path&gt;"
                  clearable
                />
                <BaseButton
                  :disabled="!form.script"
                  variant="text"
                  tone="primary"
                  inline
                  :loading="debugging"
                  @click="onDebug"
                >
                  调试
                </BaseButton>
              </div>
              <ShellCode v-if="form.script" class="ide-form-preview">
                <code>{{ resolvedScript }}</code>
              </ShellCode>
            </div>
          </div>

          <!-- 底部 -->
          <div class="ide-dialog__foot">
            <BaseButton variant="primary" @click="onConfirm">确认</BaseButton>
          </div>
        </div>
        <BaseConfirmDialog
          :visible="comfirmVisible"
          :title="'确认退出'"
          @confirm="onDialogConfirm"
          @cancel="comfirmVisible = false"
        >
          当前IDE脚本配置已变更，是否继续退出？
        </BaseConfirmDialog>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseInput from '@/components/common/base-input.vue'
import BaseButton from '@/components/common/base-button.vue'
import ShellCode from '@/components/common/shell-code.vue'
import BaseConfirmDialog from '@/components/common/base-confirm-dialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  initialData: { type: Object, default: null },
  existingIds: { type: Array, default: () => [] },
  configDir: { type: String, default: '' }
})

const emit = defineEmits(['close', 'confirm', 'validate-error', 'probe-result', 'debug-result'])

const isEdit = computed(() => !!props.initialData)
const form = ref({ name: '', entry: '', label: '', script: '' })
const probing = ref(false)
const debugging = ref(false)
const comfirmVisible = ref(false)

watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.value = props.initialData
        ? { ...props.initialData }
        : { name: '', entry: '', label: '', script: '' }
    }
  }
)

const resolvedLabel = computed(() =>
  form.value.label
    .replace(/<name>/g, form.value.name || '<name>')
    .replace(/<entry>/g, form.value.entry || '<entry>')
)

const resolvedScript = computed(() => {
  const pathExample = props.configDir || 'C:\\Users\\you\\project'
  return form.value.script
    .replace(/<name>/g, form.value.name || '<name>')
    .replace(/<entry>/g, form.value.entry || '<entry>')
    .replace(/<path>/g, `"${pathExample}"`)
})

function insertPlaceholder(field, placeholder) {
  const cur = form.value[field]
  const needSpace = cur.length > 0 && cur[cur.length - 1] !== ' '
  form.value[field] = cur + (needSpace ? ' ' : '') + placeholder
}

async function onProbeEntry() {
  if (!form.value.entry) return
  probing.value = true
  try {
    const r = await window.api.probeIdeEntry(form.value.entry.trim())
    emit('probe-result', r.ok)
  } finally {
    probing.value = false
  }
}

async function onDebug() {
  if (!form.value.script) return
  debugging.value = true
  try {
    const pathExample = props.configDir || 'C:\\Users\\you\\project'
    const cmd = form.value.script
      .replace(/<name>/g, form.value.name || '')
      .replace(/<entry>/g, form.value.entry || '')
      .replace(/<path>/g, `"${pathExample}"`)
    const result = await window.api.debugIdeScript(cmd)
    emit('debug-result', result?.ok ?? false, result?.message)
  } finally {
    debugging.value = false
  }
}

const dirty = computed(() =>
  Boolean(form.value.name || form.value.entry || form.value.label || form.value.script)
)
const hasChanges = computed(
  () =>
    form.value.name !== props.initialData?.name ||
    form.value.entry !== props.initialData?.entry ||
    form.value.label !== props.initialData?.label ||
    form.value.script !== props.initialData?.script
)

/** 点击遮罩：有内容时挽留 */
function onMaskClick() {
  onClose()
}

function onClose() {
  if (dirty.value && hasChanges.value) {
    comfirmVisible.value = true
    return
  }
  emit('close')
}

function onDialogConfirm() {
  comfirmVisible.value = false
  emit('close')
}

function onConfirm() {
  const { name, entry, label, script } = form.value
  if (!name.trim()) {
    emit('validate-error', 'IDE 名称不能为空')
    return
  }
  if (!entry.trim()) {
    emit('validate-error', '程序入口不能为空')
    return
  }
  if (!label.trim()) {
    emit('validate-error', '菜单文字不能为空')
    return
  }
  if (!script.trim()) {
    emit('validate-error', '脚本代码不能为空')
    return
  }

  const newId = `${entry.trim()}::${script.trim()}`
  const origId = props.initialData
    ? `${props.initialData.entry}::${props.initialData.script}`
    : null
  if (props.existingIds.includes(newId) && newId !== origId) {
    emit('validate-error', '该 entry + script 组合已存在，请修改后重试')
    return
  }

  emit('confirm', {
    name: name.trim(),
    entry: entry.trim(),
    label: label.trim(),
    script: script.trim()
  })
}
</script>

<style scoped>
.ide-dialog__mask {
  position: fixed;
  inset: 0;
  background: var(--color-mask);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ide-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 580px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ide-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.ide-dialog__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.ide-dialog__close {
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
.ide-dialog__close:hover {
  background: var(--color-hover);
  color: var(--color-text);
}
.ide-dialog__body {
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ide-dialog__foot {
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* 表单行 */
.ide-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
/* label 与插入按钮同行，顶部对齐 */
.ide-form-label-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex-wrap: wrap;
}
.ide-form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  line-height: 22px;
}
.ide-form-label code {
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-hover);
  border-radius: 3px;
  padding: 1px 4px;
  margin-left: 4px;
}
.ide-form-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}
.flex1 {
  flex: 1;
  min-width: 0;
}
.ide-form-preview {
  margin-top: 2px;
}
.ide-form-label-btns {
  margin-left: auto;
}

/* 动画 */
.ide-dialog-fade-enter-active,
.ide-dialog-fade-leave-active {
  transition: opacity 0.15s;
}
.ide-dialog-fade-enter-from,
.ide-dialog-fade-leave-to {
  opacity: 0;
}
</style>
