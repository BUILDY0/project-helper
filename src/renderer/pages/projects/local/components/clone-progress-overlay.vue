<template>
  <Teleport to="body">
    <transition name="clone-overlay-fade">
      <div v-if="visible" class="clone-overlay">
        <div class="clone-overlay__head">
          <span class="clone-overlay__title">
            {{ done ? '克隆仓库完成' : '正在克隆仓库' }}
          </span>
          <BaseButton
            v-if="!done"
            variant="text"
            size="xs"
            tone="default"
            class="clone-overlay__cancel"
            @click="emit('cancel')"
          >
            取消
          </BaseButton>
        </div>

        <div class="clone-overlay__repo" v-tooltip="repo">{{ repo }}</div>

        <template v-if="!done">
          <div class="clone-overlay__bar">
            <div class="clone-overlay__bar-fill" :style="{ width: `${percent}%` }" />
          </div>
          <div class="clone-overlay__meta">
            <span>{{ stageLabel }}</span>
            <span>{{ percent }}%</span>
          </div>
        </template>
        <div v-else class="clone-overlay__done">
          <div class="clone-overlay__done-tip">
            <IconCheck :size="14" />
            仓库已克隆到本地
          </div>
          <div class="clone-overlay__done-actions">
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
  /** 目标仓库地址，用于标识当前任务 */
  repo: { type: String, default: '' },
  /** simple-git 进度阶段：remote / receiving / resolving / checkout ... */
  stage: { type: String, default: '' },
  /** 0-100 */
  progress: { type: Number, default: 0 },
  /** 是否完成（展示完成态） */
  done: { type: Boolean, default: false }
})
const emit = defineEmits(['cancel', 'open', 'close'])

const percent = computed(() => Math.max(0, Math.min(100, Math.round(props.progress || 0))))

const STAGE_LABELS = {
  counting: '统计对象',
  compressing: '压缩对象',
  receiving: '接收对象',
  resolving: '处理增量',
  writing: '写入对象'
}
const stageLabel = computed(() => STAGE_LABELS[props.stage] || '准备中')
</script>

<style scoped>
.clone-overlay {
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
.clone-overlay__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.clone-overlay__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}
.clone-overlay__cancel {
  flex-shrink: 0;
}
.clone-overlay__repo {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.clone-overlay__bar {
  margin-top: 12px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-hover);
  overflow: hidden;
}
.clone-overlay__bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--color-primary);
  transition: width 0.2s ease;
}
.clone-overlay__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.clone-overlay__done {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}
.clone-overlay__done-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-success);
}
.clone-overlay__done-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.clone-overlay-fade-enter-active,
.clone-overlay-fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.clone-overlay-fade-enter-from,
.clone-overlay-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
