<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="ctx-mask"
      @click="onClose"
      @contextmenu.prevent="onClose"
    >
      <div
        class="ctx-menu"
        :style="{ left: x + 'px', top: y + 'px' }"
        @click.stop
      >
        <template v-for="(item, idx) in items" :key="idx">
          <div v-if="item.divider" class="ctx-divider" />
          <div
            v-else
            class="ctx-item"
            :class="{ danger: item.danger }"
            @click="onItemClick(item)"
          >
            {{ item.label }}
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  visible: Boolean,
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  // items: [{ label, action, danger?, divider? }]
  items: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'select'])

const onClose = () => emit('close')
const onItemClick = (item) => {
  emit('select', item)
  emit('close')
}
</script>

<style scoped>
.ctx-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
}
.ctx-menu {
  position: absolute;
  min-width: 160px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  font-size: 13px;
}
.ctx-item {
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text);
  transition: background 0.12s;
}
.ctx-item:hover {
  background: var(--color-hover);
}
.ctx-item.danger {
  color: var(--color-danger);
}
.ctx-item.danger:hover {
  background: rgba(217, 59, 59, 0.08);
}
.ctx-divider {
  height: 1px;
  background: var(--color-border);
  margin: 4px 6px;
}
</style>
