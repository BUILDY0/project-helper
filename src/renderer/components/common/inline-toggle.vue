<template>
  <!-- 标题区行内 toggle：switch + 文字标签 + 可选 #action 插槽 -->
  <span class="inline-toggle" :class="modifierClass">
    <BaseSwitch
      :model-value="modelValue"
      size="sm"
      :aria-label="ariaLabel || label"
      @update:model-value="(v) => emit('update:modelValue', v)"
    />
    <span class="inline-toggle__label" v-tooltip="tip" @click="onLabelClick">
      {{ label }}
    </span>
    <slot name="action" />
  </span>
</template>

<script setup>
import BaseSwitch from '@/components/common/base-switch.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, required: true },
  tip: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
  modifierClass: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

function onLabelClick() {
  emit('update:modelValue', !props.modelValue)
}
</script>

<style scoped>
.inline-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 20px;
  height: 16px;
  font-size: 12px;
  font-weight: 400;
}
.inline-toggle__label {
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
  margin-bottom: 2px;
}
.inline-toggle__label:hover {
  color: var(--color-text);
}
</style>
