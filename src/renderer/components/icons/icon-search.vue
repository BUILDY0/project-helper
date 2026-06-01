<template>
  <svg :width="size" :height="size" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M11.7 10.3a5 5 0 1 0-1.4 1.4l3 3 1.4-1.4-3-3zM7 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 14 }
})
</script>
