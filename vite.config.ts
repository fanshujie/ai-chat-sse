import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 前端 5173 把 /api 代理到本地 Express(3001)，避免跨域 + 隐藏 key
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
