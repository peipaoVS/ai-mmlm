import { reactive } from 'vue'

const TOKEN_KEY = 'mmlm_admin_token'
const USER_KEY = 'mmlm_admin_user'
const AI_TOKEN_KEY = 'mmlm_ai_token'
const AI_USER_KEY = 'mmlm_ai_user'
const THEME_PREF_KEY = 'mmlm_user_theme_prefs'
const PUBLIC_THEME_KEY = 'mmlm_public_theme'
const DEFAULT_THEME = 'dark'

const state = reactive({
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: parseStoredUser(USER_KEY),
  aiToken: localStorage.getItem(AI_TOKEN_KEY) || '',
  aiUser: parseStoredUser(AI_USER_KEY),
  theme: resolveInitialTheme(parseStoredUser(USER_KEY))
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

function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark'
}

function resolvePublicTheme() {
  return normalizeTheme(localStorage.getItem(PUBLIC_THEME_KEY) || DEFAULT_THEME)
}

function getThemeOwnerKey(user) {
  const owner = user?.id ?? user?.userId ?? user?.username ?? user?.nickname
  return owner == null || owner === '' ? '' : `user:${owner}`
}

function parseThemePreferences() {
  try {
    const raw = localStorage.getItem(THEME_PREF_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    return {}
  }
}

function storeThemePreferences(preferences) {
  localStorage.setItem(THEME_PREF_KEY, JSON.stringify(preferences))
}

function resolveThemePreference(user) {
  const prefs = parseThemePreferences()
  const ownerKey = getThemeOwnerKey(user)

  if (ownerKey && typeof prefs[ownerKey] === 'string') {
    return normalizeTheme(prefs[ownerKey])
  }

  if (typeof user?.theme === 'string') {
    return normalizeTheme(user.theme)
  }

  return resolvePublicTheme()
}

function resolveInitialTheme(user) {
  if (user) {
    return resolveThemePreference(user)
  }

  return resolvePublicTheme()
}

function persistPublicTheme(theme) {
  localStorage.setItem(PUBLIC_THEME_KEY, normalizeTheme(theme))
}

function syncThemeToDom(theme) {
  if (typeof document === 'undefined') {
    return
  }

  const normalizedTheme = normalizeTheme(theme)
  const themeColor = normalizedTheme === 'dark' ? '#08101d' : '#f6f8fc'
  document.documentElement.setAttribute('data-theme', normalizedTheme)
  document.documentElement.style.colorScheme = normalizedTheme
  document.documentElement.classList.toggle('theme-dark', normalizedTheme === 'dark')
  document.documentElement.classList.toggle('theme-light', normalizedTheme === 'light')
  document.documentElement.style.backgroundColor = themeColor

  if (document.body) {
    document.body.setAttribute('data-theme', normalizedTheme)
    document.body.style.colorScheme = normalizedTheme
    document.body.classList.toggle('theme-dark', normalizedTheme === 'dark')
    document.body.classList.toggle('theme-light', normalizedTheme === 'light')
    document.body.style.backgroundColor = themeColor
  }

  let themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta')
    themeColorMeta.setAttribute('name', 'theme-color')
    document.head.appendChild(themeColorMeta)
  }

  themeColorMeta.setAttribute(
    'content',
    themeColor
  )

  let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]')
  if (!colorSchemeMeta) {
    colorSchemeMeta = document.createElement('meta')
    colorSchemeMeta.setAttribute('name', 'color-scheme')
    document.head.appendChild(colorSchemeMeta)
  }

  colorSchemeMeta.setAttribute('content', normalizedTheme)

  let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (!statusBarMeta) {
    statusBarMeta = document.createElement('meta')
    statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
    document.head.appendChild(statusBarMeta)
  }

  statusBarMeta.setAttribute(
    'content',
    normalizedTheme === 'dark' ? 'black-translucent' : 'default'
  )
}

function persistThemeForUser(user, theme) {
  const ownerKey = getThemeOwnerKey(user)
  if (!ownerKey) {
    return
  }

  const preferences = parseThemePreferences()
  preferences[ownerKey] = normalizeTheme(theme)
  storeThemePreferences(preferences)
}

syncThemeToDom(state.theme)

export function useSession() {
  return state
}

export function setSession(token, user) {
  const nextUser = user ? { ...user } : null
  const nextTheme = resolveThemePreference(nextUser)

  if (nextUser) {
    nextUser.theme = nextTheme
  }

  state.token = token
  state.user = nextUser
  state.theme = nextTheme
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  syncThemeToDom(nextTheme)
}

export function setAiSession(token, user) {
  state.aiToken = token
  state.aiUser = user || null
  localStorage.setItem(AI_TOKEN_KEY, token)
  localStorage.setItem(AI_USER_KEY, JSON.stringify(user || null))
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
  state.theme = resolvePublicTheme()
  clearAiSession()
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  syncThemeToDom(state.theme)
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

export function setTheme(theme) {
  const nextTheme = normalizeTheme(theme)
  state.theme = nextTheme
  syncThemeToDom(nextTheme)

  if (state.user) {
    state.user = {
      ...state.user,
      theme: nextTheme
    }
    localStorage.setItem(USER_KEY, JSON.stringify(state.user))
    persistThemeForUser(state.user, nextTheme)
    return
  }

  persistPublicTheme(nextTheme)
}

export function hasMenuSnapshot(user) {
  return Boolean(user && Object.prototype.hasOwnProperty.call(user, 'menus') && Array.isArray(user.menus))
}

export function isObserverUser(user) {
  const roles = user?.roleNames || []
  return roles.some((roleName) => {
    const normalized = normalizeRoleName(roleName)
    const text = String(roleName || '')
    return normalized === 'OBSERVER' || normalized.includes('OBSERVER') || text.includes('观察员')
  })
}
