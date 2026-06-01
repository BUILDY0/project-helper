<template>
  <!-- refresh-cw：单段 C 形圆弧 + 顺时针箭头（用于"立即检查更新"） -->
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.74 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 16 }
})
</script>
