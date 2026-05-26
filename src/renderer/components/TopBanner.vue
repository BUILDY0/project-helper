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
        <!-- terminal：来自 VSCode codicons - terminal (CC BY 4.0) -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M18.75 1.5H5.25C3.1815 1.5 1.5 3.183 1.5 5.25V18.75C1.5 20.8185 3.1815 22.5 5.25 22.5H18.75C20.8185 22.5 22.5 20.8185 22.5 18.75V5.25C22.5 3.183 20.8185 1.5 18.75 1.5ZM21 18.75C21 19.9905 19.9905 21 18.75 21H5.25C4.0095 21 3 19.9905 3 18.75V5.25C3 4.0095 4.0095 3 5.25 3H18.75C19.9905 3 21 4.0095 21 5.25V18.75ZM10.281 13.281L5.781 17.781C5.634 17.928 5.442 18 5.25 18C5.058 18 4.866 17.9265 4.719 17.781C4.4265 17.4885 4.4265 17.013 4.719 16.7205L8.688 12.7515L4.719 8.7825C4.4265 8.49 4.4265 8.0145 4.719 7.722C5.0115 7.4295 5.487 7.4295 5.7795 7.722L10.2795 12.222C10.572 12.5145 10.572 12.99 10.2795 13.2825L10.281 13.281ZM19.5 17.25C19.5 17.664 19.164 18 18.75 18H11.25C10.836 18 10.5 17.664 10.5 17.25C10.5 16.836 10.836 16.5 11.25 16.5H18.75C19.164 16.5 19.5 16.836 19.5 17.25Z"
          />
        </svg>
      </button>
      <button class="win-btn no-drag" v-tooltip:bottom="'最小化'" @click="onMinimize">
        <!-- chrome-minimize：圆角端点的细横线 -->
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M3 7.5C3 7.22386 3.22386 7 3.5 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.5C3.22386 8 3 7.77614 3 7.5Z"
          />
        </svg>
      </button>
      <button class="win-btn no-drag" v-tooltip:bottom="'最大化'" @click="onToggleMax">
        <!-- chrome-maximize：圆角空心方框 -->
        <svg v-if="!isMax" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M2 4.5C2 3.11929 3.11929 2 4.5 2H11.5C12.8807 2 14 3.11929 14 4.5V11.5C14 12.8807 12.8807 14 11.5 14H4.5C3.11929 14 2 12.8807 2 11.5V4.5ZM4.5 3C3.67157 3 3 3.67157 3 4.5V11.5C3 12.3284 3.67157 13 4.5 13H11.5C12.3284 13 13 12.3284 13 11.5V4.5C13 3.67157 12.3284 3 11.5 3H4.5Z"
          />
        </svg>
        <!-- chrome-restore：双圆角错位窗口 -->
        <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M5.08496 4C5.29088 3.4174 5.8465 3 6.49961 3H9.99961C11.6565 3 12.9996 4.34315 12.9996 6V9.5C12.9996 10.1531 12.5822 10.7087 11.9996 10.9146V6C11.9996 4.89543 11.1042 4 9.99961 4H5.08496ZM4.5 5H9.5C10.3284 5 11 5.67157 11 6.5V11.5C11 12.3284 10.3284 13 9.5 13H4.5C3.67157 13 3 12.3284 3 11.5V6.5C3 5.67157 3.67157 5 4.5 5ZM4.5 6C4.22386 6 4 6.22386 4 6.5V11.5C4 11.7761 4.22386 12 4.5 12H9.5C9.77614 12 10 11.7761 10 11.5V6.5C10 6.22386 9.77614 6 9.5 6H4.5Z"
          />
        </svg>
      </button>
      <button class="win-btn close no-drag" v-tooltip:bottom="'关闭'" @click="onClose">
        <!-- chrome-close：圆角端点的 X -->
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M2.58859 2.71569L2.64645 2.64645C2.82001 2.47288 3.08944 2.4536 3.28431 2.58859L3.35355 2.64645L8 7.293L12.6464 2.64645C12.8417 2.45118 13.1583 2.45118 13.3536 2.64645C13.5488 2.84171 13.5488 3.15829 13.3536 3.35355L8.707 8L13.3536 12.6464C13.5271 12.82 13.5464 13.0894 13.4114 13.2843L13.3536 13.3536C13.18 13.5271 12.9106 13.5464 12.7157 13.4114L12.6464 13.3536L8 8.707L3.35355 13.3536C3.15829 13.5488 2.84171 13.5488 2.64645 13.3536C2.45118 13.1583 2.45118 12.8417 2.64645 12.6464L7.293 8L2.64645 3.35355C2.47288 3.17999 2.4536 2.91056 2.58859 2.71569L2.64645 2.64645L2.58859 2.71569Z"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import folderIcon from '@/assets/folder.png'
import { useTheme } from '@/composables/useTheme.js'
import ThemeSwitch from './ThemeSwitch.vue'

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
.tab-btn {
  border: none;
  background: transparent;
  height: 28px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 13px;
  transition:
    background 0.15s,
    color 0.15s;
}
.tab-btn:hover {
  background: var(--color-hover);
  color: var(--color-text);
}
.tab-btn.active {
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
