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
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
                .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
                1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56
                .82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07
                -.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </button>
        <button
          v-if="project.hasPackageJson"
          class="status-btn"
          v-tooltip="'打开项目文件夹'"
          @click.stop="$emit('open-pkg', project)"
        >
          <svg viewBox="4 4 24 26" width="14" height="14" aria-hidden="true">
            <path
              fill="#83cd29"
              d="M16 30a2 2 0 0 1-1-.27l-3.18-1.88c-.47-.27-.24-.36-.09-.42.63-.22.76-.27 1.43-.65.07-.04.16-.02.23.02l2.44 1.45a.32.32 0 0 0 .29 0l9.51-5.49a.3.3 0 0 0 .14-.25V11.51a.3.3 0 0 0-.14-.26L16.13 5.77a.3.3 0 0 0-.29 0l-9.5 5.49a.3.3 0 0 0-.15.26v10.99c0 .1.06.19.14.24l2.6 1.5c1.41.71 2.28-.13 2.28-.96V12.45c0-.15.12-.27.27-.27h1.21c.14 0 .27.12.27.27v10.85c0 1.89-1.03 2.97-2.81 2.97-.55 0-.98 0-2.18-.59l-2.5-1.43A2 2 0 0 1 4.5 22.5V11.5a2 2 0 0 1 1-1.74l9.5-5.49a2.07 2.07 0 0 1 2 0l9.5 5.49a2 2 0 0 1 1 1.74V22.5a2 2 0 0 1-1 1.74l-9.5 5.49a2 2 0 0 1-1 .27z"
            />
            <path
              fill="#83cd29"
              d="M18.94 22.46c-4.16 0-5.03-1.91-5.03-3.51a.27.27 0 0 1 .27-.27h1.24c.13 0 .25.1.27.23.19 1.27.75 1.91 3.25 1.91 1.99 0 2.84-.45 2.84-1.51 0-.61-.24-1.07-3.34-1.37-2.59-.26-4.19-.83-4.19-2.9 0-1.91 1.61-3.05 4.31-3.05 3.03 0 4.53 1.05 4.72 3.31a.28.28 0 0 1-.27.3h-1.24a.27.27 0 0 1-.26-.21c-.3-1.34-1.03-1.77-2.96-1.77-2.16 0-2.41.75-2.41 1.32 0 .68.3.88 3.24 1.27 2.91.39 4.29.93 4.29 2.99 0 2.06-1.72 3.24-4.71 3.24z"
            />
          </svg>
        </button>
        <button
          v-if="project.readmePath"
          class="status-btn"
          v-tooltip="'打开 README'"
          @click.stop="$emit('open-readme', project)"
        >
          <svg viewBox="0 0 208 128" width="14" height="14" fill="none" aria-hidden="true">
            <g fill="currentColor">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M15 10c-2.7614 0-5 2.2386-5 5v98c0 2.761 2.2386 5 5 5h178c2.761 0 5-2.239 5-5v-98c0-2.7614-2.239-5-5-5zm-15 5c0-8.28427 6.71573-15 15-15h178c8.284 0 15 6.71573 15 15v98c0 8.284-6.716 15-15 15h-178c-8.28427 0-15-6.716-15-15z"
              />
              <path
                d="M30 98v-68h20l20 25 20-25h20v68h-20v-39l-20 25-20-25v39zm125 0-30-33h20v-35h20v35h20z"
              />
            </g>
          </svg>
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
  border-color: #e5c98a;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    inset 3px 0 0 #f0c14b;
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
