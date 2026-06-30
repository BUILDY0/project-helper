<template>
  <!-- VSCode 风格项目类型切换侧边栏 -->
  <div class="type-bar">
    <BaseButton
      variant="icon"
      size="sm"
      class="type-btn"
      :class="{ active: modelValue === 'local' }"
      v-tooltip:right="'本地项目'"
      @click="emit('update:modelValue', 'local')"
    >
      <IconLocation :size="20" />
    </BaseButton>
    <BaseButton
      variant="icon"
      size="sm"
      class="type-btn"
      :class="{ active: modelValue === 'remote' }"
      v-tooltip:right="'远程连接项目'"
      @click="emit('update:modelValue', 'remote')"
    >
      <IconGlobe :size="20" />
    </BaseButton>
  </div>
</template>

<script setup>
import IconLocation from '@/components/icons/icon-location.vue'
import IconGlobe from '@/components/icons/icon-globe.vue'
import BaseButton from '@/components/common/base-button.vue'

defineProps({
  modelValue: { type: String, default: 'local' }
})
const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.type-bar {
  width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-surface-2);
  flex-shrink: 0;
}
.type-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  position: relative;
  transition:
    color 0.15s,
    background 0.15s;
}
.type-btn:hover:not(:disabled) {
  color: var(--color-accent);
  background: var(--color-hover);
}
.type-btn.active {
  color: var(--color-accent);
}
</style>
