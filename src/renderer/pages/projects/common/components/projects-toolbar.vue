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
    </div>
    <BaseInput
      class="search-box"
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
import IconSearch from '@/components/icons/icon-search.vue'
import BaseInput from '@/components/common/base-input.vue'
import BaseButton from '@/components/common/base-button.vue'
import IconArrowUp from '@/components/icons/icon-arrow-up.vue'
import IconRefresh from '@/components/icons/icon-refresh.vue'
import IconPlus from '@/components/icons/icon-plus.vue'
import IconAppLaunch from '@/components/icons/icon-app-launch.vue'

defineProps({
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
  ides: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:keyword', 'scroll-to-top', 'refresh', 'add', 'launch-ide'])
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
.count-wrap {
  width: 72px;
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
