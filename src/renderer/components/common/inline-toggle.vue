<template>
  <!-- 标题区行内 toggle：switch + 文字标签 + 可选 #action 插槽 -->
  <span class="inline-toggle" :class="modifierClass">
    <SwitchInput
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
import SwitchInput from '@/components/common/switch-input.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, required: true },
  tip: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
  /** 业务侧的 BEM modifier hook，例如 'inline-toggle--auto-run' */
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
  font-size: 12px;
  font-weight: 400;
  align-self: flex-end;
}
.inline-toggle__label {
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}
.inline-toggle__label:hover {
  color: var(--color-text);
}
</style>
