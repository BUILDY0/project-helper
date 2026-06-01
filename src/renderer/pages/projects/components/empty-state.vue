<template>
  <!-- 通用空态 / 占位 / 加载提示；三个字段全空时回退到默认 slot 渲染单行文本 -->
  <div class="empty-state">
    <div v-if="emoji" class="emoji">{{ emoji }}</div>
    <div v-if="title" class="title">{{ title }}</div>
    <div v-if="tip" class="tip">{{ tip }}</div>
    <slot v-if="!emoji && !title && !tip" />
  </div>
</template>

<script setup>
defineProps({
  emoji: { type: String, default: '' },
  title: { type: String, default: '' },
  tip: { type: String, default: '' }
})
</script>

<style scoped>
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  gap: 8px;
}
.emoji {
  font-size: 40px;
}
.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}
.tip {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
