<template>
  <div
    class="card"
    :class="{ pinned: project.pinned }"
    @dblclick="$emit('open', project)"
    @contextmenu.prevent="$emit('contextmenu', $event, project)"
  >
    <!-- 右上角 pin 按钮：pinned 时常显示金色实星；未 pinned 时仅在 hover 时显示空心星 -->
    <button
      class="pin-btn"
      :class="{ active: project.pinned }"
      :title="project.pinned ? '取消置顶' : '置顶'"
      @click.stop="$emit('toggle-pin', project)"
      @dblclick.stop
    >
      {{ project.pinned ? '★' : '☆' }}
    </button>

    <div class="card-icon">📁</div>
    <div class="card-info">
      <div class="card-name" :title="project.name">{{ project.name }}</div>
      <div
        v-if="project.description"
        class="card-desc"
        :title="project.description"
      >
        {{ project.description }}
      </div>
    </div>
    <div class="card-path" :title="project.path">{{ project.path }}</div>
  </div>
</template>

<script setup>
defineProps({
  project: { type: Object, required: true }
})
defineEmits(['open', 'contextmenu', 'toggle-pin'])
</script>

<style scoped>
.card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  min-height: 110px;
  box-shadow: var(--shadow-sm);
}
.card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
/* pinned 状态时左侧加一条强调色 */
.card.pinned {
  border-color: #e5c98a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), inset 3px 0 0 #f0c14b;
}

.card-icon {
  font-size: 24px;
  line-height: 1;
}
.card-info {
  flex: 1;
  min-width: 0;
}
.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* 给右上角 pin 按钮预留空间 */
  padding-right: 22px;
}
.card-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-path {
  font-size: 11px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* pin 按钮 */
.pin-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: 16px;
  line-height: 1;
  color: var(--color-text-tertiary);
  /* 默认未 pin 时半透明，hover 卡片再淡入 */
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s, transform 0.15s;
}
.card:hover .pin-btn {
  opacity: 1;
}
.pin-btn:hover {
  background: var(--color-hover);
  color: #d9a526;
}
.pin-btn.active {
  /* pinned 状态常显并点亮 */
  opacity: 1;
  color: #f0c14b;
}
.pin-btn.active:hover {
  color: #d9a526;
  transform: scale(1.06);
}
</style>
