<template>
  <!-- 设置页通用配置项卡片：标签 + 可选 #actions 操作区 + 默认 slot 主体 -->
  <div class="field">
    <div class="label">
      <span>{{ label }}</span>
      <div v-if="$slots.actions" class="label-actions">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true }
})
</script>

<style scoped>
.field {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
}
.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.label-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
