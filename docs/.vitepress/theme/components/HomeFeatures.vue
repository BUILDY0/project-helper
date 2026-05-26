<template>
  <!-- 居中 Features 卡片网格：作为 home 布局自带 features 的替代
       - items: { icon?, title, details }[]
       支持把 features 自由放在 markdown body 任意位置（如 banner 后） -->
  <section class="home-features">
    <div class="home-features-grid">
      <article v-for="(item, i) in items" :key="i" class="home-feature">
        <div v-if="item.icon" class="home-feature-icon">{{ item.icon }}</div>
        <h2 class="home-feature-title">{{ item.title }}</h2>
        <p class="home-feature-details">{{ item.details }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true }
})
</script>

<style scoped>
.home-features {
  max-width: 1152px;
  margin: 32px auto 0;
  padding: 0 24px;
}
.home-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.home-feature {
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  transition:
    border-color 0.2s,
    background-color 0.2s,
    transform 0.2s;
}
.home-feature:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-elv);
  transform: translateY(-2px);
}
.home-feature-icon {
  font-size: 24px;
  margin-bottom: 12px;
}
.home-feature-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 8px;
  line-height: 1.3;
  /* 抑制 VitePress vp-doc 默认的 h2 上边线/上间距 */
  border-top: 0;
  padding-top: 0;
}
.home-feature-details {
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0;
}
</style>
