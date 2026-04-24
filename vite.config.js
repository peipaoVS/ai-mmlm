import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function createProxy(target) {
  return {
    target,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('origin')
      })
    }
  }
}

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/auth': createProxy('http://192.168.1.37:8017'),
      '/api/users': createProxy('http://192.168.1.37:8017'),
      '/api/roles': createProxy('http://192.168.1.37:8017'),
      '/api/posts': createProxy('http://192.168.1.37:8017'),
      '/api/menus': createProxy('http://192.168.1.37:8017'),
      '/api/companies': createProxy('http://192.168.1.37:8017'),
      '/api/visit-assistant': createProxy('http://192.168.1.168:8000'),
      '/api/taskstop': createProxy('http://192.168.1.168:8000'),
      '/api/chat': createProxy('http://192.168.1.168:8000'),
      '/awp': createProxy('http://192.168.1.168:8000')
    }
  }
})
