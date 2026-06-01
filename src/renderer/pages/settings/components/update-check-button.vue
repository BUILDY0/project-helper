<template>
  <!-- 手动触发一次更新检查；点击后置灰 3 秒避免重复请求 -->
  <button
    class="update-check-btn"
    :class="{ 'is-spinning': checking }"
    :disabled="checking"
    type="button"
    v-tooltip="'立即检查更新'"
    aria-label="立即检查更新"
    @click="onClick"
  >
    <IconRefreshCw :size="16" />
  </button>
</template>

<script setup>
import { ref } from 'vue'
import IconRefreshCw from '@/components/icons/icon-refresh-cw.vue'

const props = defineProps({
  /** 当前应用版本号，用于在"已是最新"时回显 */
  currentVersion: { type: String, default: '' }
})
const emit = defineEmits(['result', 'error'])

const checking = ref(false)

async function onClick() {
  if (checking.value) return
  checking.value = true
  setTimeout(() => {
    checking.value = false
  }, 3000)
  try {
    const r = await window.api.checkForUpdates?.()
    if (!r?.ok) {
      emit('error', r?.message || '检查更新失败')
      return
    }
    const isLatest = r.version && props.currentVersion && r.version === props.currentVersion
    emit('result', { latest: !!isLatest, version: r.version || '' })
  } catch (err) {
    emit('error', err.message || '检查更新失败')
  }
}
</script>

<style scoped>
.update-check-btn {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  padding: 0;
  /* 用负 margin 不撑开行盒；左侧抵消 .inline-toggle 的 gap，紧贴文字 */
  margin: -2px;
  cursor: pointer;
  line-height: 1;
  transition:
    background 0.15s,
    color 0.15s;
}
.update-check-btn svg {
  display: block;
}
.update-check-btn:hover:not(:disabled) {
  background: var(--color-hover);
  color: var(--color-text);
}
.update-check-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.update-check-btn.is-spinning :deep(svg) {
  animation: update-spin 1s linear infinite;
}
@keyframes update-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
