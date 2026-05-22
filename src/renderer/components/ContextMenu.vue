<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="ctx-mask"
      @click="onClose"
      @contextmenu.prevent="onClose"
    >
      <div
        ref="menuRef"
        class="ctx-menu"
        :style="{ left: pos.left + 'px', top: pos.top + 'px', visibility: pos.measured ? 'visible' : 'hidden' }"
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
        <!-- footnote：仅做标识用的菜单脚注（如展示当前操作的对象名） -->
        <template v-if="footnote">
          <div class="ctx-divider" />
          <div class="ctx-footnote">{{ footnote }}</div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, reactive } from 'vue'

const props = defineProps({
  visible: Boolean,
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  // items: [{ label, action, danger?, divider? }]
  items: { type: Array, default: () => [] },
  // 菜单底部脚注：纯展示用，置灰小字，不响应点击；空串/不传则不渲染
  footnote: { type: String, default: '' }
})
const emit = defineEmits(['close', 'select'])

const menuRef = ref(null)
// measured=false 时菜单 visibility:hidden 占位测量，避免闪烁
const pos = reactive({ left: 0, top: 0, measured: false })

const PADDING = 4 // 菜单与窗口边缘的最小留白

/**
 * 根据指针 (x,y) 与菜单实测尺寸决定弹出方位：
 * - 右侧放不下时向左展开（用 x - w）
 * - 底部放不下时向上展开（用 y - h）
 * - 最后 clamp 到 [PADDING, viewport - size - PADDING] 防止极端越界
 */
function computePosition() {
  const el = menuRef.value
  if (!el) return
  const { offsetWidth: w, offsetHeight: h } = el
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = props.x
  let top = props.y
  if (left + w + PADDING > vw) left = props.x - w  // 翻向左
  if (top + h + PADDING > vh) top = props.y - h    // 翻向上
  left = Math.max(PADDING, Math.min(left, vw - w - PADDING))
  top = Math.max(PADDING, Math.min(top, vh - h - PADDING))

  pos.left = left
  pos.top = top
  pos.measured = true
}

watch(
  () => [props.visible, props.x, props.y, props.items],
  async ([vis]) => {
    if (!vis) {
      pos.measured = false
      return
    }
    // 先把 left/top 锚到指针位置，DOM 挂载后用真实尺寸再算一次
    pos.left = props.x
    pos.top = props.y
    pos.measured = false
    await nextTick()
    computePosition()
  },
  { immediate: true }
)

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
/* 菜单脚注：紧凑、小字、置灰，超长省略 */
.ctx-footnote {
  padding: 4px 12px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
