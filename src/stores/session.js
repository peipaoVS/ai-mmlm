import { reactive } from 'vue'

const TOKEN_KEY = 'mmlm_admin_token'
const USER_KEY = 'mmlm_admin_user'

const state = reactive({
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: parseUser()
})

function parseUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
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

export function clearSession() {
  state.token = ''
  state.user = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getToken() {
  return state.token
}
