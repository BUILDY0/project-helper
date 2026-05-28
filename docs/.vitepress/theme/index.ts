// 自定义主题入口：在默认主题基础上注入主题样式与全局组件
import DefaultTheme from 'vitepress/theme'

// 样式按职责分文件，便于维护
import './styles/vars.css'
import './styles/base.css'
import './styles/navbar.css'
import './styles/home.css'
import './styles/doc.css'

import HomeBanner from './components/HomeBanner.vue'
import HomeFeatures from './components/HomeFeatures.vue'
export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // 全局注册首页用到的 Vue 组件，可在任意 .md 中直接以标签形式使用
    app.component('HomeBanner', HomeBanner)
    app.component('HomeFeatures', HomeFeatures)
  }
}
