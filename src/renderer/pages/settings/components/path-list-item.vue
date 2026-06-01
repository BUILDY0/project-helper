<template>
  <!--
    扫描目录 / 排除目录 / 置顶项目三个列表共用的项模板。
    - #prefix：路径前的小图标（如置顶星标）
    - #middle：路径与移除按钮之间的扩展位（如"强制命中"开关）
  -->
  <li class="list-item">
    <slot name="prefix" />
    <span class="path-text" v-tooltip.overflow="path">{{ path }}</span>
    <slot name="middle" />
    <Popconfirm :message="removeMessage" @confirm="emit('remove')">
      <button class="icon-btn" v-tooltip="'移除'">×</button>
    </Popconfirm>
  </li>
</template>

<script setup>
import Popconfirm from '@/components/common/popconfirm.vue'

defineProps({
  path: { type: String, required: true },
  removeMessage: { type: String, default: '确认移除该项？' }
})
const emit = defineEmits(['remove'])
</script>

<style scoped>
.list-item {
  display: flex;
  align-items: center;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  font-size: 13px;
}
.path-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text);
  user-select: text;
}
.icon-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
  font-size: 16px;
  line-height: 1;
  transition:
    background 0.15s,
    color 0.15s;
}
.icon-btn:hover {
  background: var(--color-hover);
  color: var(--color-danger);
}
</style>
