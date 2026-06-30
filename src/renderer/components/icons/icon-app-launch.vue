<template>
  <!-- Fluent UI - ApprovalsApp28Regular (MIT) -->
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      d="M18.492 2.33l3.179 3.18a2.25 2.25 0 0 1 0 3.182l-2.423 2.422A2.501 2.501 0 0 1 21 13.501v5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3h5c1.121 0 2.07.737 2.387 1.754l2.423-2.424a2.25 2.25 0 0 1 3.182 0zM11 13H5v5.5a.5.5 0 0 0 .5.5H11v-6zm7.5 0H13v6h5.5a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5zm-4.06-2L13 9.56V11h1.44zM10.5 5h-5a.5.5 0 0 0-.5.5V11h6V5.5a.5.5 0 0 0-.5-.5z"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 14 }
})
</script>
