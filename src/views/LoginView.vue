<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/http'
import { API_CONFIG } from '../config/api'
import { setAiSession, setSession } from '../stores/session'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const aboutVisible = ref(false)

const form = reactive({
  username: 'admin',
  password: 'admin123'
})

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

function collectIdentityHints(user, typedUsername) {
  return [
    String(typedUsername || '').toLowerCase(),
    String(user?.username || '').toLowerCase(),
    String(user?.nickname || ''),
    ...(user?.roleNames || []),
    ...(user?.postNames || [])
  ]
    .filter(Boolean)
    .join(' ')
}

function pickAiFallbackUsername(user, typedUsername) {
  const hintText = collectIdentityHints(user, typedUsername)

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
    throw new Error(payload.detail || payload.message || 'AI 侧账号目录加载失败')
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
    throw new Error(payload.detail || payload.message || 'AI 侧登录失败')
  }

  const token = payload.access_token || payload.token || ''
  if (!token) {
    throw new Error('AI 侧未返回登录凭证')
  }

  return {
    token,
    user: payload.user || null
  }
}

async function resolveAiSession(systemUser) {
  try {
    return await requestAiLogin(form.username, form.password)
  } catch (directError) {
    const aiUsers = await fetchAiUsers()
    const fallbackUsername = pickAiFallbackUsername(systemUser, form.username)
    const matchedUser = aiUsers.find((item) => item.username === fallbackUsername)

    if (!matchedUser) {
      throw new Error(`AI 侧未找到可映射账号：${fallbackUsername}`)
    }

    return requestAiLogin(
      matchedUser.username,
      matchedUser.password_hint || '123456'
    )
  }
}

async function handleLogin() {
  errorMessage.value = ''
  loading.value = true

  try {
    const data = await api.post('/api/auth/login', form)
    setSession(data.token, data.user)

    try {
      const aiSession = await resolveAiSession(data.user)
      setAiSession(aiSession.token, aiSession.user)
    } catch (aiError) {
      console.warn('AI side login skipped:', aiError)
    }

    router.replace('/chat')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page page-shell">
    <div class="login-center">
      <div class="login-panel glass-card">
        <div class="login-mark" aria-hidden="true">
          <div class="login-logo">
            <span class="logo-ring ring-a"></span>
            <span class="logo-ring ring-b"></span>
            <span class="logo-ring ring-c"></span>
            <span class="logo-core"></span>
          </div>
        </div>
        <h3 class="login-title">大模型登录</h3>

        <form class="login-form" @submit.prevent="handleLogin">
          <label class="field">
            <span>用户名</span>
            <input v-model="form.username" placeholder="请输入用户名" />
          </label>

          <label class="field">
            <span>密码</span>
            <input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
            />
          </label>

          <div class="login-hint">
            默认账号：`admin`
            <br />
            默认密码：`admin123`
          </div>

          <div v-if="errorMessage" class="error-box">
            {{ errorMessage }}
          </div>

          <div class="login-actions">
            <button class="pill-button submit-button" :disabled="loading">
              {{ loading ? '登录中...' : '登录' }}
            </button>
            <button
              type="button"
              class="pill-button ghost submit-button"
              @click="aboutVisible = true"
            >
              关于
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="aboutVisible" class="modal-mask" @click.self="aboutVisible = false">
      <div class="about-panel glass-card">
        <div class="about-header">
          <div>
            <span class="eyebrow">关于系统</span>
            <h3>AI 用户管理系统</h3>
            <p>这里展示系统说明内容，弹窗支持关闭，并保留半透明玻璃效果。</p>
          </div>
          <button class="pill-button ghost" @click="aboutVisible = false">关闭</button>
        </div>

        <div class="about-copy">
          <article class="hero-card">
            <h3>登录后默认进入大模型问答工作台</h3>
            <p>
              页面主入口直接落到 AI 问答页，适合把系统作为业务问答与内容生成工作台来使用。
            </p>
          </article>

          <div class="copy-grid">
            <article class="copy-card">
              <strong>模块收敛</strong>
              <span>当前系统只保留登录、用户、角色、岗位四个基础模块，结构更轻，便于维护。</span>
            </article>
            <article class="copy-card">
              <strong>问答页优先</strong>
              <span>大模型接口暂时使用占位回复，后续你可以直接替换成真实模型服务。</span>
            </article>
            <article class="copy-card">
              <strong>本地联调方便</strong>
              <span>前后端和 MySQL 初始化都已经准备好，适合本地快速开发和验证。</span>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  position: relative;
  display: grid;
  place-items: center;
  padding: clamp(1rem, 0.55rem + 1.2vw, 1.5rem);
}

.login-page::before,
.login-page::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  filter: blur(18px);
  z-index: 0;
}

.login-page::before {
  width: clamp(14rem, 26vw, 20rem);
  height: clamp(14rem, 26vw, 20rem);
  left: 8%;
  top: 10%;
  background: rgba(237, 124, 71, 0.18);
}

.login-page::after {
  width: clamp(12rem, 22vw, 17.5rem);
  height: clamp(12rem, 22vw, 17.5rem);
  right: 10%;
  bottom: 12%;
  background: rgba(47, 131, 116, 0.14);
}

.login-center {
  width: 100%;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.login-panel {
  width: min(560px, 100%);
  border-radius: calc(36px * var(--ui-scale));
  padding: clamp(1.25rem, 0.75rem + 1.6vw, 2.25rem);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(255, 247, 239, 0.62)),
    rgba(255, 255, 255, 0.58);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(28px);
}

.login-mark {
  display: flex;
  justify-content: center;
  margin-bottom: calc(18px * var(--ui-scale));
}

.login-title {
  margin: 0 0 calc(22px * var(--ui-scale));
  text-align: center;
  font-size: calc(clamp(24px, 2.8vw, 4px) * var(--ui-scale));
  line-height: 1.1;
  color: var(--text-main);
  letter-spacing: 0.04em;
}

.login-logo {
  position: relative;
  width: calc(112px * var(--ui-scale));
  height: calc(112px * var(--ui-scale));
  border-radius: calc(30px * var(--ui-scale));
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.92), transparent 38%),
    linear-gradient(145deg, rgba(20, 30, 46, 0.92), rgba(72, 79, 91, 0.98));
  box-shadow:
    0 24px 46px rgba(27, 37, 54, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.26);
  overflow: hidden;
}

.eyebrow {
  display: inline-block;
  padding: calc(8px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.12);
  color: var(--brand-alt);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  letter-spacing: 0.06em;
}

.eyebrow.warm {
  background: rgba(237, 124, 71, 0.12);
  color: var(--brand);
}

.logo-ring {
  position: absolute;
  display: block;
  border-radius: 999px;
  border: calc(2px * var(--ui-scale)) solid rgba(255, 255, 255, 0.78);
  opacity: 0.92;
}

.ring-a {
  width: calc(56px * var(--ui-scale));
  height: calc(56px * var(--ui-scale));
  left: calc(18px * var(--ui-scale));
  top: calc(18px * var(--ui-scale));
  transform: rotate(18deg);
}

.ring-b {
  width: calc(66px * var(--ui-scale));
  height: calc(30px * var(--ui-scale));
  right: calc(10px * var(--ui-scale));
  top: calc(26px * var(--ui-scale));
  border-color: rgba(237, 124, 71, 0.92);
  transform: rotate(-32deg);
}

.ring-c {
  width: calc(72px * var(--ui-scale));
  height: calc(28px * var(--ui-scale));
  left: calc(18px * var(--ui-scale));
  bottom: calc(18px * var(--ui-scale));
  border-color: rgba(122, 221, 193, 0.82);
  transform: rotate(28deg);
}

.logo-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(20px * var(--ui-scale));
  height: calc(20px * var(--ui-scale));
  border-radius: 999px;
  background: linear-gradient(135deg, #fff4e9, #ed7c47);
  box-shadow:
    0 0 0 calc(8px * var(--ui-scale)) rgba(255, 255, 255, 0.1),
    0 10px 18px rgba(237, 124, 71, 0.34);
  transform: translate(-50%, -50%);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: calc(16px * var(--ui-scale));
}

.login-form .field {
  grid-template-columns: 5rem minmax(0, 1fr);
  align-items: center;
}

.login-hint {
  border-radius: calc(18px * var(--ui-scale));
  padding: calc(16px * var(--ui-scale));
  background: rgba(29, 35, 52, 0.06);
  color: var(--text-muted);
  line-height: 1.7;
}

.error-box {
  border-radius: calc(16px * var(--ui-scale));
  padding: calc(12px * var(--ui-scale)) calc(14px * var(--ui-scale));
  background: rgba(207, 76, 76, 0.12);
  color: var(--danger);
}

.login-actions {
  display: grid;
  grid-template-columns: 1fr calc(126px * var(--ui-scale));
  gap: calc(12px * var(--ui-scale));
}

.submit-button {
  margin-top: calc(10px * var(--ui-scale));
  padding-top: calc(14px * var(--ui-scale));
  padding-bottom: calc(14px * var(--ui-scale));
}

.about-panel {
  width: min(920px, 100%);
  border-radius: calc(32px * var(--ui-scale));
  padding: clamp(1rem, 0.55rem + 1.2vw, 1.75rem);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(248, 250, 254, 0.56)),
    rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.34);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(30px);
}

.about-header {
  display: flex;
  justify-content: space-between;
  gap: calc(16px * var(--ui-scale));
  align-items: flex-start;
  margin-bottom: calc(22px * var(--ui-scale));
}

.about-header h2 {
  margin: calc(14px * var(--ui-scale)) 0 calc(8px * var(--ui-scale));
  font-size: calc(26px * var(--ui-scale));
}

.about-header p {
  margin: 0;
  color: var(--text-muted);
}

.about-copy {
  display: grid;
  gap: calc(16px * var(--ui-scale));
}

.hero-card {
  border-radius: calc(24px * var(--ui-scale));
  padding: calc(24px * var(--ui-scale));
  background: rgba(255, 246, 235, 0.5);
  border: 1px solid var(--line);
}

.hero-card h3 {
  margin: 0 0 calc(12px * var(--ui-scale));
  font-size: calc(21px * var(--ui-scale));
}

.hero-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.8;
}

.copy-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: calc(14px * var(--ui-scale));
}

.copy-card {
  border-radius: calc(22px * var(--ui-scale));
  padding: calc(20px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.46);
  border: 1px solid var(--line);
}

.copy-card strong {
  display: block;
  margin-bottom: calc(10px * var(--ui-scale));
  font-size: calc(16px * var(--ui-scale));
}

.copy-card span {
  color: var(--text-muted);
  line-height: 1.7;
}

@media (max-width: 768px) {
  .login-panel {
    padding: 1.5rem;
  }

  .login-actions {
    grid-template-columns: 1fr;
  }

  .about-header {
    flex-direction: column;
  }

  .copy-grid {
    grid-template-columns: 1fr;
  }
}
</style>
