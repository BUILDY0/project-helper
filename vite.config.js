import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// Vite 配置：渲染进程构建到 dist/，base 用相对路径方便 Electron file:// 加载
export default defineConfig({
  plugins: [vue()],
  base: './',
  root: path.resolve(__dirname, 'src/renderer'),
  resolve: {
    alias: {
      // '@' 指向 src/renderer，统一从根定位组件 / 资源 / composables
      '@': path.resolve(__dirname, 'src/renderer'),
      // '@resources' 指向唯一维护的应用图标源资源目录
      '@resources': path.resolve(__dirname, 'build')
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
