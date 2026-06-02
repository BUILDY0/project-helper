<template>
  <Teleport to="body">
    <transition name="slide">
      <div v-if="visible" class="update-banner" :class="status">
        <div class="msg">{{ message }}</div>
        <div v-if="status === 'downloading'" class="progress">
          <div class="bar" :style="{ width: percent + '%' }"></div>
        </div>
        <div class="actions">
          <BaseButton v-if="status === 'available'" variant="primary" size="sm" @click="onDownload">
            下载
          </BaseButton>
          <BaseButton v-if="status === 'downloaded'" variant="primary" size="sm" @click="onInstall">
            重启安装
          </BaseButton>
          <BaseButton
            v-if="showChangelog"
            variant="text"
            tone="primary"
            size="sm"
            @click="onViewChangelog"
          >
            新改动！
          </BaseButton>
          <BaseButton size="sm" @click="visible = false">关闭</BaseButton>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import BaseButton from '@/components/common/base-button.vue'

// 当前更新状态：available / downloading / downloaded / error
const status = ref('')
const message = ref('')
const percent = ref(0)
const visible = ref(false)

// 仅在有"新版本"语境时展示更新日志入口（error / 空状态不展示）
const showChangelog = computed(() =>
  ['available', 'downloading', 'downloaded'].includes(status.value)
)

let unsubscribe = null

/** 接收主进程推送的状态变化 */
function onStatus({ status: s, payload }) {
  status.value = s
  switch (s) {
    case 'available':
      message.value = `发现新版本 v${payload?.version}，是否下载？`
      percent.value = 0
      visible.value = true
      break
    case 'downloading':
      // 防止 NaN 显示
      percent.value = Math.round(payload?.percent || 0)
      message.value = `正在下载更新 ${percent.value}%`
      visible.value = true
      break
    case 'downloaded':
      message.value = `新版本 v${payload?.version} 已下载，重启后生效`
      visible.value = true
      break
    case 'error':
      message.value = `更新失败：${payload?.message || '未知错误'}`
      visible.value = true
      // 错误提示 5 秒后自动关闭
      setTimeout(() => {
        if (status.value === 'error') visible.value = false
      }, 5000)
      break
    default:
      // checking / not-available 不打扰用户
      break
  }
}

async function onDownload() {
  status.value = 'downloading'
  message.value = '正在准备下载...'
  await window.api.downloadUpdate()
}

async function onInstall() {
  await window.api.quitAndInstall()
}

// 打开更新日志页面
async function onViewChangelog() {
  await window.api.openExternal('https://buildy0.github.io/project-helper/changelog')
}

onMounted(() => {
  unsubscribe = window.api.onUpdaterStatus?.(onStatus)
})
onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe()
})
</script>

<style scoped>
.update-banner {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 320px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 14px 16px;
  z-index: 1300;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.update-banner.error {
  border-color: var(--color-danger);
}
.msg {
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.5;
}
.progress {
  height: 4px;
  background: var(--color-hover);
  border-radius: 2px;
  overflow: hidden;
}
.bar {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.2s;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.slide-enter-active,
.slide-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
