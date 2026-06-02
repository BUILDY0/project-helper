<template>
  <!--
    通用按钮原子组件：所有按钮场景的标准实现
    - variant：视觉语义
        primary 主操作 / secondary 次操作 / danger 危险 / text 轻量文字 / icon 纯图标
    - tone：仅 text 变体生效，区分中性灰（default）与品牌色（primary）
    - size：xs(22) / sm(28) / md(32)，所有 variant 通用
    - inline：仅 text 变体生效。开启后高度自适应、padding 收窄，
        适用于嵌在标题/段落里的轻量动作按钮，不撑高父级
    - prefix / suffix 插槽：承载图标，避免上层为「图标+文字」重写按钮
    - loading：自动接管 disabled，前置位替换为 spinner（icon 变体下整体替换）
    - 业务定制：调用方传入 class 即可覆盖局部样式（推荐覆盖 width/height/background/color/hover）
  -->
  <button
    :type="type"
    :disabled="disabled || loading"
    class="base-btn"
    :class="[
      `base-btn--${variant}`,
      `base-btn--${size}`,
      {
        [`base-btn--text-${tone}`]: variant === 'text',
        'is-inline': inline,
        'is-loading': loading
      }
    ]"
  >
    <span v-if="loading" class="base-btn__spinner" aria-hidden="true" />
    <span v-else-if="$slots.prefix" class="base-btn__icon">
      <slot name="prefix" />
    </span>
    <span v-if="$slots.default" class="base-btn__label"><slot /></span>
    <span v-if="$slots.suffix" class="base-btn__icon">
      <slot name="suffix" />
    </span>
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'secondary',
    validator: (v) => ['primary', 'secondary', 'danger', 'text', 'icon'].includes(v)
  },
  /** text 变体专用：default=中性灰二级文字；primary=品牌色文字 */
  tone: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['xs', 'sm', 'md'].includes(v)
  },
  /** 行内嵌入模式（仅 text 变体语义有意义）：高度自适应 + 紧凑 padding，
   *  适用于"嵌在标题/段落里的轻量动作按钮"，不撑高父级 */
  inline: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** 默认 button，避免在 form 中误触发 submit */
  type: { type: String, default: 'button' }
})
</script>

<style>
.base-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-md);
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s,
    opacity 0.15s,
    transform 0.15s;
}
.base-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* ===== 尺寸（高度 + 内边距 + 字号） ===== */
.base-btn--md {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
}
.base-btn--sm {
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
}
.base-btn--xs {
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
}

/* inline：高度自适应行内文字 + 紧凑 padding。
 *  限定 text 变体生效，避免误用在 primary/icon 等会破坏视觉的 variant；
 *  组合选择器特异性 (0,3,0) 高于上方单 size 规则 (0,1,0)，确保覆盖 height/padding */
.base-btn--text.is-inline {
  height: auto;
  min-height: 22px;
  padding: 0 8px;
  font-size: 13px;
}

/* ===== variant：primary 实心主色 ===== */
.base-btn--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
}
.base-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

/* ===== variant：secondary 描边次按钮 ===== */
.base-btn--secondary {
  background: var(--color-surface);
  border-color: var(--color-border-strong);
  color: var(--color-text);
}
.base-btn--secondary:hover:not(:disabled) {
  background: var(--color-hover);
}

/* ===== variant：danger 实心危险 ===== */
.base-btn--danger {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: #fff;
}
.base-btn--danger:hover:not(:disabled) {
  background: var(--color-danger-hover);
  border-color: var(--color-danger-hover);
}

/* ===== variant：text 无边框文字（轻量场景） ===== */
.base-btn--text {
  background: transparent;
  border-color: transparent;
}
.base-btn--text-default {
  color: var(--color-text-secondary);
}
.base-btn--text-default:hover:not(:disabled) {
  background: var(--color-hover);
  color: var(--color-text);
}
.base-btn--text-primary {
  color: var(--color-primary);
}
.base-btn--text-primary:hover:not(:disabled) {
  background: var(--color-hover);
}

/* ===== variant：icon 纯图标方形按钮 ===== */
.base-btn--icon {
  background: transparent;
  border-color: transparent;
  color: var(--color-text-secondary);
  padding: 0;
  border-radius: var(--radius-sm);
  /* 方形：宽度跟随高度 */
  flex-shrink: 0;
}
.base-btn--icon.base-btn--md {
  width: 32px;
}
.base-btn--icon.base-btn--sm {
  width: 28px;
}
.base-btn--icon.base-btn--xs {
  width: 22px;
}
.base-btn--icon:hover:not(:disabled) {
  background: var(--color-hover);
  color: var(--color-text);
}

/* ===== 内部元素 ===== */
.base-btn__icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

/* loading 转圈：纯 CSS，currentColor 自适应各 variant 文字色 */
.base-btn__spinner {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  animation: base-btn-spin 0.7s linear infinite;
}
@keyframes base-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
