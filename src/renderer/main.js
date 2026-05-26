import { createApp } from 'vue'
import App from './App.vue'
import './styles/global.css'
import './styles/tooltip.css'
import tooltipPlugin from './directives/tooltip.js'

// preload 加载失败时给一份"全部失败"的兜底 api，
// 避免组件直接调用 window.api 的方法时抛出 "undefined" 异常导致整页崩溃
if (!window.api) {
  // eslint-disable-next-line no-console
  console.error('[renderer] window.api is missing, preload 可能未正确加载')
  const fail = () => Promise.resolve({ ok: false, message: 'preload 未加载' })
  window.api = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'onMaximizeChange') return () => () => {}
        return fail
      }
    }
  )
}

const app = createApp(App)
app.use(tooltipPlugin)
app.mount('#app')
