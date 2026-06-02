<template>
  <Teleport to="body">
    <transition-group name="base-toast" tag="div" class="base-toast__wrap">
      <div v-for="t in toasts" :key="t.id" class="base-toast" :class="`base-toast--${t.type}`">
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

<style>
.base-toast__wrap {
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
.base-toast {
  background: var(--color-toast-bg);
  color: var(--color-toast-fg);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  box-shadow: var(--shadow-md);
}
/* info 是默认态，无 modifier */
.base-toast--success {
  background: var(--color-success);
  color: #fff;
}
.base-toast--error {
  background: var(--color-danger);
  color: #fff;
}

.base-toast-enter-active,
.base-toast-leave-active {
  transition: all 0.2s;
}
.base-toast-enter-from,
.base-toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
