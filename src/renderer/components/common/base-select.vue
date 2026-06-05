<template>
  <!--
    通用下拉选择原子组件
    - 单选 / 多选（multiple）
    - 选项分组（options 含 group 字段时自动渲染分组标题）
    - 搜索 / 筛选（filterable）
    - reserveKeyword：多选确认后保留搜索词
    - option 插槽：自定义选项 UI
    - clearable：有值时显示清空按钮
    - size：sm(30px) / md(32px)，与 base-input 对齐
  -->
  <div
    ref="triggerRef"
    class="base-select"
    :class="[
      `base-select--${size}`,
      {
        'is-open': open,
        'is-disabled': disabled,
        'is-multiple': multiple,
        'is-focus': open
      }
    ]"
    :tabindex="disabled ? -1 : 0"
    role="combobox"
    :aria-expanded="open"
    :aria-disabled="disabled"
    @click="onTriggerClick"
    @keydown="onTriggerKeydown"
  >
    <!-- 多选 tags -->
    <template v-if="multiple">
      <span
        v-for="val in Array.isArray(modelValue) ? modelValue : []"
        :key="val"
        class="base-select__tag"
      >
        {{ labelOf(val) }}
        <span class="base-select__tag-remove" @click.stop="removeTag(val)" aria-label="移除">
          ×
        </span>
      </span>
      <input
        v-if="filterable"
        ref="searchRef"
        v-model="keyword"
        class="base-select__search"
        :placeholder="!hasValue ? placeholder : ''"
        :readonly="!open"
        @click.stop="onTriggerClick"
        @keydown.backspace="onBackspace"
        @keydown.stop
      />
      <span v-else-if="!hasValue" class="base-select__placeholder">{{ placeholder }}</span>
    </template>

    <!-- 单选 -->
    <template v-else>
      <input
        v-if="filterable"
        ref="searchRef"
        class="base-select__search base-select__search--single"
        :value="open ? keyword : displayLabel || ''"
        :placeholder="open && displayLabel ? displayLabel : placeholder"
        :readonly="!open"
        @input="keyword = $event.target.value"
        @click.stop="onTriggerClick"
        @keydown.stop
      />
      <span v-else class="base-select__value" :class="{ 'is-placeholder': !hasValue }">
        {{ hasValue ? displayLabel : placeholder }}
      </span>
    </template>

    <!-- 清空按钮 -->
    <button
      v-if="clearable && hasValue && !disabled"
      class="base-select__clear"
      v-tooltip="'清空'"
      @click.stop="onClear"
      tabindex="-1"
    >
      ×
    </button>

    <!-- 箭头 -->
    <span class="base-select__arrow" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M2 3.5L5 6.5L8 3.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  </div>

  <!-- 下拉浮层 -->
  <Teleport to="body">
    <div v-if="open" class="base-select__mask" @mousedown.prevent="close" />
    <transition name="base-select-drop">
      <div
        v-if="open"
        ref="dropdownRef"
        class="base-select__dropdown"
        :style="dropStyle"
        role="listbox"
        :aria-multiselectable="multiple"
        @mousedown.prevent
      >
        <!-- 无结果 -->
        <div v-if="filteredOptions.length === 0" class="base-select__empty">无匹配选项</div>

        <template
          v-for="item in filteredOptions"
          :key="item._isGroup ? `g:${item.group}` : item.value"
        >
          <!-- 分组标题 -->
          <div v-if="item._isGroup" class="base-select__group-label">{{ item.group }}</div>

          <!-- 选项 -->
          <div
            v-else
            class="base-select__option"
            :class="{
              'is-selected': isSelected(item.value),
              'is-disabled': item.disabled,
              'is-focused': focusedIndex === item._flatIndex
            }"
            role="option"
            :aria-selected="isSelected(item.value)"
            :aria-disabled="item.disabled"
            @click="onOptionClick(item)"
            @mouseenter="focusedIndex = item._flatIndex"
          >
            <!-- option 插槽 -->
            <slot name="option" :option="item" :selected="isSelected(item.value)">
              <span class="base-select__option-label">{{ item.label }}</span>
            </slot>
            <!-- 多选选中标记（末尾 ✓，无方框） -->
            <span
              v-if="multiple && isSelected(item.value)"
              class="base-select__check-mark"
              aria-hidden="true"
            >
              ✓
            </span>
          </div>
        </template>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, Array, null], default: null },
  /**
   * 选项数组，支持两种格式：
   *   - 平铺：[{ label, value, disabled? }, ...]
   *   - 分组：[{ group: '组名', options: [{ label, value, disabled? }, ...] }, ...]
   *   - 混合也支持：有 group 字段的走分组，否则平铺
   */
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  disabled: { type: Boolean, default: false },
  clearable: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
  /** 启用搜索/筛选输入框 */
  filterable: { type: Boolean, default: false },
  /** 多选模式下：选中后保留搜索词（默认选中后清空） */
  reserveKeyword: { type: Boolean, default: false },
  /** sm=30px / md=32px */
  size: { type: String, default: 'md' }
})
const emit = defineEmits(['update:modelValue', 'change'])

// ─── refs ───────────────────────────────────────────────
const triggerRef = ref(null)
const dropdownRef = ref(null)
const searchRef = ref(null)
const open = ref(false)
const keyword = ref('')
const focusedIndex = ref(-1)
const dropStyle = reactive({
  position: 'fixed',
  left: '0px',
  top: '0px',
  minWidth: '0px',
  visibility: 'hidden'
})

// ─── 选项扁平化（含分组标记） ────────────────────────────
const flatOptions = computed(() => {
  const result = []
  let flatIdx = 0
  for (const item of props.options) {
    if (item.group && Array.isArray(item.options)) {
      result.push({ _isGroup: true, group: item.group })
      for (const opt of item.options) {
        result.push({ ...opt, _isGroup: false, _flatIndex: flatIdx++ })
      }
    } else if (!item._isGroup) {
      result.push({ ...item, _isGroup: false, _flatIndex: flatIdx++ })
    }
  }
  return result
})

// 仅叶子选项（非分组行）
const leafOptions = computed(() => flatOptions.value.filter((o) => !o._isGroup))

// 筛选后的选项列表（含分组标题行保留）
const filteredOptions = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return flatOptions.value
  // 按关键词过滤叶子项，保留匹配项所在分组标题
  const matchedGroups = new Set()
  const matched = new Set()
  for (const o of flatOptions.value) {
    if (!o._isGroup && String(o.label).toLowerCase().includes(kw)) {
      matched.add(o._flatIndex)
    }
  }
  // 重新扫一遍，输出分组标题（仅当下面有匹配项）
  const result = []
  let lastGroup = null
  for (const o of flatOptions.value) {
    if (o._isGroup) {
      lastGroup = o
    } else if (matched.has(o._flatIndex)) {
      if (lastGroup && !matchedGroups.has(lastGroup.group)) {
        result.push(lastGroup)
        matchedGroups.add(lastGroup.group)
      }
      result.push(o)
    }
  }
  return result
})

// ─── 值处理 ─────────────────────────────────────────────
const hasValue = computed(() => {
  if (props.multiple) return Array.isArray(props.modelValue) && props.modelValue.length > 0
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== ''
})

const displayLabel = computed(() => {
  if (props.multiple) return ''
  const opt = leafOptions.value.find((o) => o.value === props.modelValue)
  return opt ? opt.label : String(props.modelValue ?? '')
})

function labelOf(val) {
  const opt = leafOptions.value.find((o) => o.value === val)
  return opt ? opt.label : String(val)
}

function isSelected(val) {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(val)
  }
  return props.modelValue === val
}

// ─── 浮层定位 ────────────────────────────────────────────
const VIEWPORT_PAD = 6
const GAP = 4

async function place() {
  await nextTick()
  const trigger = triggerRef.value
  const dropdown = dropdownRef.value
  if (!trigger || !dropdown) return

  const rect = trigger.getBoundingClientRect()
  const dh = dropdown.offsetHeight
  const dw = Math.max(dropdown.offsetWidth, rect.width)
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top = rect.bottom + GAP
  if (top + dh + VIEWPORT_PAD > vh && rect.top - dh - GAP > VIEWPORT_PAD) {
    top = rect.top - dh - GAP
  }
  let left = rect.left
  if (left + dw + VIEWPORT_PAD > vw) {
    left = rect.right - dw
  }
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - dw - VIEWPORT_PAD))
  top = Math.max(VIEWPORT_PAD, Math.min(top, vh - dh - VIEWPORT_PAD))

  dropStyle.left = left + 'px'
  dropStyle.top = top + 'px'
  dropStyle.minWidth = rect.width + 'px'
  dropStyle.visibility = 'visible'
}

// ─── 开/关 ───────────────────────────────────────────────
function onTriggerClick() {
  if (props.disabled) return
  open.value ? close() : show()
}

async function show() {
  open.value = true
  dropStyle.visibility = 'hidden'
  focusedIndex.value = -1
  if (!props.multiple || !props.reserveKeyword) keyword.value = ''
  await nextTick()
  if (props.filterable) searchRef.value?.focus()
  await place()
  bindClose()
}

function close() {
  if (!open.value) return
  open.value = false
  if (!props.reserveKeyword) keyword.value = ''
  unbindClose()
}

// ─── 选项交互 ────────────────────────────────────────────
function onOptionClick(opt) {
  if (opt.disabled) return
  if (props.multiple) {
    const cur = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const idx = cur.indexOf(opt.value)
    if (idx === -1) cur.push(opt.value)
    else cur.splice(idx, 1)
    emit('update:modelValue', cur)
    emit('change', cur, opt)
    if (!props.reserveKeyword) keyword.value = ''
    nextTick(() => searchRef.value?.focus())
  } else {
    emit('update:modelValue', opt.value)
    emit('change', opt.value, opt)
    close()
  }
}

function onClear() {
  const val = props.multiple ? [] : null
  emit('update:modelValue', val)
  emit('change', val, null)
  keyword.value = ''
}

function removeTag(val) {
  if (props.disabled) return
  const cur = Array.isArray(props.modelValue) ? props.modelValue.filter((v) => v !== val) : []
  emit('update:modelValue', cur)
  emit('change', cur, null)
}

function onBackspace() {
  if (keyword.value) return
  const cur = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  if (cur.length) {
    cur.pop()
    emit('update:modelValue', cur)
    emit('change', cur, null)
  }
}

// ─── 键盘导航 ────────────────────────────────────────────
function onTriggerKeydown(e) {
  if (props.disabled) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    if (!open.value) show()
    else if (focusedIndex.value >= 0) {
      const opt = filteredOptions.value.find(
        (o) => !o._isGroup && o._flatIndex === focusedIndex.value
      )
      if (opt) onOptionClick(opt)
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!open.value) {
      show()
      return
    }
    moveFocus(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    moveFocus(-1)
  } else if (e.key === 'Escape') {
    close()
    triggerRef.value?.focus()
  }
}

function moveFocus(dir) {
  const leaves = filteredOptions.value.filter((o) => !o._isGroup && !o.disabled)
  if (!leaves.length) return
  const cur = leaves.findIndex((o) => o._flatIndex === focusedIndex.value)
  const next = (cur + dir + leaves.length) % leaves.length
  focusedIndex.value = leaves[next]._flatIndex
  scrollOptionIntoView(focusedIndex.value)
}

function scrollOptionIntoView(flatIdx) {
  if (!dropdownRef.value) return
  const el = dropdownRef.value.querySelector(`[data-flat-index="${flatIdx}"]`)
  el?.scrollIntoView({ block: 'nearest' })
}

// ─── 外部点击 / scroll / resize 关闭 ────────────────────
function onOutsideMouseDown(e) {
  if (triggerRef.value?.contains(e.target)) return
  if (dropdownRef.value?.contains(e.target)) return
  close()
}
function onKeyDown(e) {
  if (e.key === 'Escape') close()
}
function onScrollOrResize() {
  close()
}

function bindClose() {
  setTimeout(() => {
    document.addEventListener('mousedown', onOutsideMouseDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
  }, 0)
}
function unbindClose() {
  document.removeEventListener('mousedown', onOutsideMouseDown, true)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
}

onBeforeUnmount(unbindClose)

// disabled 变 true 时自动关闭
watch(
  () => props.disabled,
  (v) => {
    if (v && open.value) close()
  }
)

// 单选 filterable：打开时同步 keyword 为当前 label，方便直接修改筛选
watch(open, (v) => {
  if (v && props.filterable && !props.multiple) {
    keyword.value = displayLabel.value || ''
    nextTick(() => {
      if (searchRef.value) {
        searchRef.value.select?.()
        searchRef.value.focus?.()
      }
    })
  }
})

defineExpose({ focus: () => triggerRef.value?.focus() })
</script>

<style>
/* ===== 触发器 ===== */
.base-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
  padding: 0 32px 0 10px; /* 右侧留给箭头 */
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  user-select: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  outline: none;
  box-sizing: border-box;
}
.base-select--md {
  min-height: 32px;
}
.base-select--sm {
  min-height: 30px;
}

/* 多选有 tag 时允许多行 */
.base-select.is-multiple {
  padding-top: 3px;
  padding-bottom: 3px;
}
.base-select.is-multiple.base-select--md {
  min-height: 32px;
}
.base-select.is-multiple.base-select--sm {
  min-height: 30px;
}

.base-select.is-focus,
.base-select:focus-within {
  border-color: var(--color-primary);
}
.base-select.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

/* ===== value / placeholder ===== */
.base-select__value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
}
.base-select__value.is-placeholder,
.base-select__placeholder {
  color: var(--color-text-tertiary);
  font-size: 13px;
  flex: 1;
  line-height: 1;
}

/* ===== 搜索输入 ===== */
.base-select__search {
  flex: 1;
  min-width: 40px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-text);
  padding: 0;
  cursor: text;
  line-height: 1;
}
.base-select__search::placeholder {
  color: var(--color-text-tertiary);
}
.base-select__search--single {
  width: 100%;
  cursor: pointer;
}
.base-select.is-open .base-select__search--single {
  cursor: text;
}

/* ===== 清空按钮 ===== */
.base-select__clear {
  position: absolute;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 14px;
  line-height: 1;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  flex-shrink: 0;
}
.base-select__clear:hover {
  background: var(--color-hover);
  color: var(--color-text);
}

/* ===== 箭头 ===== */
.base-select__arrow {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  color: var(--color-text-tertiary);
  pointer-events: none;
  transition: transform 0.2s;
  flex-shrink: 0;
}
.base-select.is-open .base-select__arrow {
  transform: translateY(-50%) rotate(180deg);
}

/* ===== 多选 tag ===== */
.base-select__tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  background: var(--color-hover);
  color: var(--color-text);
  line-height: 1.6;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}
.base-select__tag-remove {
  cursor: pointer;
  color: var(--color-text-tertiary);
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.12s;
}
.base-select__tag-remove:hover {
  color: var(--color-text);
}

/* ===== 遮罩 ===== */
.base-select__mask {
  position: fixed;
  inset: 0;
  z-index: 1099;
}

/* ===== 下拉列表 ===== */
.base-select__dropdown {
  position: fixed;
  z-index: 1100;
  min-width: 120px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  font-size: 13px;
}

/* ===== 分组标题 ===== */
.base-select__group-label {
  padding: 6px 10px 4px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

/* ===== 选项 ===== */
.base-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text);
  transition: background 0.1s;
}
.base-select__option:hover,
.base-select__option.is-focused {
  background: var(--color-hover);
}
.base-select__option.is-selected {
  color: var(--color-primary);
  font-weight: 500;
}
.base-select__option.is-selected:hover,
.base-select__option.is-selected.is-focused {
  background: var(--color-hover);
}
.base-select__option.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.base-select__option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 多选末尾勾 ===== */
.base-select__check-mark {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-primary);
  line-height: 1;
}

/* ===== 无结果 ===== */
.base-select__empty {
  padding: 12px 10px;
  color: var(--color-text-tertiary);
  font-size: 13px;
  text-align: center;
}

/* ===== 动画 ===== */
.base-select-drop-enter-active,
.base-select-drop-leave-active {
  transition:
    opacity 0.12s,
    transform 0.12s;
}
.base-select-drop-enter-from,
.base-select-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
