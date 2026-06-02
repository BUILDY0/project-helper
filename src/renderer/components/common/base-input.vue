<template>
  <div
    class="base-input"
    :class="[`base-input--${size}`, { 'is-readonly': readonly, 'is-disabled': disabled }]"
  >
    <span v-if="$slots.prefix" class="base-input__prefix">
      <slot name="prefix" />
    </span>
    <input
      ref="inputRef"
      class="base-input__field"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :readonly="readonly"
      :disabled="disabled"
      :spellcheck="spellcheck"
      @input="emit('update:modelValue', $event.target.value)"
      @keyup.enter="emit('enter')"
    />
    <button
      v-if="clearable && modelValue && !readonly && !disabled"
      class="base-input__clear"
      v-tooltip="'清空'"
      @click="onClear"
    >
      ×
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** 显示尾部清空按钮（仅在有值且非只读/禁用时出现） */
  clearable: { type: Boolean, default: false },
  spellcheck: { type: Boolean, default: false },
  /** sm=30px（紧凑，工具栏）/ md=32px（默认，表单与弹窗） */
  size: { type: String, default: 'md' }
})
const emit = defineEmits(['update:modelValue', 'enter'])

const inputRef = ref(null)

function onClear() {
  emit('update:modelValue', '')
  inputRef.value?.focus()
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  select: () => inputRef.value?.select()
})
</script>

<style>
.base-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 0 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.base-input--sm {
  height: 30px;
}
.base-input--md {
  height: 32px;
}
.base-input:focus-within {
  border-color: var(--color-primary);
}
.base-input.is-readonly {
  background: var(--color-surface-2);
}
/* 只读 / 禁用态不响应 focus 高亮 */
.base-input.is-readonly:focus-within,
.base-input.is-disabled:focus-within {
  border-color: var(--color-border-strong);
}
.base-input.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-input__prefix {
  display: inline-flex;
  align-items: center;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.base-input__field {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-text);
  user-select: text;
}
.base-input__field::placeholder {
  color: var(--color-text-tertiary);
}
.base-input__field:disabled {
  cursor: not-allowed;
}

.base-input__clear {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 14px;
  line-height: 1;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.base-input__clear:hover {
  background: var(--color-hover);
  color: var(--color-text);
}
</style>
