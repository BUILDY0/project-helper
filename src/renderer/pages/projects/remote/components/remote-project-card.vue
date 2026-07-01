<template>
  <div
    class="card remote-card"
    :class="{ pinned: project.pinned }"
    @dblclick="onOpen"
    @contextmenu.prevent="$emit('contextmenu', $event, project)"
  >
    <BaseButton
      variant="icon"
      size="xs"
      class="pin-btn"
      :class="{ active: project.pinned }"
      v-tooltip="project.pinned ? '取消置顶' : '置顶'"
      @click.stop="$emit('toggle-pin', project)"
      @dblclick.stop
    >
      <IconPin :size="16" :filled="project.pinned" />
    </BaseButton>

    <div class="card-head">
      <div class="card-icon">🌐</div>
      <div class="status-icons" @dblclick.stop>
        <span class="remote-tag" :style="tagStyle">
          {{ typeLabel }}
        </span>
      </div>
    </div>

    <div class="card-info">
      <div class="card-name" v-tooltip.overflow="project.name">{{ project.name }}</div>
      <div
        v-if="project.description"
        class="card-desc"
        v-tooltip:bottom.overflow.md="project.description"
      >
        {{ project.description }}
      </div>
      <div v-if="project.tags && project.tags.length" class="card-tags">
        <BaseTag v-for="t in project.tags" :key="t" :label="t" hash size="sm" />
      </div>
    </div>
    <div class="card-path" v-tooltip:bottom.overflow="project.path">{{ project.path }}</div>
  </div>
</template>

<script setup>
import IconPin from '@/components/icons/icon-pin.vue'
import BaseButton from '@/components/common/base-button.vue'
import BaseTag from '@/components/common/base-tag.vue'

const props = defineProps({
  project: { type: Object, required: true },
  tagStyle: { type: Object, default: () => ({}) },
  typeLabel: { type: String, default: '' }
})
const emit = defineEmits(['open', 'contextmenu', 'toggle-pin'])

async function onOpen() {
  emit('open', props.project)
}
</script>

<style scoped>
.remote-card {
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
.remote-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.remote-card.pinned {
  border-color: var(--color-accent-border);
  box-shadow:
    var(--shadow-sm),
    inset 3px 0 0 var(--color-accent);
}
.card-icon {
  font-size: 24px;
  line-height: 1;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 26px;
}
.status-icons {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.remote-tag {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 3px;
  border-width: 1px;
  border-style: solid;
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
  padding-right: 22px;
}
.card-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  height: 3em;
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
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}
.pin-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  color: var(--color-text-tertiary);
  opacity: 0;
}
.remote-card:hover .pin-btn {
  opacity: 1;
}
.pin-btn:hover:not(:disabled) {
  color: var(--color-accent-hover);
}
.pin-btn.active {
  opacity: 1;
  color: var(--color-accent);
}
.pin-btn.active:hover:not(:disabled) {
  color: var(--color-accent-hover);
  transform: scale(1.06);
}
</style>
