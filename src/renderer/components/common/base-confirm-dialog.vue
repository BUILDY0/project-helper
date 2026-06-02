<template>
  <Teleport to="body">
    <transition name="base-confirm-dialog-fade">
      <div v-if="visible" class="base-confirm-dialog__mask" @click.self="onCancel">
        <div class="base-confirm-dialog" :style="{ width: `${width}px` }">
          <BaseButton
            v-if="closeIcon"
            variant="icon"
            size="sm"
            class="btn-close-affix"
            aria-label="关闭"
            @click="onCancel"
          >
            ×
          </BaseButton>
          <div class="base-confirm-dialog__title">{{ title }}</div>
          <div class="base-confirm-dialog__body">
            <slot>{{ message }}</slot>
          </div>
          <div class="base-confirm-dialog__actions">
            <slot name="actions">
              <BaseButton v-if="!closeIcon" @click="onCancel">{{ cancelText }}</BaseButton>
              <BaseButton :variant="confirmTone" @click="onConfirm">{{ confirmText }}</BaseButton>
            </slot>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import BaseButton from './base-button.vue'

const props = defineProps({
  visible: Boolean,
  title: { type: String, default: '提示' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' },
  closeIcon: { type: Boolean, default: false },
  // 确认按钮配色：danger（默认，红）用于删除等破坏性操作；primary 用于普通操作
  confirmTone: {
    type: String,
    default: 'danger',
    validator: (v) => ['danger', 'primary'].includes(v)
  },
  /** 弹窗宽度（px）。默认 380；多按钮等紧凑场景可传更大值 */
  width: { type: Number, default: 380 }
})
const emit = defineEmits(['confirm', 'cancel'])

const onConfirm = () => emit('confirm')
const onCancel = () => emit('cancel')

// ESC 关闭：仅在 visible=true 期间监听 document keydown，等价于点击 mask / 取消按钮
function onKeyDown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    onCancel()
  }
}
watch(
  () => props.visible,
  (vis) => {
    if (vis) document.addEventListener('keydown', onKeyDown)
    else document.removeEventListener('keydown', onKeyDown)
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<style>
.base-confirm-dialog__mask {
  position: fixed;
  inset: 0;
  background: var(--color-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}
.base-confirm-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 22px 22px 16px;
  position: relative;
}
.base-confirm-dialog__title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--color-text);
}
.base-confirm-dialog__body {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  word-break: break-all;
  margin-bottom: 18px;
}
.base-confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.base-confirm-dialog-fade-enter-active,
.base-confirm-dialog-fade-leave-active {
  transition: opacity 0.15s;
}
.base-confirm-dialog-fade-enter-from,
.base-confirm-dialog-fade-leave-to {
  opacity: 0;
}
</style>
