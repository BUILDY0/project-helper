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
    <!-- refresh 图标：单段 C 形圆弧 + 顺时针箭头，与旋转动画方向一致 -->
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.74 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
        fill="currentColor"
      />
    </svg>
  </button>
</template>

<script setup>
import { ref } from 'vue'

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
.update-check-btn.is-spinning svg {
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
