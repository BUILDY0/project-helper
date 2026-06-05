<template>
  <!-- Lucide - chevron-up (ISC) -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
</template>
<script setup>
defineProps({ size: { type: [Number, String], default: 16 } })
</script>
