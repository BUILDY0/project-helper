<template>
  <div class="field-group">
    <div v-if="title" class="field-group__title">{{ title }}</div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' }
})
</script>

<style scoped>
.field-group {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.field-group__title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 12px 16px 0;
  margin-bottom: -4px;
}
</style>
