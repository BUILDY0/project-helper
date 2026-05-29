<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="dlg-mask" @click.self="onCancel">
        <div class="dlg">
          <button
            v-if="closeIcon"
            class="dlg-close"
            type="button"
            aria-label="关闭"
            @click="onCancel"
          >
            ×
          </button>
          <div class="dlg-title">{{ title }}</div>
          <div class="dlg-body">
            <slot>{{ message }}</slot>
          </div>
          <div class="dlg-actions">
            <button v-if="!closeIcon" class="btn" @click="onCancel">{{ cancelText }}</button>
            <button class="btn danger" @click="onConfirm">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: Boolean,
  title: { type: String, default: '提示' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' },
  closeIcon: { type: Boolean, default: false }
})
const emit = defineEmits(['confirm', 'cancel'])

const onConfirm = () => emit('confirm')
const onCancel = () => emit('cancel')
</script>

<style scoped>
.dlg-mask {
  position: fixed;
  inset: 0;
  background: var(--color-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}
.dlg {
  width: 380px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 22px 22px 16px;
  position: relative;
}
.dlg-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 18px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;
}
.dlg-close:hover {
  background: var(--color-hover);
  color: var(--color-text);
}
.dlg-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--color-text);
}
.dlg-body {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  word-break: break-all;
  margin-bottom: 18px;
}
.dlg-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn {
  height: 32px;
  padding: 0 16px;
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
.btn.danger {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: #fff;
}
.btn.danger:hover {
  background: var(--color-danger-hover);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
