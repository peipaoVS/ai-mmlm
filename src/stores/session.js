import { reactive } from 'vue'

const TOKEN_KEY = 'mmlm_admin_token'
const USER_KEY = 'mmlm_admin_user'
const AI_TOKEN_KEY = 'mmlm_ai_token'
const AI_USER_KEY = 'mmlm_ai_user'

const state = reactive({
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: parseStoredUser(USER_KEY),
  aiToken: localStorage.getItem(AI_TOKEN_KEY) || '',
  aiUser: parseStoredUser(AI_USER_KEY)
})

function parseStoredUser(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

function normalizeRoleName(value) {
  return String(value || '').trim().toUpperCase()
}

export function useSession() {
  return state
}

export function setSession(token, user) {
  state.token = token
  state.user = user
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function setAiSession(token, user) {
  state.aiToken = token
  state.aiUser = user
  localStorage.setItem(AI_TOKEN_KEY, token)
  localStorage.setItem(AI_USER_KEY, JSON.stringify(user))
}

export function clearAiSession() {
  state.aiToken = ''
  state.aiUser = null
  localStorage.removeItem(AI_TOKEN_KEY)
  localStorage.removeItem(AI_USER_KEY)
}

export function clearSession() {
  state.token = ''
  state.user = null
  clearAiSession()
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getToken() {
  return state.token
}

export function getAiToken() {
  return state.aiToken
}

export function getUser() {
  return state.user
}

export function getAiUser() {
  return state.aiUser
}

export function isObserverUser(user) {
  const roles = user?.roleNames || []
  return roles.some((roleName) => {
    const normalized = normalizeRoleName(roleName)
    const text = String(roleName || '')
    return normalized === 'OBSERVER' || normalized.includes('OBSERVER') || text.includes('观察员')
  })
}
