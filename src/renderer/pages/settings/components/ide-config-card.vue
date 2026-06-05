<template>
  <SettingFieldGroup>
    <!-- ===== 默认 IDE 配置 ===== -->
    <SettingFieldSection label="默认 IDE 配置">
      <div class="ide-row">
        <BaseSelect
          v-model="localDefault"
          :options="defaultIdeOptions"
          :disabled="availableIdes.length === 0"
          :placeholder="availableIdes.length === 0 ? '无可选 IDE' : '请选择'"
          clearable
          class="ide-select"
          :class="{ 'is-error': defaultError }"
        />
        <span class="ide-hint">双击项目 / 托盘打开项目所使用的 IDE</span>
      </div>
      <div v-if="defaultError" class="ide-error-msg">{{ defaultError }}</div>
    </SettingFieldSection>

    <!-- ===== 排除多 IDE ===== -->
    <SettingFieldSection label="排除多 IDE 使用">
      <div class="ide-row">
        <BaseSelect
          v-model="localExclude"
          :options="excludeIdeOptions"
          :disabled="availableIdes.length === 0"
          :placeholder="availableIdes.length === 0 ? '无可选 IDE' : '请选择'"
          multiple
          clearable
          class="ide-select"
        />
        <span class="ide-hint">右键项目的菜单中排除不期望展示的 IDE 选项</span>
      </div>
    </SettingFieldSection>

    <!-- ===== 自定义 IDE 脚本 ===== -->
    <SettingFieldSection label="自定义 IDE 脚本">
      <template #actions>
        <BaseButton
          variant="text"
          inline
          :disabled="!localExtends.length"
          @click="$emit('clear-extends')"
        >
          清空
        </BaseButton>
        <BaseButton variant="text" inline @click="$emit('add-extend')">+ 新增</BaseButton>
      </template>

      <div v-if="!localExtends.length" class="empty-tip">
        暂未配置自定义 IDE 脚本，配置后可以在右键项目的菜单中使用
      </div>
      <table v-else class="ide-table">
        <thead>
          <tr>
            <th>IDE 名称</th>
            <th>程序入口</th>
            <th>菜单文字</th>
            <th>脚本代码</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in localExtends" :key="i">
            <td>{{ item.name }}</td>
            <td>
              <code class="ide-code">{{ item.entry }}</code>
            </td>
            <td>{{ item.label }}</td>
            <td>
              <code class="ide-code">{{ item.script }}</code>
            </td>
            <td class="ide-table-actions">
              <BaseButton
                variant="icon"
                size="xs"
                :disabled="i === 0"
                v-tooltip="'上移'"
                @click="$emit('move-up', i)"
              >
                <IconChevronUp :size="13" />
              </BaseButton>
              <BaseButton
                variant="icon"
                size="xs"
                :disabled="i === localExtends.length - 1"
                v-tooltip="'下移'"
                @click="$emit('move-down', i)"
              >
                <IconChevronDown :size="13" />
              </BaseButton>
              <BaseButton
                variant="icon"
                size="xs"
                v-tooltip="'编辑脚本'"
                @click="$emit('edit-extend', i)"
              >
                <IconEdit :size="13" />
              </BaseButton>
              <BaseButton
                variant="icon"
                size="xs"
                v-tooltip="'删除脚本'"
                @click="$emit('remove-extend', i)"
              >
                <IconTrash :size="13" />
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </SettingFieldSection>
  </SettingFieldGroup>
</template>

<script setup>
import { computed, watch } from 'vue'
import SettingFieldGroup from './setting-field-group.vue'
import SettingFieldSection from './setting-field-section.vue'
import BaseSelect from '@/components/common/base-select.vue'
import BaseButton from '@/components/common/base-button.vue'
import IconChevronUp from '@/components/icons/icon-chevron-up.vue'
import IconChevronDown from '@/components/icons/icon-chevron-down.vue'
import IconEdit from '@/components/icons/icon-edit.vue'
import IconTrash from '@/components/icons/icon-trash.vue'

const props = defineProps({
  detectedIdes: { type: Array, default: () => [] },
  modelDefault: { type: String, default: '' },
  modelExclude: { type: Array, default: () => [] },
  modelExtends: { type: Array, default: () => [] }
})

const emit = defineEmits([
  'update:modelDefault',
  'update:modelExclude',
  'update:modelExtends',
  'add-extend',
  'edit-extend',
  'remove-extend',
  'move-up',
  'move-down',
  'clear-extends',
  'request-save-default'
])

const localDefault = computed({
  get: () => props.modelDefault,
  set: (v) => emit('update:modelDefault', v)
})
const localExclude = computed({
  get: () => props.modelExclude,
  set: (v) => emit('update:modelExclude', v)
})
const localExtends = computed(() => props.modelExtends)

const availableIdes = computed(() => props.detectedIdes.filter((x) => x.available))

const defaultIdeOptions = computed(() =>
  availableIdes.value.map((ide) => ({ label: ide.name, value: ide.id }))
)
const excludeIdeOptions = computed(() =>
  availableIdes.value.map((ide) => ({ label: ide.name, value: ide.id }))
)

/**
 * 监听 availableIdes 变化：清理 exclude 无效 id；default 空/无效时切到第一个并触发写盘。
 */
watch(
  () => [availableIdes, props.modelExclude, props.modelDefault],
  () => {
    if (!availableIdes.value.length) return
    const list = availableIdes.value
    const idSet = new Set(list.map((x) => x.id))
    let needSave = false

    // 清理 exclude 无效 id
    const validExclude = (props.modelExclude || []).filter((id) => idSet.has(id))
    if (validExclude.length !== (props.modelExclude || []).length) {
      emit('update:modelExclude', validExclude)
      needSave = true
    }

    // default 无值或不在可用列表中，自动切到第一个
    const defaultValid = props.modelDefault && idSet.has(props.modelDefault)
    if (!defaultValid) {
      emit('update:modelDefault', list[0].id)
      needSave = true
    }
    if (needSave) {
      emit('request-save-default')
    }
  },
  { immediate: true }
)

const defaultError = computed(() => {
  if (!props.modelDefault || !availableIdes.value.length) return ''
  const found = availableIdes.value.find((x) => x.id === props.modelDefault)
  if (found) return ''
  const first = availableIdes.value[0]
  return first
    ? `默认 IDE 未检测到，已为你切换到 ${first.name}`
    : '当前系统没有可以使用的 IDE，默认行为变为直接打开项目目录'
})
</script>

<style scoped>
.ide-row {
  display: flex;
  gap: 10px;
  flex-direction: column;
}
.ide-select {
  flex: 1;
  min-width: 0;
  max-width: 300px;
}
/* 红边框错误态 */
:deep(.ide-select.is-error .base-select) {
  border-color: var(--color-danger);
}
.ide-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  white-space: nowrap;
}
.ide-error-msg {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-danger);
}

/* 表格 */
.ide-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.ide-table th,
.ide-table td {
  padding: 7px 10px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.ide-table th {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 11px;
  background: var(--color-surface-2);
}
.ide-table tbody tr:last-child td {
  border-bottom: none;
}
.ide-table tbody tr:hover {
  background: var(--color-hover);
}
.ide-table tbody tr:hover td {
  background: transparent;
}
.ide-table-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  max-width: unset;
}
.ide-code {
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 11px;
  color: var(--color-text-secondary);
  background: var(--color-hover);
  border-radius: 3px;
  padding: 1px 5px;
}

.empty-tip {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
