<template>
  <!-- Carbon NewTab (Apache 2.0), adapted: filled frame + plus overlay -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    viewBox="0 0 32 32"
    :width="size"
    :height="size"
    class="icon"
  >
    <g fill="none">
      <path
        d="M26 26H6V6h10V4H6a2.002 2.002 0 0 0-2 2v20a2.002 2.002 0 0 0 2 2h20a2.002 2.002 0 0 0 2-2V16h-2z"
        fill="currentColor"
      />
      <path d="M26 6V2h-2v4h-4v2h4v4h2V8h4V6h-4z" fill="currentColor" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 32 }
})
</script>

<style scoped>
.icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
