<template>
  <BaseConfirmDialog
    :visible="visible"
    title="复制项目"
    close-icon
    confirm-text="确认"
    confirm-tone="primary"
    :width="560"
    @cancel="emit('cancel')"
    @confirm="onConfirm"
  >
    <div class="copy-form">
      <!-- 原项目路径：只读，可复制 -->
      <div class="copy-field">
        <label class="copy-field__label">原项目路径</label>
        <div class="copy-path">
          <BaseInput :model-value="source" readonly />
          <BaseButton
            variant="secondary"
            size="md"
            class="copy-path__btn"
            v-tooltip="'复制路径'"
            @click="onCopySource"
          >
            <IconCopy :size="16" />
          </BaseButton>
        </div>
      </div>

      <!-- 新项目路径：可输入 + 资源管理器选择目录 -->
      <div class="copy-field">
        <label class="copy-field__label">新项目路径</label>
        <div class="copy-path">
          <BaseInput
            v-model="dest"
            placeholder="复制到的完整路径，如 D:\code\my-project-copy"
            @update:model-value="destError = ''"
          />
          <BaseButton
            variant="secondary"
            size="md"
            class="copy-path__btn"
            v-tooltip="'选择目录'"
            @click="onBrowse"
          >
            <IconFolderOpen :size="16" />
          </BaseButton>
        </div>
        <p v-if="destError" class="copy-field__error">{{ destError }}</p>
      </div>

      <!-- 删除原始 git 信息：默认勾选 -->
      <div class="copy-field copy-field--switch">
        <span class="copy-field__label">删除原始 git 信息</span>
        <BaseSwitch v-model="removeGit" aria-label="删除原始 git 信息" />
      </div>
    </div>
  </BaseConfirmDialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseConfirmDialog from '@/components/common/base-confirm-dialog.vue'
import BaseInput from '@/components/common/base-input.vue'
import BaseButton from '@/components/common/base-button.vue'
import BaseSwitch from '@/components/common/base-switch.vue'
import IconFolderOpen from '@/components/icons/icon-folder-open.vue'
import IconCopy from '@/components/icons/icon-copy.vue'
import { isValidLocalPath, isSamePath } from '../utils/clone-validators.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  /** 待复制的项目对象（需含 path 字段） */
  project: { type: Object, default: null }
})
const emit = defineEmits(['cancel', 'confirm'])

const source = ref('')
const dest = ref('')
const removeGit = ref(true)
const destError = ref('')

// 打开时以项目路径初始化：新路径默认与原路径一致
watch(
  () => props.visible,
  (vis) => {
    if (!vis) return
    source.value = props.project?.path || ''
    dest.value = source.value
    removeGit.value = true
    destError.value = ''
  }
)

async function onCopySource() {
  if (!source.value) return
  await window.api.copyText(source.value)
}

/** 资源管理器初始定位到原项目路径 */
async function onBrowse() {
  const defaultPath = source.value || undefined
  const picked = await window.api.selectDirectory({ defaultPath })
  if (picked) {
    dest.value = picked
    destError.value = ''
  }
}

function validate() {
  const d = dest.value.trim()
  destError.value = !d
    ? '请输入新项目路径'
    : !isValidLocalPath(d)
      ? '路径格式不正确，请输入合法的绝对路径'
      : isSamePath(d, source.value)
        ? '新路径不可与原路径相同'
        : ''
  return !destError.value
}

function onConfirm() {
  if (!validate()) return
  emit('confirm', {
    source: source.value,
    dest: dest.value.trim(),
    removeGit: removeGit.value
  })
}
</script>

<style scoped>
.copy-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.copy-field {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 6px;
}
.copy-field--switch {
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
}
.copy-field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}
.copy-field__error {
  margin: 0;
  font-size: 12px;
  color: var(--color-danger);
}
.copy-path {
  display: flex;
  align-items: center;
  gap: 8px;
}
.copy-path__btn {
  flex-shrink: 0;
}
</style>
