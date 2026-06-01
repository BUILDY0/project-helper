<template>
  <svg :width="size" :height="size" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 3l5 5h-3v5H6V8H3l5-5z" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 14 }
})
</script>
