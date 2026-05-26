---
layout: home

hero:
  name: Project Helper
  text: 本地开发项目管理器
  tagline: 一个基于 Vue 3 + Electron + Vite 的 Windows 桌面应用
  actions:
    - theme: brand
      text: 下载
      link: https://github.com/BUILDY0/project-helper/releases
    - theme: alt
      text: 配置说明
      link: /guide/config
    - theme: alt
      text: 更新日志
      link: /changelog/
---

<HomeBanner src="/project-helper/banner.png" alt="Project Helper 应用截图" />

<HomeFeatures
  :items="[
    { title: '一键扫描', details: '配置多个根目录与扫描深度，自动识别本地项目并展示。' },
    { title: '快速打开', details: '双击/右键即可使用 VSCode 等 IDE 打开项目目录。' },
    { title: '置顶 & 排除', details: '支持置顶常用项目、排除指定目录，列表更清爽。' },
    { title: '自动更新', details: '接入 electron-updater，新版本发布后自动检查并提示更新。' }
  ]"
/>

<HomeLinkGrid
  title="快速链接"
  :items="[
    {
      icon: '⬇',
      title: '去下载',
      desc: '前往 GitHub Releases 下载最新版',
      link: 'https://github.com/BUILDY0/project-helper/releases'
    },
    {
      svg: '<svg viewBox=\'0 0 24 24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18a10.97 10.97 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z\'/></svg>',
      title: '去 GitHub',
      desc: 'BUILDY0/project-helper',
      link: 'https://github.com/BUILDY0/project-helper'
    }
  ]"
/>
