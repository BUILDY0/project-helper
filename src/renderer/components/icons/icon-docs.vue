<template>
  <!-- 文档：方框 + 内含横线（codicons book 风格） -->
  <svg :width="size" :height="size" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path
      d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h8.75a.75.75 0 0 0 0-1.5H3.5a.5.5 0 0 1 0-1h8.75A.75.75 0 0 0 13 10.75V2.75A.75.75 0 0 0 12.25 2H3.5Zm0 1.5h8v6.5h-8V3.5Zm1.25 1.25A.75.75 0 0 1 5.5 4h4.75a.75.75 0 0 1 0 1.5H5.5a.75.75 0 0 1-.75-.75Zm0 2A.75.75 0 0 1 5.5 6h3.25a.75.75 0 0 1 0 1.5H5.5a.75.75 0 0 1-.75-.75Z"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 14 }
})
</script>
