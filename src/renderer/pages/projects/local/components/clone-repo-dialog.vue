<template>
  <BaseConfirmDialog
    :visible="visible"
    title="克隆 git 仓库"
    close-icon
    confirm-text="确认"
    confirm-tone="primary"
    :width="560"
    @cancel="emit('cancel')"
    @confirm="onConfirm"
  >
    <div class="clone-form">
      <!-- 仓库地址：支持 https / ssh，失焦或确认时校验 -->
      <div class="clone-field">
        <label class="clone-field__label">仓库地址</label>
        <BaseInput
          v-model="url"
          placeholder="https://github.com/user/repo.git 或 git@github.com:user/repo.git"
          @update:model-value="urlError = ''"
        />
        <p v-if="urlError" class="clone-field__error">{{ urlError }}</p>
      </div>

      <!-- 本地存储路径：可手动输入，右侧按钮打开资源浏览器选择目录 -->
      <div class="clone-field">
        <label class="clone-field__label">本地存储路径</label>
        <div class="clone-path">
          <BaseInput
            v-model="dir"
            placeholder="克隆项目到本地的完整路径，如 D:\code\my-repo"
            @update:model-value="dirError = ''"
          />
          <BaseButton
            variant="secondary"
            size="md"
            class="clone-path__browse"
            v-tooltip="'选择目录'"
            @click="onBrowse"
          >
            <IconFolderOpen :size="16" />
          </BaseButton>
        </div>
        <p v-if="dirError" class="clone-field__error">{{ dirError }}</p>
      </div>
    </div>
  </BaseConfirmDialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseConfirmDialog from '@/components/common/base-confirm-dialog.vue'
import BaseInput from '@/components/common/base-input.vue'
import BaseButton from '@/components/common/base-button.vue'
import IconFolderOpen from '@/components/icons/icon-folder-open.vue'
import { isValidRepoUrl, isValidLocalPath } from '../utils/clone-validators.js'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['cancel', 'confirm'])

const url = ref('')
const dir = ref('')
const urlError = ref('')
const dirError = ref('')

// 每次打开重置表单与错误提示
watch(
  () => props.visible,
  (vis) => {
    if (vis) {
      url.value = ''
      dir.value = ''
      urlError.value = ''
      dirError.value = ''
    }
  }
)

/** 打开系统资源浏览器选择目录，默认定位用户主目录，选中后回填输入框 */
async function onBrowse() {
  const picked = await window.api.selectDirectory({ defaultToHome: true })
  if (picked) {
    dir.value = picked
    dirError.value = ''
  }
}

function validate() {
  const u = url.value.trim()
  const d = dir.value.trim()
  urlError.value = !u
    ? '请输入仓库地址'
    : !isValidRepoUrl(u)
      ? '仓库地址格式不正确（需 https 或 ssh 协议）'
      : ''
  dirError.value = !d
    ? '请输入本地存储路径'
    : !isValidLocalPath(d)
      ? '路径格式不正确，请输入合法的绝对路径'
      : ''
  return !urlError.value && !dirError.value
}

function onConfirm() {
  if (!validate()) return
  emit('confirm', { url: url.value.trim(), dir: dir.value.trim() })
}
</script>

<style scoped>
.clone-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.clone-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.clone-field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}
.clone-field__error {
  margin: 0;
  font-size: 12px;
  color: var(--color-danger);
}
.clone-path {
  display: flex;
  align-items: center;
  gap: 8px;
}
.clone-path__browse {
  flex-shrink: 0;
}
</style>
