<template>
  <!--
    通用 Switch 组件
    - v-model：boolean
    - size：'sm' | 'md'，默认 'md'（与 ThemeSwitch 视觉一致：40×22）；'sm' 紧凑版（30×16）
    - tone：'primary' | 'danger'，默认 'primary'，控制开启态颜色
    - disabled：禁用
    - aria-label：传透到 button，便于无障碍
    主题切换 ThemeSwitch 含图标语义，单独保留；其它 boolean 开关一律使用本组件。
  -->
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="ariaLabel || undefined"
    :disabled="disabled"
    class="ui-switch"
    :class="[`is-${size}`, `tone-${tone}`, { 'is-on': modelValue, 'is-disabled': disabled }]"
    @click="onToggle"
  >
    <span class="ui-switch__track">
      <span class="ui-switch__thumb"></span>
    </span>
  </button>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v)
  },
  tone: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'danger'].includes(v)
  },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'change'])

function onToggle() {
  if (props.disabled) return
  const next = !props.modelValue
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<style scoped>
.ui-switch {
  background: transparent;
  border: none;
  padding: 0;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.ui-switch.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.ui-switch__track {
  position: relative;
  border-radius: 999px;
  background: var(--color-hover);
  border: 1px solid var(--color-border-strong);
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
  display: inline-block;
  flex-shrink: 0;
}
.ui-switch__thumb {
  position: absolute;
  top: 50%;
  border-radius: 50%;
  background: var(--color-surface);
  transform: translateY(-50%);
  box-shadow: var(--shadow-sm);
  transition:
    left 0.2s,
    background 0.2s;
}

/* ===== 尺寸 ===== */
/* md：默认尺寸，与 ThemeSwitch 一致 (40×22, thumb 18, 左右 2 边距，行程 20) */
.ui-switch.is-md .ui-switch__track {
  width: 40px;
  height: 22px;
}
.ui-switch.is-md .ui-switch__thumb {
  left: 2px;
  width: 18px;
  height: 18px;
}
.ui-switch.is-md.is-on .ui-switch__thumb {
  left: 20px;
}

/* sm：紧凑版 (30×16, thumb 12, 左右 1 边距，行程 16) */
.ui-switch.is-sm .ui-switch__track {
  width: 30px;
  height: 16px;
}
.ui-switch.is-sm .ui-switch__thumb {
  left: 1px;
  width: 12px;
  height: 12px;
}
.ui-switch.is-sm.is-on .ui-switch__thumb {
  left: 16px;
}

/* ===== tone ===== */
.ui-switch.tone-primary.is-on .ui-switch__track {
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.ui-switch.tone-primary.is-on .ui-switch__thumb {
  background: var(--color-text-on-primary, #fff);
}
.ui-switch.tone-danger.is-on .ui-switch__track {
  background: var(--color-danger);
  border-color: var(--color-danger);
}
.ui-switch.tone-danger.is-on .ui-switch__thumb {
  background: #fff;
}

/* ===== focus ===== */
.ui-switch:focus-visible {
  outline: none;
}
.ui-switch.tone-primary:focus-visible .ui-switch__track {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 24%, transparent);
}
.ui-switch.tone-danger:focus-visible .ui-switch__track {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 24%, transparent);
}
</style>
