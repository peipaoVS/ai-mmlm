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
      // ---- 系统侧 SSO（远程 192.168.1.37:8017） ----
      '/api/auth':      createProxy('http://192.168.1.37:8017'),
      '/api/users':     createProxy('http://192.168.1.37:8017'),
      '/api/roles':     createProxy('http://192.168.1.37:8017'),
      '/api/posts':     createProxy('http://192.168.1.37:8017'),
      '/api/menus':     createProxy('http://192.168.1.37:8017'),
      '/api/companies': createProxy('http://192.168.1.37:8017'),

      // ---- AI 主后端（远程 192.168.1.168:8000） ----
      // 切回本地调试：把下面所有 'http://192.168.1.168:8000' 替换为 'http://localhost:8000'。
      '/api/visit-assistant':       createProxy('http://192.168.1.168:8000'),
      '/api/rule-qa':               createProxy('http://192.168.1.168:8000'),
      '/api/admin-rule-qa':         createProxy('http://192.168.1.168:8000'),
      '/api/admin-rule-kb':         createProxy('http://192.168.1.168:8000'),
      '/api/session':               createProxy('http://192.168.1.168:8000'),
      '/api/conversations':         createProxy('http://192.168.1.168:8000'),
      '/api/todos':                 createProxy('http://192.168.1.168:8000'),
      '/api/reports':               createProxy('http://192.168.1.168:8000'),
      '/api/post-visit-summaries':  createProxy('http://192.168.1.168:8000'),
      '/api/report-jobs':           createProxy('http://192.168.1.168:8000'),
      '/api/push-messages':         createProxy('http://192.168.1.168:8000'),
      '/api/badcases':              createProxy('http://192.168.1.168:8000'),
      '/api/regression':            createProxy('http://192.168.1.168:8000'),
      '/api/repair-queue':          createProxy('http://192.168.1.168:8000'),
      '/api/moderation':            createProxy('http://192.168.1.168:8000'),
      '/api/observability':         createProxy('http://192.168.1.168:8000'),
      '/api/habits':                createProxy('http://192.168.1.168:8000'),
      '/api/rule-kb':               createProxy('http://192.168.1.168:8000'),
      '/api/admin':                 createProxy('http://192.168.1.168:8000'),
      '/api/health':                createProxy('http://192.168.1.168:8000'),
      '/api/taskstop':              createProxy('http://192.168.1.168:8000'), // 旧死代码兜底
      '/api/chat':                  createProxy('http://192.168.1.168:8000'),
      '/awp':                       createProxy('http://192.168.1.168:8000')
    }
  }
})
