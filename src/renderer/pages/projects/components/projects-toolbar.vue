<template>
  <!-- 项目页顶部工具栏：标题 + 计数 + 搜索 + 回到顶部 + 刷新；自管两端对齐布局 -->
  <div class="toolbar">
    <div class="page-title">
      我的项目
      <!-- 用定宽容器包裹 count，避免筛选时数字位数变化导致后面元素位移 -->
      <div class="count-wrap">
        <span class="count">
          <template v-if="hasFilter">{{ filteredCount }} /</template>
          {{ totalCount }}
        </span>
      </div>
      <!-- 搜索框：紧挨项目数，留一点间距 -->
      <div class="search-box">
        <IconSearch class="search-icon" :size="14" />
        <input
          :value="keyword"
          class="search-input"
          type="text"
          placeholder="搜索项目（路径 / 项目名 / 描述）"
          @input="emit('update:keyword', $event.target.value)"
        />
        <button
          v-if="keyword"
          class="search-clear"
          v-tooltip="'清空'"
          @click="emit('update:keyword', '')"
        >
          ×
        </button>
      </div>
    </div>
    <div class="header-actions">
      <button
        class="icon-action"
        v-tooltip="'回到顶部'"
        :disabled="atTop"
        @click="emit('scroll-to-top')"
      >
        <IconArrowUp :size="14" />
      </button>
      <button class="refresh-btn" :disabled="loading" @click="emit('refresh')">
        <IconRefresh :size="14" :class="{ spin: loading }" />
        <span>{{ loading ? '扫描中...' : '刷新' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import IconSearch from '@/components/icons/icon-search.vue'
import IconArrowUp from '@/components/icons/icon-arrow-up.vue'
import IconRefresh from '@/components/icons/icon-refresh.vue'

defineProps({
  keyword: { type: String, default: '' },
  totalCount: { type: Number, default: 0 },
  filteredCount: { type: Number, default: 0 },
  /** 是否处于过滤状态（决定徽标显示「filtered / total」还是「total」） */
  hasFilter: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  atTop: { type: Boolean, default: true }
})
const emit = defineEmits(['update:keyword', 'scroll-to-top', 'refresh'])
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
  height: 30px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.search-box:focus-within {
  border-color: var(--color-primary);
}
.search-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-text);
  user-select: text;
}
.search-input::placeholder {
  color: var(--color-text-tertiary);
}
.search-clear {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: 14px;
  line-height: 1;
  border-radius: 50%;
  /* 用 flex 居中字符，避免基线偏移 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.search-clear:hover {
  background: var(--color-hover);
  color: var(--color-text);
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
.icon-action {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  transition:
    background 0.15s,
    color 0.15s,
    opacity 0.15s;
}
.icon-action:hover:not(:disabled) {
  background: var(--color-hover);
}
.icon-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  transition: background 0.15s;
}
.refresh-btn:hover:not(:disabled) {
  background: var(--color-hover);
}
.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
