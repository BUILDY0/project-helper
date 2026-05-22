<template>
  <Teleport to="body">
    <transition-group name="toast" tag="div" class="toast-wrap">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">
        {{ t.text }}
      </div>
    </transition-group>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let seed = 0

// 暴露给父组件调用
function show(text, type = 'info', duration = 2200) {
  const id = ++seed
  toasts.value.push({ id, text, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, duration)
}

defineExpose({ show })
</script>

<style scoped>
.toast-wrap {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1200;
  pointer-events: none;
}
.toast {
  background: rgba(40, 40, 40, 0.92);
  color: #fff;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  box-shadow: var(--shadow-md);
}
.toast.success {
  background: #2c7a4b;
}
.toast.error {
  background: var(--color-danger);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
