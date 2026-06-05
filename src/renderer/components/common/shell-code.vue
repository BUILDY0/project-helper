<template>
  <div
    class="shell-code"
    :class="{ 'is-hovered': hovered }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <!-- 复制按钮：hover 时浮现，右上角 -->
    <button
      class="shell-code__copy-btn"
      :class="copied ? 'is-copied' : ''"
      v-tooltip="copied ? '已复制' : '复制'"
      @click="onCopy"
      aria-label="复制"
    >
      <IconCheck v-if="copied" :size="14" />
      <IconCopy v-else :size="14" />
    </button>

    <!-- 代码行列表 -->
    <div ref="bodyRef" class="shell-code__body">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, useTemplateRef } from 'vue'
import IconCopy from '@/components/icons/icon-copy.vue'
import IconCheck from '@/components/icons/icon-check.vue'

const hovered = ref(false)
const copied = ref(false)
const bodyRef = useTemplateRef('bodyRef')

let copyTimer = null

function onCopy() {
  if (!bodyRef.value) return
  // 收集所有 <code> 元素文本，多行换行拼接
  const lines = [...bodyRef.value.querySelectorAll('code')].map((el) => el.textContent ?? '')
  const text = lines.join('\n')
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 1800)
  })
}
</script>

<style scoped>
.shell-code {
  position: relative;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* ===== 复制按钮 ===== */
.shell-code__copy-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-hover);
  color: var(--color-text-secondary);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.15s,
    background 0.15s,
    color 0.15s;
  z-index: 1;
}
.shell-code__copy-btn:hover {
  background: var(--color-border-strong);
  color: var(--color-text);
}
.shell-code__copy-btn.is-copied {
  color: var(--color-success);
}
.is-hovered .shell-code__copy-btn {
  opacity: 1;
}

/* ===== 内容区：溢出滚动 ===== */
.shell-code__body {
  overflow-x: auto;
  overflow-y: auto;
  padding: 4px 0;
}

/* ===== 每行 <code> 的左右结构由全局样式处理 ===== */
</style>

<!-- 非 scoped：为插槽内的 <code> 注入行样式 -->
<style>
.shell-code__body code {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 5px 36px 5px 0;
  font-family: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 12.5px;
  color: var(--color-text);
  white-space: pre;
  line-height: 1.6;
  user-select: text;
  cursor: text;
}

/* 左侧 $ 标记：伪元素，不可选中 */
.shell-code__body code::before {
  content: '$';
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  width: 32px;
  padding-left: 12px;
  color: var(--color-text-tertiary);
  user-select: none;
  pointer-events: none;
  font-weight: 500;
}
</style>
