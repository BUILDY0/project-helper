<template>
  <!-- 分类视图：每个分组占一行，标题 + 计数，卡片由父级通过作用域插槽渲染 -->
  <div class="project-groups">
    <section v-for="g in groups" :key="g.key" class="project-group">
      <div class="project-group__header">
        <span class="project-group__name">{{ g.label }}</span>
        <span class="project-group__count">{{ g.projects.length }}</span>
      </div>
      <div class="grid">
        <template v-for="p in g.projects" :key="`${g.key}::${itemKey(p)}`">
          <slot :project="p" />
        </template>
      </div>
    </section>
  </div>
</template>

<script setup>
defineProps({
  /** 分组数组，见 use-project-groups.js */
  groups: { type: Array, default: () => [] },
  /** 取项目唯一 key，用于同分组内 v-for（同项目可跨分组，故 key 拼上分组 key） */
  itemKey: { type: Function, default: (p) => p?.path ?? p?.id }
})
</script>

<style scoped>
.project-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.project-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.project-group__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}
.project-group__count {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-hover);
  padding: 1px 8px;
  border-radius: 999px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
</style>
