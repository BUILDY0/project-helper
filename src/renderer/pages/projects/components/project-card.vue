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
      v-tooltip="project.pinned ? '取消置顶' : '置顶'"
      @click.stop="$emit('toggle-pin', project)"
      @dblclick.stop
    >
      {{ project.pinned ? '★' : '☆' }}
    </button>

    <!-- 头部：folder emoji + 状态图标列 -->
    <div class="card-head">
      <div class="card-icon">📁</div>
      <div class="status-icons" @dblclick.stop>
        <button
          v-if="project.gitUrl"
          class="status-btn"
          v-tooltip="'在浏览器打开仓库'"
          @click.stop="$emit('open-git', project)"
        >
          <IconGithub :size="14" />
        </button>
        <button
          v-if="project.hasPackageJson"
          class="status-btn"
          v-tooltip="'打开项目文件夹'"
          @click.stop="$emit('open-pkg', project)"
        >
          <IconNode :size="14" />
        </button>
        <button
          v-if="project.readmePath"
          class="status-btn"
          v-tooltip="'打开 README'"
          @click.stop="$emit('open-readme', project)"
        >
          <IconReadme :size="14" />
        </button>
      </div>
    </div>

    <div class="card-info">
      <div class="card-name" v-tooltip.overflow="project.name">{{ project.name }}</div>
      <div
        v-if="project.description"
        class="card-desc"
        v-tooltip:bottom.overflow="project.description"
      >
        {{ project.description }}
      </div>
    </div>
    <div class="card-path" v-tooltip:bottom.overflow="project.path">{{ project.path }}</div>
  </div>
</template>

<script setup>
import IconGithub from '@/components/icons/icon-github.vue'
import IconNode from '@/components/icons/icon-node.vue'
import IconReadme from '@/components/icons/icon-readme.vue'

defineProps({
  project: { type: Object, required: true }
})
defineEmits(['open', 'contextmenu', 'toggle-pin', 'open-git', 'open-pkg', 'open-readme'])
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
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
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
  border-color: var(--color-accent-border);
  box-shadow:
    var(--shadow-sm),
    inset 3px 0 0 var(--color-accent);
}

.card-icon {
  font-size: 24px;
  line-height: 1;
}
/* 头部行：folder emoji 与状态图标列同行；status-icons 在 emoji 右侧 */
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  /* 给右上角 pin 按钮预留空间，避免状态图标右移撞到星标 */
  padding-right: 26px;
}
.status-icons {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.status-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.status-btn:hover {
  background: var(--color-hover);
  color: var(--color-text);
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
  transition:
    opacity 0.15s,
    background 0.15s,
    color 0.15s,
    transform 0.15s;
}
.card:hover .pin-btn {
  opacity: 1;
}
.pin-btn:hover {
  background: var(--color-hover);
  color: var(--color-accent-hover);
}
.pin-btn.active {
  /* pinned 状态常显并点亮 */
  opacity: 1;
  color: var(--color-accent);
}
.pin-btn.active:hover {
  color: var(--color-accent-hover);
  transform: scale(1.06);
}
</style>
