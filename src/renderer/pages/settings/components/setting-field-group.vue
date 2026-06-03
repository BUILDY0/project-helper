<template>
  <div class="field-group">
    <slot />
  </div>
</template>

<script setup></script>

<style scoped>
.field-group {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
</style>
