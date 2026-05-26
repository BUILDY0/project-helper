<template>
  <!-- 居中展示首页 banner 图片：圆角 + 阴影 + 主题色边框 -->
  <section class="home-banner">
    <img class="home-banner-img" :src="src" :alt="alt" loading="lazy" />
  </section>
</template>

<script setup>
defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' }
})
</script>

<style scoped>
.home-banner {
  max-width: 1024px;
  margin: 32px auto 0;
  padding: 0 24px;
  text-align: center;
}
.home-banner-img {
  display: block;
  width: 100%;
  height: auto;
  margin: 0 auto;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 12px 32px -8px rgba(0, 0, 0, 0.1);
  background: var(--vp-c-bg-soft);
}
.dark .home-banner-img {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 12px 32px -8px rgba(0, 0, 0, 0.5);
}
</style>
