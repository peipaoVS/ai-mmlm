import { clearSession, getToken } from '../stores/session'
import { API_CONFIG } from '../config/api';

const SYSTEM_API_PREFIXES = ['/api/auth/', '/api/users', '/api/roles', '/api/posts']

function resolveApiBase(url) {
  if (import.meta.env.DEV) {
    return ''
  }

  const isSystemApi = SYSTEM_API_PREFIXES.some((prefix) => url.startsWith(prefix))
  return isSystemApi ? API_CONFIG.AUTH : API_CONFIG.MAIN
}

export async function request(url, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  // 根据路径判断使用哪个 base URL
  // 登录相关接口使用 AUTH，其他接口使用 MAIN
  const apiBase = resolveApiBase(url)

  const response = await fetch(`${apiBase}${url}`, {
    ...options,
    headers
  })

  const result = await response.json().catch(() => ({
    success: false,
    message: '服务返回内容不可解析'
  }))

  if (response.status === 401) {
    clearSession()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error(result.message || '登录状态已失效')
  }

  // 如果响应格式包含 success 字段且为 false，则视为失败
  if (result.success === false) {
    throw new Error(result.message || `请求失败 (状态码: ${response.status})`)
  }

  // 如果响应格式包含 success 字段且为 true，返回 data 字段
  // 否则直接返回整个 result（兼容无 success 字段的响应格式）
  return result.success === true ? result.data : result
}

export async function* streamRequest(url, body) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  const apiBase = resolveApiBase(url)

  const response = await fetch(`${apiBase}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (response.status === 401) {
    clearSession()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('登录状态已失效')
  }

  if (!response.ok) {
    throw new Error(`请求失败 (状态码: ${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6)
        if (data === '[DONE]') return
        try {
          yield JSON.parse(data)
        } catch (e) {
          yield { type: 'RAW', data }
        }
      }
    }
  }

  // 处理剩余 buffer
  if (buffer.trim()) {
    const trimmed = buffer.trim()
    if (trimmed.startsWith('data: ')) {
      const data = trimmed.slice(6)
      if (data !== '[DONE]') {
        try {
          yield JSON.parse(data)
        } catch (e) {
          yield { type: 'RAW', data }
        }
      }
    }
  }
}

export const api = {
  get(url) {
    return request(url, { method: 'GET' })
  },
  post(url, body) {
    return request(url, { method: 'POST', body: JSON.stringify(body) })
  },
  put(url, body) {
    return request(url, { method: 'PUT', body: JSON.stringify(body) })
  },
  delete(url) {
    return request(url, { method: 'DELETE' })
  },
  stream(url, body) {
    return streamRequest(url, body)
  }
}
