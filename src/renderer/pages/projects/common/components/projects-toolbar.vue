<template>
  <!-- 项目页顶部工具栏：标题 + 计数 + 搜索 + 操作按钮；自管两端对齐布局 -->
  <div class="toolbar">
    <div class="page-title">
      {{ title }}
      <div class="count-wrap">
        <span class="count">
          <template v-if="hasFilter">{{ filteredCount }} /</template>
          {{ totalCount }}
        </span>
      </div>
      <!-- 视图切换：平铺 / 分类，当前项高亮 -->
      <div class="view-switch">
        <button
          type="button"
          class="view-switch__btn"
          :class="{ 'is-active': view === ViewType.FLAT }"
          v-tooltip="'平铺视图'"
          @click="emit('update:view', ViewType.FLAT)"
        >
          <IconViewGrid :size="14" />
        </button>
        <button
          type="button"
          class="view-switch__btn"
          :class="{ 'is-active': view === ViewType.TAGS }"
          v-tooltip="'分类视图'"
          @click="emit('update:view', ViewType.TAGS)"
        >
          <IconViewTags :size="14" />
        </button>
      </div>
    </div>
    <div class="search-box" @focusin="searchFocused = true" @focusout="onSearchBlur">
      <BaseInput
        size="sm"
        :model-value="keyword"
        clearable
        :placeholder="searchPlaceholder"
        @update:model-value="emit('update:keyword', $event)"
      >
        <template #prefix>
          <IconSearch :size="14" />
        </template>
      </BaseInput>
      <!-- #标签 自动补全：键入 # 时展示匹配标签，点击插入 -->
      <div v-if="showTagSuggest" class="tag-suggest">
        <BaseTag
          v-for="t in tagSuggestions"
          :key="t"
          class="tag-suggest__item"
          :label="t"
          hash
          clickable
          @mousedown.prevent="onPickTag(t)"
        />
      </div>
    </div>
    <div class="header-actions">
      <div class="ide-launcher">
        <BaseButton class="square-btn" variant="secondary" size="sm">
          <IconAppLaunch :size="14" />
        </BaseButton>
        <div class="ide-menu">
          <template v-if="ides.length">
            <button
              v-for="ide in ides"
              :key="ide.id"
              type="button"
              class="ide-menu__item"
              @click="emit('launch-ide', ide)"
            >
              启动 {{ ide.name }}
            </button>
          </template>
          <div v-else class="ide-menu__empty">未检测到可用 IDE</div>
        </div>
      </div>
      <BaseButton
        class="square-btn"
        variant="secondary"
        size="sm"
        v-tooltip="addTooltip"
        @click="emit('add')"
      >
        <IconPlus :size="14" />
      </BaseButton>
      <BaseButton
        class="square-btn"
        variant="secondary"
        size="sm"
        v-tooltip="'回到顶部'"
        :disabled="atTop"
        @click="emit('scroll-to-top')"
      >
        <IconArrowUp :size="14" />
      </BaseButton>
      <BaseButton size="sm" :loading="loading" @click="emit('refresh')">
        <template v-if="!loading" #prefix>
          <IconRefresh :size="14" />
        </template>
        {{ loading ? '扫描中...' : '刷新' }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import IconSearch from '@/components/icons/icon-search.vue'
import BaseInput from '@/components/common/base-input.vue'
import BaseButton from '@/components/common/base-button.vue'
import BaseTag from '@/components/common/base-tag.vue'
import IconArrowUp from '@/components/icons/icon-arrow-up.vue'
import IconRefresh from '@/components/icons/icon-refresh.vue'
import IconPlus from '@/components/icons/icon-plus.vue'
import IconAppLaunch from '@/components/icons/icon-app-launch.vue'
import IconViewGrid from '@/components/icons/icon-view-grid.vue'
import IconViewTags from '@/components/icons/icon-view-tags.vue'
import { ViewType } from '@shared/view.js'

const props = defineProps({
  title: { type: String, default: '本地项目' },
  searchPlaceholder: { type: String, default: '搜索项目（路径 / 项目名 / 描述）' },
  addTooltip: { type: String, default: '新增扫描目录，后续可以在配置页中管理' },
  keyword: { type: String, default: '' },
  totalCount: { type: Number, default: 0 },
  filteredCount: { type: Number, default: 0 },
  hasFilter: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  atTop: { type: Boolean, default: true },
  /** 已检测的可用 IDE 列表，用于快速打开下拉 */
  ides: { type: Array, default: () => [] },
  /** 可用标签名，供 #标签 搜索自动补全 */
  tags: { type: Array, default: () => [] },
  /** 当前视图：flat=平铺 / tags=分类 */
  view: { type: String, default: 'flat' }
})
const emit = defineEmits([
  'update:keyword',
  'update:view',
  'scroll-to-top',
  'refresh',
  'add',
  'launch-ide'
])

// ─── #标签 自动补全 ──────────────────────────────────────
const searchFocused = ref(false)
// 匹配输入串末尾正在编辑的 #token（# 后到结尾、不含空格与第二个 #）
const TAG_TOKEN_RE = /#([^\s#]*)$/

const activeTagPartial = computed(() => {
  const m = TAG_TOKEN_RE.exec(props.keyword || '')
  return m ? m[1].toLowerCase() : null
})
const tagSuggestions = computed(() => {
  if (!props.tags.length) return []
  // 正在编辑 #token 时按其内容过滤；否则（含未键入 #）展示全部标签
  const kw = activeTagPartial.value
  const list = kw ? props.tags.filter((t) => t.toLowerCase().includes(kw)) : props.tags
  return list.slice(0, 5)
})
// 只要有标签且搜索框聚焦，就始终展示标签浮层，方便直接点选
const showTagSuggest = computed(() => searchFocused.value && tagSuggestions.value.length > 0)

// 失焦延迟关闭，避免点击建议项时先 blur 导致面板消失
function onSearchBlur() {
  setTimeout(() => {
    searchFocused.value = false
  }, 120)
}

function onPickTag(t) {
  const kw = props.keyword || ''
  // 有正在编辑的 #token 则替换它；否则在末尾追加（必要时补空格分隔）
  let next
  if (TAG_TOKEN_RE.test(kw)) {
    next = kw.replace(TAG_TOKEN_RE, `#${t} `)
  } else {
    const sep = kw && !kw.endsWith(' ') ? ' ' : ''
    next = `${kw}${sep}#${t} `
  }
  emit('update:keyword', next)
}
</script>

<style scoped>
.toolbar {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.search-box {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 280px;
}
/* #标签 建议浮层：紧贴搜索框下方 */
.tag-suggest {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  gap: 2px;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
.tag-suggest__item {
  max-width: none;
  align-self: flex-start;
}
.count-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
}
.count {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-hover);
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
/* 视图切换按钮组：分段控件，激活项高亮 */
.view-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: var(--color-hover);
  border-radius: var(--radius-md);
}
.view-switch__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.view-switch__btn:hover {
  color: var(--color-text);
}
.view-switch__btn.is-active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}
.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.header-actions :deep(.base-btn.square-btn) {
  width: 28px;
  padding: 0;
}
/* IDE 快速打开：hover 容器展开下拉，菜单紧贴按钮下方避免悬停断连 */
.ide-launcher {
  position: relative;
  display: inline-flex;
}
.ide-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 60;
  min-width: 140px;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition:
    opacity 0.12s,
    transform 0.12s,
    visibility 0.12s;
}
.ide-launcher:hover .ide-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.ide-menu__item {
  display: block;
  width: 100%;
  padding: 7px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.12s;
}
.ide-menu__item:hover {
  background: var(--color-hover);
}
.ide-menu__empty {
  padding: 7px 12px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}
</style>
