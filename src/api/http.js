import { clearSession, getToken } from '../stores/session'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '123'

export async function request(url, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${url}`, {
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

  if (!response.ok || !result.success) {
    throw new Error(result.message || '请求失败')
  }

  return result.data
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
  }
}
