<template>
  <button class="help-link" type="button" :aria-label="label" @click="onOpen">
    <span class="help-link__content">
      <!-- 图标风格参考 VSCode codicons (CC BY 4.0)，统一使用 currentColor 适配主题 -->
      <svg
        v-if="icon === 'github'"
        class="help-link__icon"
        width="18"
        height="18"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M8 0C3.58 0 0 3.64 0 8.13c0 3.59 2.29 6.63 5.47 7.71.4.07.55-.18.55-.39 0-.19-.01-.83-.01-1.51-2.01.38-2.53-.5-2.69-.96-.09-.23-.48-.96-.82-1.16-.28-.15-.68-.52-.01-.53.63-.01 1.08.59 1.23.83.72 1.23 1.87.88 2.33.67.07-.53.28-.88.51-1.08-1.78-.21-3.64-.91-3.64-4.02 0-.89.31-1.62.82-2.19-.08-.2-.36-1.04.08-2.16 0 0 .67-.22 2.2.84A7.45 7.45 0 0 1 8 3.91c.68 0 1.36.09 2 .27 1.53-1.06 2.2-.84 2.2-.84.44 1.12.16 1.96.08 2.16.51.57.82 1.3.82 2.19 0 3.12-1.87 3.81-3.65 4.02.29.25.54.74.54 1.5 0 1.08-.01 1.95-.01 2.22 0 .21.15.47.55.39A8.04 8.04 0 0 0 16 8.13C16 3.64 12.42 0 8 0Z"
        />
      </svg>
      <svg
        v-else
        class="help-link__icon"
        width="18"
        height="18"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h8.75a.75.75 0 0 0 0-1.5H3.5a.5.5 0 0 1 0-1h8.75A.75.75 0 0 0 13 10.75V2.75A.75.75 0 0 0 12.25 2H3.5Zm0 1.5h8v6.5h-8V3.5Zm1.25 1.25A.75.75 0 0 1 5.5 4h4.75a.75.75 0 0 1 0 1.5H5.5a.75.75 0 0 1-.75-.75Zm0 2A.75.75 0 0 1 5.5 6h3.25a.75.75 0 0 1 0 1.5H5.5a.75.75 0 0 1-.75-.75Z"
        />
      </svg>
      <span class="help-link__label">{{ label }}</span>
    </span>
  </button>
</template>

<script setup>
const props = defineProps({
  label: { type: String, required: true },
  url: { type: String, required: true },
  icon: { type: String, default: 'docs' }
})

const emit = defineEmits(['error'])

async function onOpen() {
  const r = await window.api.openExternal(props.url)
  if (!r?.ok) emit('error', r?.message || '打开链接失败')
}
</script>

<style scoped>
.help-link {
  position: relative;
  width: 72px;
  height: 72px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    color 0.18s,
    transform 0.18s;
}
.help-link::before {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: var(--color-surface-2);
  transition:
    background 0.18s,
    box-shadow 0.18s;
}
.help-link::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--color-border) 0%, transparent) 0deg,
    color-mix(in srgb, var(--color-border) 100%, transparent) 90deg,
    color-mix(in srgb, var(--color-border) 100%, transparent) 360deg
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 1px), #000 0);
  mask: radial-gradient(farthest-side, transparent calc(100% - 1px), #000 0);
  transition:
    background 0.18s,
    transform 0.18s;
}
.help-link__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  height: 100%;
  text-align: center;
}
.help-link__icon {
  display: block;
}
.help-link__label {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.help-link:hover {
  color: var(--color-text);
  transform: translateY(-1px);
}
.help-link:hover::before {
  background: var(--color-hover);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-border) 18%, transparent);
}
.help-link:hover::after {
  background: conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--color-border) 0%, transparent) 0deg,
    color-mix(in srgb, var(--color-border) 100%, transparent) 90deg,
    color-mix(in srgb, var(--color-border) 100%, transparent) 360deg
  );
  transform: rotate(18deg);
}
.help-link:active {
  transform: translateY(0) scale(0.98);
}
.help-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
</style>
