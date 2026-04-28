import {
  clearAiSession,
  clearSession,
  getAiToken,
  getToken,
  getUser,
  setAiSession
} from '../stores/session'
import { API_CONFIG } from '../config/api'

const SYSTEM_API_PREFIXES = [
  '/api/auth/',
  '/api/users',
  '/api/roles',
  '/api/posts',
  '/api/menus',
  '/api/companies',
  '/api/agent-modules',
  '/api/param-configs'
]

function isSystemApi(url) {
  return SYSTEM_API_PREFIXES.some((prefix) => url.startsWith(prefix))
}

function normalizeRoleText(value) {
  return String(value || '').trim().toUpperCase()
}

function hasObserverRole(user) {
  const roles = user?.roleNames || []
  return roles.some((roleName) => {
    const normalized = normalizeRoleText(roleName)
    const text = String(roleName || '')
    return normalized.includes('OBSERVER') || text.includes('观察员')
  })
}

function hasAdminRole(user) {
  const roles = user?.roleNames || []
  return roles.some((roleName) => {
    const normalized = normalizeRoleText(roleName)
    const text = String(roleName || '')
    return normalized.includes('ADMIN') || text.includes('管理员')
  })
}

function collectIdentityHints(user) {
  return [
    String(user?.username || '').toLowerCase(),
    String(user?.nickname || ''),
    String(user?.companyName || ''),
    ...(user?.roleNames || []),
    ...(user?.postNames || [])
  ]
    .filter(Boolean)
    .join(' ')
}

function pickAiFallbackUsername(user) {
  const hintText = collectIdentityHints(user)

  if (hasObserverRole(user)) {
    return 'observer_ops'
  }

  if (hintText.includes('南京') || hintText.includes('nj')) {
    return hasAdminRole(user) ? 'nj_admin' : 'gz_rm'
  }

  if (hintText.includes('深圳') || hintText.includes('sz')) {
    return hasAdminRole(user) ? 'sz_admin' : 'gz_rm'
  }

  if (hintText.includes('苏州') || hintText.includes('su')) {
    return 'su_rm'
  }

  if (hintText.includes('广州') || hintText.includes('gz')) {
    return 'gz_rm'
  }

  if (hasAdminRole(user)) {
    return 'hq_admin'
  }

  return 'gz_rm'
}

async function fetchAiUsers() {
  const response = await fetch(`${API_CONFIG.MAIN}/api/auth/users?_=${Date.now()}`)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.detail || payload.message || 'AI side user catalog load failed')
  }

  return Array.isArray(payload.users) ? payload.users : []
}

async function requestAiLogin(username, password) {
  const response = await fetch(`${API_CONFIG.MAIN}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.detail || payload.message || 'AI side login failed')
  }

  const token = payload.access_token || payload.token || ''
  if (!token) {
    throw new Error('AI side login token is missing')
  }

  return {
    token,
    user: payload.user || null
  }
}

async function ensureAiSession(url) {
  if (isSystemApi(url) || getAiToken()) {
    return
  }

  const systemUser = getUser()
  if (!systemUser) {
    return
  }

  const aiUsers = await fetchAiUsers()
  const fallbackUsername = pickAiFallbackUsername(systemUser)
  const matchedUser = aiUsers.find((item) => item.username === fallbackUsername)

  if (!matchedUser) {
    throw new Error(`AI side account mapping not found: ${fallbackUsername}`)
  }

  const aiSession = await requestAiLogin(
    matchedUser.username,
    matchedUser.password_hint || '123456'
  )
  setAiSession(aiSession.token, aiSession.user)
}

function resolveApiBase(url) {
  if (import.meta.env.DEV) {
    return ''
  }

  return isSystemApi(url) ? API_CONFIG.AUTH : API_CONFIG.MAIN
}

function resolveAuthToken(url) {
  return isSystemApi(url) ? getToken() : getAiToken()
}

function resolveErrorMessage(result, fallback) {
  return result?.message || result?.detail || fallback
}

function handleUnauthorized(url, result, fallbackMessage) {
  if (isSystemApi(url)) {
    clearSession()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error(resolveErrorMessage(result, fallbackMessage))
  }

  clearAiSession()
  throw new Error(resolveErrorMessage(result, 'AI side session expired, please login again'))
}

export async function request(url, options = {}) {
  await ensureAiSession(url)

  const token = resolveAuthToken(url)
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const apiBase = resolveApiBase(url)

  const response = await fetch(`${apiBase}${url}`, {
    ...options,
    headers
  })

  const result = await response.json().catch(() => ({
    success: false,
    message: 'Service response is not valid JSON'
  }))

  if (response.status === 401) {
    handleUnauthorized(url, result, 'Login state has expired')
  }

  // Java 后端（SSO）登录成功时可能返回 HTTP 400 但 body.success === true，
  // 需要先检查 body 再决定是否抛异常
  if (!response.ok && result.success !== true) {
    throw new Error(resolveErrorMessage(result, `Request failed (${response.status})`))
  }

  if (result.success === false) {
    throw new Error(resolveErrorMessage(result, `Request failed (${response.status})`))
  }

  return result.success === true ? result.data : result
}

export async function* streamRequest(url, body) {
  await ensureAiSession(url)

  const token = resolveAuthToken(url)
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
    handleUnauthorized(url, null, 'Login state has expired')
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
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
        } catch (error) {
          yield { type: 'RAW', data }
        }
      }
    }
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim()
    if (trimmed.startsWith('data: ')) {
      const data = trimmed.slice(6)
      if (data !== '[DONE]') {
        try {
          yield JSON.parse(data)
        } catch (error) {
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
