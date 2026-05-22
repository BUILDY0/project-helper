<template>
  <!-- 整个 banner 默认作为拖拽区，内部交互元素再单独标记 no-drag -->
  <header class="banner">
    <!-- 左侧应用名（拖拽区的一部分） -->
    <div class="banner-left">
      <img class="logo" :src="folderIcon" alt="logo" draggable="false" />
      <span class="title">Project Helper</span>
    </div>

    <!-- 中部 tab：按钮本身 no-drag，但两侧空白区域仍可拖动 -->
    <nav class="banner-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn no-drag"
        :class="{ active: activeTab === tab.key }"
        @click="$emit('update:activeTab', tab.key)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- 右侧窗口控制：按钮 no-drag -->
    <div class="banner-right">
      <button class="win-btn no-drag" title="最小化" @click="onMinimize">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
        </svg>
      </button>
      <button class="win-btn no-drag" title="最大化" @click="onToggleMax">
        <svg v-if="!isMax" width="12" height="12" viewBox="0 0 12 12">
          <rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" />
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect x="2.5" y="3.5" width="6" height="6" fill="none" stroke="currentColor" />
          <rect x="3.5" y="2.5" width="6" height="6" fill="none" stroke="currentColor" />
        </svg>
      </button>
      <button class="win-btn close no-drag" title="关闭" @click="onClose">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" stroke-width="1.2" />
          <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import folderIcon from '../assets/folder.png'

defineProps({
  activeTab: { type: String, required: true }
})
defineEmits(['update:activeTab'])

const tabs = [
  { key: 'projects', label: '项目' },
  { key: 'settings', label: '配置' }
]

const isMax = ref(false)
let unsubscribe = null

// 窗口最大化状态变化时同步图标
onMounted(() => {
  unsubscribe = window.api.onMaximizeChange((val) => (isMax.value = val))
})
onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe()
})

// 窗口控制操作
const onMinimize = () => window.api.minimize()
const onToggleMax = async () => {
  const v = await window.api.toggleMaximize()
  isMax.value = !!v
}
const onClose = () => window.api.close()
</script>

<style scoped>
.banner {
  height: var(--banner-h);
  display: flex;
  align-items: center;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding-left: 14px;
  flex-shrink: 0;
  /* 整个 banner 默认作为窗口拖拽区 */
  -webkit-app-region: drag;
  app-region: drag;
}

/* 任何带 no-drag 的元素都需要排除拖拽区域，按钮才能正常点击 */
.no-drag {
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 16px;
  height: 100%;
}
.logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}
.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 0.2px;
}

.banner-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  flex: 1;
}
.tab-btn {
  border: none;
  background: transparent;
  height: 28px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 13px;
  transition: background 0.15s, color 0.15s;
}
.tab-btn:hover {
  background: var(--color-hover);
  color: var(--color-text);
}
.tab-btn.active {
  background: var(--color-primary);
  color: #fff;
}

.banner-right {
  display: flex;
  align-items: center;
  height: 100%;
}
.win-btn {
  width: 44px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.win-btn:hover {
  background: var(--color-hover);
  color: var(--color-text);
}
.win-btn.close:hover {
  background: var(--color-danger);
  color: #fff;
}
</style>
