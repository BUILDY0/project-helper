<template>
  <!--
    扫描目录 / 排除目录 / 置顶项目三个列表共用的项模板。
    - #prefix：路径前的小图标（如置顶星标）
    - #middle：路径与移除按钮之间的扩展位（如"强制命中"开关）
  -->
  <div class="list-item">
    <slot name="prefix" />
    <span class="path-text" v-tooltip.overflow="path">{{ path }}</span>
    <slot name="middle" />
    <BaseButton
      v-if="openable"
      variant="icon"
      size="xs"
      class="open-btn"
      v-tooltip="'打开目录'"
      @click="emit('open')"
    >
      <IconFileTray :size="14" />
    </BaseButton>
    <BasePopconfirm :message="removeMessage" @confirm="emit('remove')">
      <BaseButton variant="icon" size="xs" class="remove-btn" v-tooltip="'移除'">×</BaseButton>
    </BasePopconfirm>
  </div>
</template>

<script setup>
import BasePopconfirm from '@/components/common/base-popconfirm.vue'
import BaseButton from '@/components/common/base-button.vue'
import IconFileTray from '@/components/icons/icon-file-tray.vue'

defineProps({
  path: { type: String, required: true },
  removeMessage: { type: String, default: '确认移除该项？' },
  /** 显示「打开目录」按钮（仅本地目录类列表需要） */
  openable: { type: Boolean, default: false }
})
const emit = defineEmits(['remove', 'open'])
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
/* 打开目录按钮：与移除按钮同款 icon xs，置于移除按钮左侧 */
.open-btn {
  color: var(--color-text-tertiary);
  margin-right: 4px;
}
.open-btn:hover:not(:disabled) {
  color: var(--color-text);
}
/* 移除按钮：基于 BaseButton icon xs，移除态 hover 用 danger 色提示破坏性 */
.remove-btn {
  font-size: 16px;
  color: var(--color-text-tertiary);
  margin-top: -3px;
}
.remove-btn:hover:not(:disabled) {
  color: var(--color-danger);
}
</style>
