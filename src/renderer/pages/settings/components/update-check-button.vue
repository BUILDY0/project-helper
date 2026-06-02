<template>
  <!-- 手动触发一次更新检查；点击后置灰 3 秒避免重复请求 -->
  <BaseButton
    variant="icon"
    size="xs"
    :disabled="checking"
    v-tooltip="'立即检查更新'"
    aria-label="立即检查更新"
    @click="onClick"
  >
    <IconRefreshCw :size="16" :class="{ 'is-spinning': checking }" />
  </BaseButton>
</template>

<script setup>
import { ref } from 'vue'
import IconRefreshCw from '@/components/icons/icon-refresh-cw.vue'
import BaseButton from '@/components/common/base-button.vue'

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
/* 检查中：图标本体原地自旋（业务语义"刷新中"，区别于 BaseButton 的 spinner 圆环 loading） */
.is-spinning {
  animation: update-check-spin 1s linear infinite;
}
@keyframes update-check-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
