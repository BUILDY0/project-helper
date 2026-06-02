<template>
  <!--
    未保存提示弹窗：基于 BaseConfirmDialog 的薄包装
    - 在标准的"取消 / 确认"两按钮之上多出一个"放弃"按钮，专用于"切走前提醒保存"场景
    - 三按钮场景文案稍长，宽度调到 400px 防止换行
  -->
  <BaseConfirmDialog
    :visible="visible"
    :title="title"
    :message="message"
    :width="400"
    @cancel="$emit('cancel')"
  >
    <template #actions>
      <BaseButton @click="$emit('cancel')">{{ cancelText }}</BaseButton>
      <BaseButton @click="$emit('discard')">{{ discardText }}</BaseButton>
      <BaseButton variant="primary" @click="$emit('confirm')">{{ confirmText }}</BaseButton>
    </template>
  </BaseConfirmDialog>
</template>

<script setup>
import BaseConfirmDialog from './base-confirm-dialog.vue'
import BaseButton from './base-button.vue'

defineProps({
  visible: Boolean,
  title: { type: String, default: '提示' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '保存' },
  discardText: { type: String, default: '放弃' },
  cancelText: { type: String, default: '取消' }
})
defineEmits(['confirm', 'discard', 'cancel'])
</script>
