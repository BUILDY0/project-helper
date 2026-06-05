<template>
  <!--
    轻量 Popconfirm：点击插槽内的元素，在其上方弹出确认气泡。
    - 仅一个确定按钮 + 右上角 × 关闭，不提供取消按钮
    - 浮层 Teleport 到 body，避免被祖先 overflow:hidden 截断
  -->
  <span ref="triggerRef" class="base-popconfirm__trigger" @click.stop="onTriggerClick">
    <slot />
  </span>

  <Teleport to="body">
    <transition name="base-popconfirm-fade">
      <div
        v-if="open"
        ref="popperRef"
        class="base-popconfirm"
        :style="{
          left: pos.left + 'px',
          top: pos.top + 'px',
          visibility: pos.measured ? 'visible' : 'hidden'
        }"
        :data-placement="pos.placement"
        role="dialog"
        @click.stop
      >
        <BaseButton
          variant="icon"
          size="xs"
          class="btn-close-affix"
          aria-label="关闭"
          @click="close"
        >
          ×
        </BaseButton>

        <div class="base-popconfirm__body">
          <span class="base-popconfirm__icon" aria-hidden="true">i</span>
          <div class="base-popconfirm__message">{{ message }}</div>
        </div>

        <div class="base-popconfirm__actions">
          <BaseButton variant="text" tone="primary" size="xs" @click="onConfirm">
            {{ confirmText }}
          </BaseButton>
        </div>

        <span class="base-popconfirm__arrow" aria-hidden="true" />
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, nextTick, onBeforeUnmount, watch } from 'vue'
import BaseButton from './base-button.vue'
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

<style>
.base-popconfirm__trigger {
  display: inline-flex;
  align-items: center;
}

.base-popconfirm {
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

.base-popconfirm__body {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-right: 18px;
}
.base-popconfirm__icon {
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
.base-popconfirm__message {
  flex: 1;
  line-height: 1.5;
  word-break: break-all;
}

.base-popconfirm__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

/* 小三角 */
.base-popconfirm__arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  transform: rotate(45deg);
  left: 50%;
  margin-left: -4px;
}
.base-popconfirm[data-placement='top'] .base-popconfirm__arrow {
  bottom: -5px;
  border-top: none;
  border-left: none;
}
.base-popconfirm[data-placement='bottom'] .base-popconfirm__arrow {
  top: -5px;
  border-bottom: none;
  border-right: none;
}

.base-popconfirm-fade-enter-active,
.base-popconfirm-fade-leave-active {
  transition:
    opacity 0.12s,
    transform 0.12s;
}
.base-popconfirm-fade-enter-from,
.base-popconfirm-fade-leave-to {
  opacity: 0;
  transform: translateY(2px);
}
</style>
