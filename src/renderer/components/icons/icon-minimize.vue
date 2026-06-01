<template>
  <!-- chrome-minimize：圆角端点的细横线 -->
  <svg :width="size" :height="size" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path
      d="M3 7.5C3 7.22386 3.22386 7 3.5 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.5C3.22386 8 3 7.77614 3 7.5Z"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 16 }
})
</script>
