<template>
  <Teleport to="body">
    <transition name="about-fade">
      <div v-if="visible" class="about-mask" @click.self="emit('close')">
        <div class="about-dialog" role="dialog" aria-modal="true" aria-label="关于 ProjectHelper">
          <div class="about-header">
            <div class="about-logo">
              <IconInfo :size="16" />
            </div>
            <span class="about-app-name">ProjectHelper</span>
          </div>

          <div class="about-body">
            <template v-if="info">
              <div v-for="row in rows" :key="row.label" class="about-row">
                <span class="about-key">{{ row.label }}:</span>
                <span class="about-val">{{ row.value }}</span>
              </div>
            </template>
            <span v-else class="about-loading">加载中…</span>
          </div>

          <div class="about-actions">
            <BaseButton @click="onCopy">复制</BaseButton>
            <BaseButton variant="primary" @click="emit('close')">确定</BaseButton>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseButton from '@/components/common/base-button.vue'
import IconInfo from '@/components/icons/icon-info.vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close', 'copy-success', 'copy-error'])

const info = ref(null)

watch(
  () => props.visible,
  async (val) => {
    if (!val || info.value) return
    try {
      info.value = await window.api.getAppInfo?.()
    } catch {
      info.value = null
    }
  },
  { immediate: true }
)

const rows = computed(() => {
  if (!info.value) return []
  return [
    { label: 'Version', value: info.value.version },
    { label: 'Electron', value: info.value.electron },
    { label: 'Chromium', value: info.value.chrome },
    { label: 'Node.js', value: info.value.node },
    { label: 'V8', value: info.value.v8 },
    { label: 'OS', value: info.value.os }
  ]
})

async function onCopy() {
  if (!info.value) return
  const text = ['ProjectHelper', '', ...rows.value.map((r) => `${r.label}: ${r.value}`)].join('\n')
  const r = await window.api.copyText?.(text)
  if (r?.ok === false) emit('copy-error', r.message)
  else emit('copy-success')
}
</script>

<style scoped>
.about-mask {
  position: fixed;
  inset: 0;
  background: var(--color-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.about-dialog {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 24px 24px 16px;
  width: 400px;
  position: relative;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.about-logo {
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.about-app-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 0.01em;
  line-height: 1;
}

.about-body {
  font-size: 13px;
  line-height: 1.9;
  margin-bottom: 20px;
  color: var(--color-text-secondary);
}

.about-row {
  display: flex;
  gap: 6px;
}

.about-key {
  color: var(--color-text);
  min-width: 120px;
  flex-shrink: 0;
}

.about-val {
  color: var(--color-text-secondary);
  word-break: break-all;
}

.about-loading {
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.about-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.about-fade-enter-active,
.about-fade-leave-active {
  transition: opacity 0.15s;
}
.about-fade-enter-from,
.about-fade-leave-to {
  opacity: 0;
}
</style>
