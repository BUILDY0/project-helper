<template>
  <!-- 同时渲染 light/dark 两张图，靠 CSS 命中 <html class="dark"> 切换；避免首次进入 dark 时的图片闪烁，并让两张图都能被预加载 -->
  <section class="home-banner">
    <picture class="home-banner-pic">
      <img
        class="home-banner-img is-light"
        :src="lightSrc"
        :alt="alt"
        decoding="async"
        fetchpriority="high"
      />
      <img
        class="home-banner-img is-dark"
        :src="darkSrc"
        :alt="alt"
        decoding="async"
        fetchpriority="high"
      />
    </picture>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps({
  // 浅色主题图片地址（相对站点根，自动带上 vitepress 的 base 前缀）
  src: { type: String, default: '/banner-light.png' },
  // 深色主题图片地址
  srcDark: { type: String, default: '/banner-dark.png' },
  alt: { type: String, default: '' }
})

// withBase 会自动拼接 vitepress 配置中的 base（如 /project-helper/），
// 调用方只传站点内绝对路径即可，避免在组件里硬编码部署路径。
const lightSrc = computed(() => withBase(props.src))
const darkSrc = computed(() => withBase(props.srcDark))
</script>

<style scoped>
.home-banner {
  max-width: 1024px;
  margin: 32px auto 0;
  padding: 0 24px;
  text-align: center;
}
.home-banner-pic {
  /* 两张图叠在同一 grid 格内，避免主题切换时容器高度跳变 */
  display: grid;
  grid-template-columns: 1fr;
}
.home-banner-img {
  grid-area: 1 / 1;
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
.home-banner-img.is-dark {
  display: none;
}
</style>

<!--
  跟 <html class="dark"> 联动的样式必须放在非 scoped 块里：
  scoped 会给选择器加 hash，导致祖先 .dark 与本组件类名联合命中失效。
  类名 .home-banner-img 足够独特，全局作用域不会污染其它组件。
-->
<style>
.dark .home-banner-img.is-light {
  display: none;
}
.dark .home-banner-img.is-dark {
  display: block;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 12px 32px -8px rgba(0, 0, 0, 0.5);
}
</style>
