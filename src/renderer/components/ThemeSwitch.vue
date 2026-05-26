<template>
  <!-- 纯展示主题切换 switch：图标轨道；副作用由 emit('change') 抛给上层 -->
  <button
    type="button"
    role="switch"
    :aria-checked="isDark"
    class="theme-switch"
    :class="[buttonClass, { 'is-dark': isDark }]"
    @click="onToggle"
  >
    <span class="theme-switch__track">
      <span class="theme-switch__thumb">
        <!-- 浅色：太阳 -->
        <svg
          v-if="!isDark"
          class="theme-switch__icon"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
        <!-- 深色：月亮 -->
        <svg
          v-else
          class="theme-switch__icon"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

/**
 * 主题切换 switch（纯展示）
 * - props.value：当前主题（'light' | 'dark'）
 * - props.buttonClass：透传到根 button，用于场景化追加（如 TopBanner 的 'no-drag'）
 * - emit('change', nextTheme)：点击时把切换后的目标主题抛给上层
 */
const props = defineProps({
  value: { type: String, default: 'light' },
  buttonClass: { type: String, default: '' }
})
const emit = defineEmits(['change'])

const isDark = computed(() => props.value === 'dark')

function onToggle() {
  emit('change', isDark.value ? 'light' : 'dark')
}
</script>

<style scoped>
.theme-switch {
  background: transparent;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.theme-switch__track {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  /* track 背景跟随主题：浅色主题下浅灰，深色主题下深灰；
     不使用 --color-primary，避免深色主题里 primary 是浅色反而让 track 变浅 */
  background: var(--color-hover);
  border: 1px solid var(--color-border-strong);
  transition:
    background 0.2s,
    border-color 0.2s;
  display: inline-block;
  flex-shrink: 0;
}
/* 激活态（is-dark）保持同主题色系，仅做轻微加深以体现"已开启" */
.theme-switch.is-dark .theme-switch__track {
  background: var(--color-border-strong);
  border-color: var(--color-border-strong);
}
.theme-switch__thumb {
  position: absolute;
  top: 50%;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  /* thumb 始终用表层色（浅色主题下为白，深色主题下为深表层），与 track 形成对比 */
  background: var(--color-surface);
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  box-shadow: var(--shadow-sm);
  transition:
    left 0.2s,
    background 0.2s,
    color 0.2s;
}
.theme-switch.is-dark .theme-switch__thumb {
  /* 滑到右侧：track 宽 40 - thumb 宽 18 - 左右各 2px = 20 */
  left: 20px;
  /* 月亮图标使用 accent 黄，强化夜间语义 */
  color: var(--color-accent);
}
.theme-switch__icon {
  display: block;
}
</style>
