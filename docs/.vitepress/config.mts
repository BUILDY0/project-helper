import { defineConfig } from 'vitepress'

// VitePress 站点配置
// - base：与 GitHub Pages 仓库路径保持一致（/project-helper/）
// - 站点构建产物默认输出到 docs/.vitepress/dist
// 使用 .mts 后缀以强制 ESM 解析，避免 vitepress（纯 ESM）被当作 CJS 加载
export default defineConfig({
  title: 'Project Helper',
  description: '本地开发项目管理器：扫描本地项目并用 VSCode 一键打开',
  lang: 'zh-CN',
  base: '/project-helper/',

  // 显式声明输出目录，避免日后被其他工具误读默认值
  outDir: '.vitepress/dist',

  // 关闭 lastUpdated：当前页面较少且更新频率低，避免底部展示"最后更新"
  lastUpdated: false,

  /**
   * 排除非站点用途的 markdown，避免被 VitePress 误当作页面收录。
   *
   * 设计为「黑名单 + 仅放真实站点 md 在 docs/」的双保险：
   * 1) 开发规划等 dev 文档统一放仓库根目录（如 feat.md / TODO.md），不进 docs/。
   * 2) 这里再补一道防线，挡掉常见的 README/CHANGELOG/CONTRIBUTING 等公共文件。
   */
  srcExclude: [
    '**/README.md',
    '**/CONTRIBUTING.md',
    '**/CHANGELOG.md',
    '**/TODO.md',
    '**/NOTES.md'
  ],

  // <head> 注入：favicon / OG / Twitter Card，便于分享与浏览器识别
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/project-helper/logo.png' }],
    ['meta', { name: 'theme-color', content: '#f0c14b' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Project Helper' }],
    ['meta', {
      property: 'og:description',
      content: '本地开发项目管理器：扫描本地项目并用 VSCode 一键打开'
    }],
    ['meta', {
      property: 'og:image',
      content: 'https://buildy0.github.io/project-helper/banner.png'
    }],
    ['meta', { property: 'og:url', content: 'https://buildy0.github.io/project-helper/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
  ],

  themeConfig: {
    // 顶部导航栏左侧 logo（从 docs/public/logo.png 提供，部署后路径为 base + logo.png）
    logo: '/logo.png',

    // 顶部导航
    nav: [
      { text: '首页', link: '/' },
      { text: '配置', link: '/guide/config', activeMatch: '^/guide/' },
      { text: '更新日志', link: '/changelog/', activeMatch: '^/changelog/' }
    ],

    // 右上角社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/BUILDY0/project-helper' }
    ],

    // 主题切换提示文案（深色/浅色）
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色主题',
    darkModeSwitchTitle: '切换到深色主题',

    outline: {
      label: '本页目录',
      level: [2, 3]
    },

    // 'left' 让 outline 显示在左侧；true/false 控制是否显示
    aside: 'left',

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    }
  }
})
