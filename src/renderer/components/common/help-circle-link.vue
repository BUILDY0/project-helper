<template>
  <button class="help-link" type="button" :aria-label="label" @click="onOpen">
    <span class="help-link__content">
      <component :is="iconComponent" :size="18" class="help-link__icon" />
      <span class="help-link__label">{{ label }}</span>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import IconGithub from '@/components/icons/icon-github.vue'
import IconDocs from '@/components/icons/icon-docs.vue'
import IconInfo from '@/components/icons/icon-info.vue'

const props = defineProps({
  label: { type: String, required: true },
  /** 外链 url；留空时点击触发 action 事件而非外链跳转 */
  url: { type: String, default: '' },
  /** 图标 key：'docs'(默认) / 'github' / 'info' */
  icon: { type: String, default: 'docs' }
})

const emit = defineEmits(['error', 'action'])

const ICON_MAP = {
  github: IconGithub,
  docs: IconDocs,
  info: IconInfo
}
const iconComponent = computed(() => ICON_MAP[props.icon] || IconDocs)

async function onOpen() {
  if (!props.url) {
    emit('action')
    return
  }
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
