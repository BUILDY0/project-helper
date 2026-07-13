<template>
  <Teleport to="body">
    <transition name="copy-overlay-fade">
      <div v-if="visible" class="copy-overlay">
        <div class="copy-overlay__head">
          <span class="copy-overlay__title">
            {{ done ? '复制项目完成' : '正在复制项目' }}
          </span>
          <BaseButton
            v-if="!done"
            variant="text"
            size="xs"
            tone="default"
            class="copy-overlay__cancel"
            @click="emit('cancel')"
          >
            取消
          </BaseButton>
        </div>

        <div class="copy-overlay__repo" v-tooltip="source">{{ source }}</div>

        <template v-if="!done">
          <div class="copy-overlay__bar">
            <div class="copy-overlay__bar-fill" :style="{ width: `${percent}%` }" />
          </div>
          <div class="copy-overlay__meta">
            <span>复制文件中</span>
            <span>{{ percent }}%</span>
          </div>
        </template>
        <div v-else class="copy-overlay__done">
          <div class="copy-overlay__done-tip">
            <IconCheck :size="14" />
            项目已复制完成
          </div>
          <div class="copy-overlay__done-actions">
            <BaseButton variant="text" size="xs" @click="emit('close')">关闭</BaseButton>
            <BaseButton variant="primary" size="xs" @click="emit('open')">打开项目</BaseButton>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import BaseButton from '@/components/common/base-button.vue'
import IconCheck from '@/components/icons/icon-check.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  /** 原项目路径，用于标识当前任务 */
  source: { type: String, default: '' },
  /** 0-100 */
  progress: { type: Number, default: 0 },
  /** 是否完成（展示完成态） */
  done: { type: Boolean, default: false }
})
const emit = defineEmits(['cancel', 'open', 'close'])

const percent = computed(() => Math.max(0, Math.min(100, Math.round(props.progress || 0))))
</script>

<style scoped>
.copy-overlay {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1300;
  width: 300px;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.copy-overlay__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.copy-overlay__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}
.copy-overlay__cancel {
  flex-shrink: 0;
}
.copy-overlay__repo {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.copy-overlay__bar {
  margin-top: 12px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-hover);
  overflow: hidden;
}
.copy-overlay__bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--color-primary);
  transition: width 0.2s ease;
}
.copy-overlay__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.copy-overlay__done {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}
.copy-overlay__done-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-success);
}
.copy-overlay__done-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.copy-overlay-fade-enter-active,
.copy-overlay-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.copy-overlay-fade-enter-from,
.copy-overlay-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
