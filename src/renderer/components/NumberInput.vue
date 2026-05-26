<template>
  <div class="num-input">
    <button class="step" :disabled="disabledMinus" @click="onMinus">−</button>
    <input class="num-field" type="text" :value="modelValue" @input="onInput" @blur="onBlur" />
    <button class="step" :disabled="disabledPlus" @click="onPlus">+</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 }
})
const emit = defineEmits(['update:modelValue'])

const disabledMinus = computed(() => props.modelValue <= props.min)
const disabledPlus = computed(() => props.modelValue >= props.max)

function clamp(v) {
  if (Number.isNaN(v)) return props.min
  return Math.min(props.max, Math.max(props.min, v))
}

function onMinus() {
  emit('update:modelValue', clamp(props.modelValue - props.step))
}
function onPlus() {
  emit('update:modelValue', clamp(props.modelValue + props.step))
}
function onInput(e) {
  // 仅允许数字
  const raw = e.target.value.replace(/[^\d]/g, '')
  if (raw === '') return
  emit('update:modelValue', clamp(parseInt(raw, 10)))
}
function onBlur(e) {
  if (e.target.value === '') emit('update:modelValue', props.min)
}
</script>

<style scoped>
.num-input {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface);
  height: 32px;
}
.step {
  width: 30px;
  height: 100%;
  border: none;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  transition: background 0.15s;
}
.step:hover:not(:disabled) {
  background: var(--color-hover);
}
.step:disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}
.num-field {
  width: 50px;
  height: 100%;
  border: none;
  border-left: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  text-align: center;
  font-size: 13px;
  color: var(--color-text);
  outline: none;
  background: var(--color-surface);
  user-select: text;
}
</style>
