<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/http'
import deepseekLogo from '../assets/providers/deepseek-logo.svg'
import loginBackground from '../assets/login-ai-background.jpg'
import ollamaLogo from '../assets/providers/ollama-logo.png'
import openaiSymbol from '../assets/providers/openai-symbol.svg'
import qianfanLogo from '../assets/providers/qianfan-logo.png'
import qwenLogo from '../assets/providers/qwen-logo.png'
import zhipuLogo from '../assets/providers/zhipu-logo.svg'
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

const loginShellStyle = {
  '--login-background': `url("${loginBackground}")`
}

const LOGIN_PROVIDERS = [
  { name: 'DeepSeek', icon: deepseekLogo },
  { name: 'Ollama', icon: ollamaLogo },
  { name: 'OpenAI', icon: openaiSymbol },
  { name: '通义千问', icon: qwenLogo },
  { name: '千帆大模型', icon: qianfanLogo },
  { name: '智谱 AI', icon: zhipuLogo }
]

const loginProviderLoop = [...LOGIN_PROVIDERS, ...LOGIN_PROVIDERS]

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

    return requestAiLogin(matchedUser.username, matchedUser.password_hint || '123456')
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
  <div class="login-page page-shell" :style="loginShellStyle">
    <div class="login-orb orb-a" aria-hidden="true"></div>
    <div class="login-orb orb-b" aria-hidden="true"></div>
    <div class="login-orb orb-c" aria-hidden="true"></div>

    <div class="login-center">
      <section class="login-intro" aria-hidden="true">
        <span class="eyebrow warm">AI Workspace</span>
        <h2>统一接入大模型能力的业务工作台</h2>
        <p>
          登录后进入模型问答、智能体配置与角色绑定能力，前台保持轻量，入口更加聚焦。
        </p>

        <div class="login-intro-tags">
          <span>DeepSeek</span>
          <span>OpenAI</span>
          <span>通义千问</span>
          <span>智谱 AI</span>
          <span>千帆大模型</span>
        </div>
      </section>

      <div class="login-panel glass-card">
        <div class="login-mark" aria-hidden="true">
          <div class="login-logo">
            <span class="logo-ring ring-a"></span>
            <span class="logo-ring ring-b"></span>
            <span class="logo-ring ring-c"></span>
            <span class="logo-core"></span>
          </div>
        </div>

        <span class="eyebrow login-eyebrow">统一登录</span>
        <h3 class="login-title">模型一体化平台</h3>
        <p class="login-subtitle">登录后默认进入 AI 问答工作台</p>

        <form class="login-form" @submit.prevent="handleLogin">
          <label class="field">
            <span>用户名</span>
            <input v-model="form.username" placeholder="请输入用户名" />
          </label>

          <label class="field">
            <span>密码</span>
            <input v-model="form.password" type="password" placeholder="请输入密码" />
          </label>

          <div class="login-hint">
            默认账号：admin
            <br />
            默认密码：admin123
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

          <div class="login-brand-marquee">
            <span class="login-brand-label">已接入模型</span>
            <div class="login-brand-window">
              <div class="login-brand-track">
                <div
                  v-for="(provider, index) in loginProviderLoop"
                  :key="`${provider.name}-${index}`"
                  class="login-brand-item"
                  :title="provider.name"
                >
                  <img :src="provider.icon" :alt="provider.name" />
                </div>
              </div>
            </div>
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
            <p>页面主入口直接落到 AI 问答页，适合作为业务问答与内容生成的统一入口。</p>
          </article>

          <div class="copy-grid">
            <article class="copy-card">
              <strong>模块收敛</strong>
              <span>当前系统保留登录、用户、角色、岗位等核心基础模块，结构更轻，便于维护。</span>
            </article>
            <article class="copy-card">
              <strong>问答优先</strong>
              <span>大模型接口可以持续替换为真实模型服务，前台交互入口已经预留完成。</span>
            </article>
            <article class="copy-card">
              <strong>本地联调方便</strong>
              <span>前后端和 MySQL 初始化都已准备好，适合本地快速开发和验证。</span>
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
  padding: clamp(1rem, 0.55rem + 1.2vw, 1.75rem);
  overflow: hidden;
  background: #08101d;
}

.login-page::before {
  content: '';
  position: absolute;
  inset: -2%;
  background:
    linear-gradient(115deg, rgba(5, 12, 26, 0.82), rgba(9, 18, 36, 0.64)),
    radial-gradient(circle at 72% 22%, rgba(122, 221, 193, 0.18), transparent 24%),
    var(--login-background) center / cover no-repeat;
  transform: scale(1.02);
  z-index: 0;
}

.login-page::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(5, 12, 26, 0.14), rgba(5, 12, 26, 0.36)),
    radial-gradient(circle at top left, rgba(79, 109, 255, 0.18), transparent 26%),
    radial-gradient(circle at bottom right, rgba(237, 124, 71, 0.15), transparent 24%);
  z-index: 0;
}

.login-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(26px);
  z-index: 1;
  pointer-events: none;
}

.orb-a {
  width: clamp(14rem, 25vw, 22rem);
  height: clamp(14rem, 25vw, 22rem);
  left: -4rem;
  top: 10%;
  background: rgba(79, 109, 255, 0.18);
}

.orb-b {
  width: clamp(12rem, 18vw, 16rem);
  height: clamp(12rem, 18vw, 16rem);
  right: 8%;
  top: 12%;
  background: rgba(122, 221, 193, 0.14);
}

.orb-c {
  width: clamp(10rem, 16vw, 14rem);
  height: clamp(10rem, 16vw, 14rem);
  right: 18%;
  bottom: 8%;
  background: rgba(237, 124, 71, 0.12);
}

.login-center {
  width: min(1160px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 432px);
  align-items: center;
  gap: clamp(1.5rem, 1rem + 2vw, 3.5rem);
  position: relative;
  z-index: 2;
}

.login-intro {
  color: rgba(255, 255, 255, 0.94);
  padding-right: clamp(0rem, 1vw, 2rem);
}

.login-intro h2 {
  margin: calc(18px * var(--ui-scale)) 0 calc(16px * var(--ui-scale));
  font-size: calc(clamp(40px, 5vw, 72px) * var(--ui-scale));
  line-height: 1.02;
  letter-spacing: -0.02em;
}

.login-intro p {
  max-width: 38rem;
  margin: 0;
  color: rgba(234, 239, 248, 0.82);
  font-size: calc(18px * var(--ui-scale));
  line-height: 1.8;
}

.login-intro-tags {
  display: flex;
  flex-wrap: wrap;
  gap: calc(10px * var(--ui-scale));
  margin-top: calc(24px * var(--ui-scale));
}

.login-intro-tags span {
  padding: calc(10px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
}

.login-panel {
  position: relative;
  width: min(432px, 100%);
  justify-self: end;
  border-radius: calc(36px * var(--ui-scale));
  padding: clamp(1.25rem, 0.75rem + 1.6vw, 2.25rem);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(247, 250, 255, 0.68)),
    rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow:
    0 28px 68px rgba(3, 10, 26, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(26px);
}

.login-mark {
  display: flex;
  justify-content: center;
  margin-top: calc(28px * var(--ui-scale));
  margin-bottom: calc(18px * var(--ui-scale));
}

.login-title {
  margin: calc(14px * var(--ui-scale)) 0 calc(10px * var(--ui-scale));
  text-align: center;
  font-size: calc(clamp(28px, 3vw, 40px) * var(--ui-scale));
  line-height: 1.1;
  color: var(--text-main);
  letter-spacing: 0.04em;
}

.login-subtitle {
  margin: 0 0 calc(22px * var(--ui-scale));
  text-align: center;
  color: var(--text-muted);
}

.login-eyebrow {
  position: absolute;
  left: clamp(1.25rem, 0.75rem + 1.6vw, 2.25rem);
  top: clamp(1.25rem, 0.75rem + 1.6vw, 2.25rem);
  margin: 0;
}

.login-logo {
  position: relative;
  width: calc(112px * var(--ui-scale));
  height: calc(112px * var(--ui-scale));
  border-radius: calc(30px * var(--ui-scale));
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.92), transparent 38%),
    linear-gradient(145deg, rgba(14, 22, 40, 0.96), rgba(71, 82, 108, 0.98));
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
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
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
  grid-template-columns: 1fr;
  gap: calc(12px * var(--ui-scale));
}

.submit-button {
  margin-top: calc(10px * var(--ui-scale));
  padding-top: calc(14px * var(--ui-scale));
  padding-bottom: calc(14px * var(--ui-scale));
}

.login-brand-marquee {
  display: grid;
  gap: calc(10px * var(--ui-scale));
  margin-top: calc(10px * var(--ui-scale));
}

.login-brand-label {
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: center;
}

.login-brand-window {
  position: relative;
  overflow: hidden;
  padding: calc(2px * var(--ui-scale)) 0;
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}

.login-brand-track {
  display: flex;
  align-items: center;
  gap: calc(12px * var(--ui-scale));
  width: max-content;
  animation: login-brand-marquee-right 22s linear infinite;
}

.login-brand-item {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(64px * var(--ui-scale));
  height: calc(64px * var(--ui-scale));
  padding: calc(12px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(27, 37, 54, 0.08);
  box-shadow:
    0 10px 20px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.login-brand-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

@keyframes login-brand-marquee-right {
  from {
    transform: translateX(-50%);
  }

  to {
    transform: translateX(0);
  }
}

.about-panel {
  width: min(920px, 100%);
  border-radius: calc(32px * var(--ui-scale));
  padding: clamp(1rem, 0.55rem + 1.2vw, 1.75rem);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(248, 250, 254, 0.62)),
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

.about-header h3 {
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

@media (max-width: 960px) {
  .login-center {
    grid-template-columns: 1fr;
  }

  .login-intro {
    padding-right: 0;
  }

  .login-panel {
    justify-self: stretch;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .login-page {
    padding: 1rem;
  }

  .login-intro {
    display: none;
  }

  .about-header {
    flex-direction: column;
  }

  .copy-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-brand-track {
    animation: none;
  }
}
</style>
