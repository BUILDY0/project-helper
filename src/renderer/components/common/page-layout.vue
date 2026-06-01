<template>
  <!-- 路由级页面通用骨架：标题/工具栏区 + 可滚动主体；header 内部布局由业务页自行实现 -->
  <section class="page">
    <div class="page-header">
      <slot name="header" />
    </div>
    <div ref="bodyRef" class="page-body" @scroll="(e) => emit('scroll', e)">
      <slot />
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['scroll'])

const bodyRef = ref(null)

defineExpose({
  /** 滚动容器 DOM ref：父级可调用 scrollTo / 读取 scrollTop */
  bodyRef
})
</script>

<style scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px 22px;
}
/* 骨架仅占位：高度自适应 + 与下方主体的固定间距；具体内部布局交给 #header 内的业务组件自行决定 */
.page-header {
  flex-shrink: 0;
  margin-bottom: 14px;
}
.page-body {
  flex: 1;
  overflow-y: auto;
  /* 顶部留白：卡片 hover 时 transform: translateY(-1px) 上抬，并伴随阴影外溢，
     若顶部紧贴容器边缘会被 overflow 裁切；这里给一点缓冲空间避免溢出截断 */
  padding-top: 4px;
}
</style>
