<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="visible" class="dlg-mask" @click.self="onCancel">
        <div class="dlg">
          <div class="dlg-title">{{ title }}</div>
          <div class="dlg-body">
            <slot>{{ message }}</slot>
          </div>
          <div class="dlg-actions">
            <button class="btn" @click="onCancel">{{ cancelText }}</button>
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
  cancelText: { type: String, default: '取消' }
})
const emit = defineEmits(['confirm', 'cancel'])

const onConfirm = () => emit('confirm')
const onCancel = () => emit('cancel')
</script>

<style scoped>
.dlg-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
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
  background: #b82e2e;
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
