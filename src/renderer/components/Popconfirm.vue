<template>
  <!--
    轻量 Popconfirm：点击插槽内的元素，在其上方弹出确认气泡。
    - 仅一个确定按钮 + 右上角 × 关闭，不提供取消按钮
    - 浮层 Teleport 到 body，避免被祖先 overflow:hidden 截断
  -->
  <span ref="triggerRef" class="popconfirm-trigger" @click.stop="onTriggerClick">
    <slot />
  </span>

  <Teleport to="body">
    <transition name="popconfirm-fade">
      <div
        v-if="open"
        ref="popperRef"
        class="popconfirm"
        :style="{
          left: pos.left + 'px',
          top: pos.top + 'px',
          visibility: pos.measured ? 'visible' : 'hidden'
        }"
        :data-placement="pos.placement"
        role="dialog"
        @click.stop
      >
        <button class="popconfirm__close" type="button" aria-label="关闭" @click="close">×</button>

        <div class="popconfirm__body">
          <span class="popconfirm__icon" aria-hidden="true">i</span>
          <div class="popconfirm__message">{{ message }}</div>
        </div>

        <div class="popconfirm__actions">
          <button class="popconfirm__btn" type="button" @click="onConfirm">
            {{ confirmText }}
          </button>
        </div>

        <span class="popconfirm__arrow" aria-hidden="true" />
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, nextTick, onBeforeUnmount, watch } from 'vue'
import {
  setDisabled as setTooltipDisabled,
  hideAll as hideAllTooltips
} from '@/directives/tooltip.js'

const props = defineProps({
  message: { type: String, default: '确认执行此操作？' },
  confirmText: { type: String, default: '确定' },
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['confirm', 'cancel', 'open', 'close'])

const triggerRef = ref(null)
const popperRef = ref(null)
const open = ref(false)
const pos = reactive({ left: 0, top: 0, placement: 'top', measured: false })

const VIEWPORT_PADDING = 8
const GAP = 10

/** 取触发节点的实际锚点元素（插槽里的第一个 element；为空时回退到 wrapper） */
function getAnchorEl() {
  const wrap = triggerRef.value
  if (!wrap) return null
  const child = Array.from(wrap.children || []).find((n) => n.nodeType === 1)
  return child || wrap
}

/** 计算浮层位置：默认在锚点上方居中；放不下则翻到下方 */
function place() {
  const anchor = getAnchorEl()
  const popper = popperRef.value
  if (!anchor || !popper) return

  const rect = anchor.getBoundingClientRect()
  const pw = popper.offsetWidth
  const ph = popper.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight

  let placement = 'top'
  let top = rect.top - ph - GAP
  if (top < VIEWPORT_PADDING) {
    placement = 'bottom'
    top = rect.bottom + GAP
  }

  let left = rect.left + rect.width / 2 - pw / 2
  left = Math.max(VIEWPORT_PADDING, Math.min(left, vw - pw - VIEWPORT_PADDING))
  top = Math.max(VIEWPORT_PADDING, Math.min(top, vh - ph - VIEWPORT_PADDING))

  pos.left = left
  pos.top = top
  pos.placement = placement
  pos.measured = true
}

function onTriggerClick(e) {
  if (props.disabled) return
  if (open.value) {
    close()
    return
  }
  // 阻止冒泡到 document 监听，避免 show 后立刻被外部点击关闭
  e?.stopPropagation?.()
  show()
}

async function show() {
  hideAllTooltips()
  setTooltipDisabled(true)
  open.value = true
  pos.measured = false
  emit('open')
  await nextTick()
  place()
  // 下一帧再绑定外部关闭，避免本次点击误触发
  setTimeout(() => {
    document.addEventListener('mousedown', onOutsideMouseDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
  }, 0)
}

function close({ silent = false } = {}) {
  if (!open.value) return
  open.value = false
  setTooltipDisabled(false)
  if (!silent) emit('cancel')
  emit('close')
  document.removeEventListener('mousedown', onOutsideMouseDown, true)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
}

function onScrollOrResize() {
  close()
}

function onConfirm() {
  emit('confirm')
  // silent=true：confirm 已发，关闭时无需再发 cancel
  close({ silent: true })
}

function onOutsideMouseDown(e) {
  const popper = popperRef.value
  const wrap = triggerRef.value
  if (popper && popper.contains(e.target)) return
  if (wrap && wrap.contains(e.target)) return
  close()
}

function onKeyDown(e) {
  if (e.key === 'Escape') close()
}

// disabled 由 false 变 true 时若已打开应自动关闭
watch(
  () => props.disabled,
  (v) => {
    if (v && open.value) close()
  }
)

onBeforeUnmount(() => {
  if (open.value) {
    setTooltipDisabled(false)
    document.removeEventListener('mousedown', onOutsideMouseDown, true)
    document.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('scroll', onScrollOrResize, true)
    window.removeEventListener('resize', onScrollOrResize)
  }
})
</script>

<style scoped>
.popconfirm-trigger {
  display: inline-flex;
  align-items: center;
}

.popconfirm {
  position: fixed;
  z-index: 1200;
  min-width: 200px;
  max-width: 280px;
  padding: 12px 14px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  color: var(--color-text);
  font-size: 13px;
}

.popconfirm__close {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    color 0.15s;
}
.popconfirm__close:hover {
  background: var(--color-hover);
  color: var(--color-text);
}

.popconfirm__body {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-right: 18px;
}
.popconfirm__icon {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-hover);
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  margin-top: 1px;
}
.popconfirm__message {
  flex: 1;
  line-height: 1.5;
  word-break: break-all;
}

.popconfirm__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.popconfirm__btn {
  height: 26px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-primary);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.popconfirm__btn:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

/* 小三角 */
.popconfirm__arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transform: rotate(45deg);
  left: 50%;
  margin-left: -4px;
}
.popconfirm[data-placement='top'] .popconfirm__arrow {
  bottom: -5px;
  border-top: none;
  border-left: none;
}
.popconfirm[data-placement='bottom'] .popconfirm__arrow {
  top: -5px;
  border-bottom: none;
  border-right: none;
}

.popconfirm-fade-enter-active,
.popconfirm-fade-leave-active {
  transition:
    opacity 0.12s,
    transform 0.12s;
}
.popconfirm-fade-enter-from,
.popconfirm-fade-leave-to {
  opacity: 0;
  transform: translateY(2px);
}
</style>
