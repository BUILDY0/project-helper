<template>
  <!-- 项目页顶部工具栏：标题 + 计数 + 搜索 + 回到顶部 + 刷新；自管两端对齐布局 -->
  <div class="toolbar">
    <div class="page-title">
      本地项目
      <!-- 用定宽容器包裹 count，避免筛选时数字位数变化导致后面元素位移 -->
      <div class="count-wrap">
        <span class="count">
          <template v-if="hasFilter">{{ filteredCount }} /</template>
          {{ totalCount }}
        </span>
      </div>
      <!-- 搜索框：紧挨项目数，留一点间距 -->
      <BaseInput
        class="search-box"
        size="sm"
        :model-value="keyword"
        clearable
        placeholder="搜索项目（路径 / 项目名 / 描述）"
        @update:model-value="emit('update:keyword', $event)"
      >
        <template #prefix>
          <IconSearch :size="14" />
        </template>
      </BaseInput>
    </div>
    <div class="header-actions">
      <!-- 工具栏一级图标按钮：复用 secondary 的描边/背景/文字色，与右侧「刷新」对等；
           仅在业务层把宽度收成方形（28×28），避免使用 icon variant 的透明浮层观感 -->
      <BaseButton
        class="square-btn"
        variant="secondary"
        size="sm"
        v-tooltip="'新增扫描目录，后续可以在配置页中管理'"
        @click="emit('add-scan-dir')"
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

defineProps({
  keyword: { type: String, default: '' },
  totalCount: { type: Number, default: 0 },
  filteredCount: { type: Number, default: 0 },
  /** 是否处于过滤状态（决定徽标显示「filtered / total」还是「total」） */
  hasFilter: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  atTop: { type: Boolean, default: true }
})
const emit = defineEmits(['update:keyword', 'scroll-to-top', 'refresh', 'add-scan-dir'])
</script>

<style scoped>
/* 工具栏自身负责两端对齐：左侧标题区（标题 + 计数 + 搜索）+ 右侧 header-actions */
.toolbar {
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

/* 搜索框：紧跟项目数右侧，与标题留 8px 间距，固定宽度避免抢占其它操作空间 */
.search-box {
  margin-left: 8px;
  width: 260px;
}

/* 包裹 count 的固定宽度容器，避免筛选时数字位数变化引起后续元素位移 */
.count-wrap {
  width: 72px;
  display: inline-flex;
  align-items: center;
  /* 左对齐，紧跟 "我的项目" 四个字之后 */
  justify-content: flex-start;
}
.count {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-hover);
  padding: 2px 8px;
  border-radius: 999px;
  /* count 自身保持紧凑，由 .count-wrap 占位 */
  white-space: nowrap;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 工具栏内的方形图标按钮：宽度跟随高度，去掉横向 padding；
   color/border/background/hover 全部继承 BaseButton 的 secondary 规则，与「刷新」对齐 */
.header-actions :deep(.base-btn.square-btn) {
  width: 28px;
  padding: 0;
}
</style>
