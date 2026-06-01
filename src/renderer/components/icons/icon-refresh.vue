<template>
  <!-- 顺时针刷新：箭头位于右上、开口朝右上，配合 CSS 360deg 顺时针动画 -->
  <svg :width="size" :height="size" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 3a5 5 0 1 0 4.546 2.914l1.378-.638A6.5 6.5 0 1 1 8 1.5V0l3 2.5L8 5V3z" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 14 }
})
</script>
