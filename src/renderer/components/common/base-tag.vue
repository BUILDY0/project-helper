<template>
  <!--
    通用标签原子组件：展示一个标签 chip。
    - hash：前置 # 标识（搜索语义场景）
    - closable：显示尾部移除 ×（emit close）
    - size：sm（卡片密集展示）/ md（表单）
    - clickable：作为可点击项时的指针/hover 反馈（点击由父级监听）
  -->
  <span class="base-tag" :class="[`base-tag--${size}`, { 'is-clickable': clickable }]">
    <span v-if="hash" class="base-tag__hash" aria-hidden="true">#</span>
    <span class="base-tag__label">{{ label }}</span>
    <span v-if="closable" class="base-tag__close" aria-label="移除" @click.stop="emit('close')">
      ×
    </span>
  </span>
</template>

<script setup>
defineProps({
  label: { type: [String, Number], default: '' },
  hash: { type: Boolean, default: false },
  closable: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  /** sm=20px / md=24px */
  size: { type: String, default: 'sm' }
})
const emit = defineEmits(['close'])
</script>

<style>
.base-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 140px;
  border-radius: var(--radius-sm);
  background: var(--color-hover);
  color: var(--color-text-secondary);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
.base-tag--sm {
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
}
.base-tag--md {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
}
.base-tag.is-clickable {
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.base-tag.is-clickable:hover {
  background: var(--color-border);
  color: var(--color-text);
}
.base-tag__hash {
  color: var(--color-text-tertiary);
}
.base-tag__label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.base-tag__close {
  flex-shrink: 0;
  margin-left: 2px;
  font-size: 13px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: color 0.12s;
}
.base-tag__close:hover {
  color: var(--color-text);
}
</style>
