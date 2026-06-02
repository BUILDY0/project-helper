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
      <BaseButton
        v-for="tab in tabs"
        :key="tab.key"
        variant="text"
        size="sm"
        class="tab-btn no-drag"
        :class="{ active: activeTab === tab.key }"
        @click="$emit('update:activeTab', tab.key)"
      >
        {{ tab.label }}
      </BaseButton>
    </nav>

    <!-- 右侧窗口控制：按钮 no-drag。
         图标统一使用 VSCode codicons (CC BY 4.0) 的 chrome-* 系列，圆角 Fluent 风格 -->
    <div class="banner-right">
      <!-- 主题切换：复用公共 ThemeSwitch 组件，change 时立即写盘 -->
      <ThemeSwitch
        :value="currentTheme"
        button-class="no-drag"
        v-tooltip:bottom="isDark ? '切换到浅色主题' : '切换到深色主题'"
        @change="setTheme"
      />

      <!-- 仅开发环境显示：打开 / 关闭 DevTools -->
      <button
        v-if="isDev"
        class="win-btn no-drag"
        v-tooltip:bottom="'打开/关闭控制台 (DevTools)'"
        @click="onToggleDevTools"
      >
        <IconTerminal :size="16" />
      </button>
      <button class="win-btn no-drag" v-tooltip:bottom="'最小化'" @click="onMinimize">
        <IconMinimize :size="16" />
      </button>
      <button class="win-btn no-drag" v-tooltip:bottom="'最大化'" @click="onToggleMax">
        <IconMaximize v-if="!isMax" :size="16" />
        <IconRestore v-else :size="16" />
      </button>
      <button class="win-btn close no-drag" v-tooltip:bottom="'关闭'" @click="onClose">
        <IconClose :size="16" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import folderIcon from '@resources/icon.png'
import { useTheme } from '@/composables/use-theme.js'
import BaseButton from '@/components/common/base-button.vue'
import ThemeSwitch from '@/components/common/theme-switch.vue'
import IconTerminal from '@/components/icons/icon-terminal.vue'
import IconMinimize from '@/components/icons/icon-minimize.vue'
import IconMaximize from '@/components/icons/icon-maximize.vue'
import IconRestore from '@/components/icons/icon-restore.vue'
import IconClose from '@/components/icons/icon-close.vue'

defineProps({
  activeTab: { type: String, required: true }
})
defineEmits(['update:activeTab'])

const tabs = [
  { key: 'projects', label: '项目' },
  { key: 'settings', label: '配置' }
]

// 主题：currentTheme 与全局单例同步；setTheme 在 ThemeSwitch change 时直接写盘
const { currentTheme, setTheme } = useTheme()
const isDark = computed(() => currentTheme.value === 'dark')

const isMax = ref(false)
// 是否处于开发环境：决定是否渲染 console 按钮；初始 false，挂载后异步取主进程值
const isDev = ref(false)
let unsubscribe = null

// 窗口最大化状态变化时同步图标
onMounted(() => {
  unsubscribe = window.api.onMaximizeChange((val) => (isMax.value = val))
  // 异步查询是否 dev 环境，仅 dev 下显示 console 按钮
  window.api
    .isDev?.()
    .then((v) => {
      isDev.value = !!v
    })
    .catch(() => {})
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

// 开发模式：切换 DevTools 显示
const onToggleDevTools = () => window.api.toggleDevTools?.()
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
  width: 24px;
  height: 24px;
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
/* tab：text 变体 + sm 已锁定 28px 高度，仅在 active 态切到主色 */
.tab-btn {
  color: var(--color-text-secondary);
}
.tab-btn.active,
.tab-btn.active:hover:not(:disabled) {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.banner-right {
  display: flex;
  align-items: center;
  height: 100%;
  /* 左侧主题 switch 与窗口控制按钮拉开间距 */
  gap: 8px;
  /* 右端不要额外 padding，由 win-btn 自身宽度决定贴边效果 */
  padding-left: 8px;
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
  transition:
    background 0.15s,
    color 0.15s;
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
