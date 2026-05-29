---
layout: home

hero:
  name: Project Helper
  text: 开发项目本地管理器
  tagline: 一个基于 Vue 3 + Electron + Vite 的 Windows 桌面应用
  actions:
    - theme: brand
      text: 去下载
      link: https://github.com/BUILDY0/project-helper/releases
    - theme: alt
      text: 配置说明
      link: /guide/config
    - theme: alt
      text: 更新日志
      link: /changelog/
---

<HomeBanner alt="Project Helper 应用截图" />

<HomeFeatures
  :items="[
    { title: '一键扫描', details: '配置多个根目录与扫描深度，自动识别本地项目并展示。' },
    { title: '快速打开', details: '双击/右键即可使用 VSCode 等 IDE 打开项目目录。' },
    { title: '置顶 & 排除', details: '支持置顶常用项目、排除指定目录，列表更清爽。' },
    { title: '自动更新', details: '接入 electron-updater，新版本发布后自动检查并提示更新。' }
  ]"
/>
