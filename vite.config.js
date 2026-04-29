import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import devConfig from './src/config/dev'
import prodConfig from './src/config/prod'

const SYSTEM_PROXY_PREFIXES = [
  '/api/auth',
  '/api/users',
  '/api/roles',
  '/api/posts',
  '/api/menus',
  '/api/companies',
  '/api/agent-modules',
  '/api/param-configs'
]

const AI_PROXY_PREFIXES = [
  '/api/visit-assistant',
  '/api/rule-qa',
  '/api/admin-rule-qa',
  '/api/admin-rule-kb',
  '/api/session',
  '/api/conversations',
  '/api/todos',
  '/api/reports',
  '/api/post-visit-summaries',
  '/api/report-jobs',
  '/api/push-messages',
  '/api/badcases',
  '/api/regression',
  '/api/repair-queue',
  '/api/moderation',
  '/api/observability',
  '/api/habits',
  '/api/rule-kb',
  '/api/admin',
  '/api/health',
  '/api/taskstop',
  '/api/chat',
  '/awp'
]

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

function buildProxyConfig(activeConfig) {
  return {
    ...Object.fromEntries(
      SYSTEM_PROXY_PREFIXES.map((path) => [path, createProxy(activeConfig.proxy.system)])
    ),
    ...Object.fromEntries(
      AI_PROXY_PREFIXES.map((path) => [path, createProxy(activeConfig.proxy.ai)])
    )
  }
}

export default defineConfig(({ command }) => {
  const activeConfig = command === 'serve' ? devConfig : prodConfig

  return {
    plugins: [vue()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: buildProxyConfig(activeConfig)
    }
  }
})
