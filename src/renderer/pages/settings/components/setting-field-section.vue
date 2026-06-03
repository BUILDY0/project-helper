<template>
  <div class="field-section">
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
.field-section {
  padding: 14px 16px;
}
.field-section + .field-section {
  border-top: 1px solid var(--color-border);
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
