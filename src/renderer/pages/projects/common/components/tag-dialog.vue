<template>
  <!-- 打标签弹窗：多选 + 可输入 + 可新增 + 可搜索筛选 -->
  <BaseConfirmDialog
    :visible="visible"
    title="打标签"
    close-icon
    confirm-text="确认"
    confirm-tone="primary"
    :width="420"
    @cancel="emit('cancel')"
    @confirm="onConfirm"
  >
    <div class="tag-dialog__body">
      <BaseSelect
        v-model="selected"
        :options="options"
        multiple
        filterable
        allow-create
        clearable
        placeholder="选择已有标签，或输入后回车新增"
      />
    </div>
  </BaseConfirmDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseConfirmDialog from '@/components/common/base-confirm-dialog.vue'
import BaseSelect from '@/components/common/base-select.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  /** 全部可选标签名 */
  tags: { type: Array, default: () => [] },
  /** 当前项目已关联的标签名 */
  value: { type: Array, default: () => [] }
})
const emit = defineEmits(['cancel', 'confirm'])

const selected = ref([])

const options = computed(() => props.tags.map((t) => ({ label: t, value: t })))

// 每次打开时用最新的 value 初始化，避免上次编辑残留
watch(
  () => props.visible,
  (vis) => {
    if (vis) selected.value = [...props.value]
  },
  { immediate: true }
)

function onConfirm() {
  emit('confirm', [...selected.value])
}
</script>

<style scoped>
.tag-dialog__body {
  padding: 4px 0;
}
</style>
