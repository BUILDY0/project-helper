<template>
  <!-- 居中链接卡片网格：用于在 home 布局下放置一组并列的外链/内链
       - items: { icon?, svg?, title, desc?, link }[]
         - icon: 文字/emoji（短文本）
         - svg:  原始 SVG 字符串（优先于 icon） -->
  <section class="home-link-grid-wrap">
    <h2 v-if="title" class="home-link-grid-title">{{ title }}</h2>
    <div class="home-link-grid">
      <a
        v-for="(item, i) in items"
        :key="i"
        class="home-link-card"
        :href="item.link"
        :target="isExternal(item.link) ? '_blank' : '_self'"
        :rel="isExternal(item.link) ? 'noopener noreferrer' : undefined"
      >
        <span v-if="item.svg || item.icon" class="home-link-icon" aria-hidden="true">
          <span v-if="item.svg" v-html="item.svg" class="home-link-icon-svg" />
          <template v-else>{{ item.icon }}</template>
        </span>
        <span class="home-link-text">
          <span class="home-link-title">{{ item.title }}</span>
          <span v-if="item.desc" class="home-link-desc">{{ item.desc }}</span>
        </span>
        <span v-if="isExternal(item.link)" class="home-link-arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  items: { type: Array, required: true }
})

/** 判断是否外链：以 http(s) 开头视为外链 */
function isExternal(url) {
  return /^https?:\/\//i.test(url || '')
}
</script>

<style scoped>
.home-link-grid-wrap {
  max-width: 880px;
  margin: 48px auto 96px;
  padding: 0 24px;
  text-align: center;
}
.home-link-grid-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
  margin: 0 0 24px;
  line-height: 1.2;
  border-top: 0;
  padding-top: 0;
}
.home-link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.home-link-card {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  text-align: left;
  text-decoration: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  transition:
    border-color 0.2s,
    transform 0.2s,
    background 0.2s;
}
.home-link-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-elv);
  transform: translateY(-2px);
}
.home-link-icon {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.home-link-icon-svg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}
.home-link-icon-svg :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor;
}
.home-link-text {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.home-link-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}
.home-link-desc {
  font-size: 13px;
  line-height: 1.4;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.home-link-arrow {
  flex: 0 0 auto;
  color: var(--vp-c-text-3);
  font-size: 14px;
}
</style>
