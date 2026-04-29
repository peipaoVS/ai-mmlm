<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api/http'
import loginBackground from '../assets/login-ai-background.jpg'
import qwenBackground from '../assets/providers/qwen-background.webp'
import zhipuBackground from '../assets/providers/zhipu-background.png'
import openaiSymbol from '../assets/providers/openai-symbol.svg'
import { clearSession, hasMenuSnapshot, setTheme, useSession } from '../stores/session'

const route = useRoute()
const router = useRouter()
const session = useSession()

const headerToolsRef = ref(null)
const activeMenu = ref('')
const constrainedRouteNames = new Set(['users', 'roles', 'posts', 'menus', 'companies', 'params'])

const sectionOrder = ['ai', 'knowledge', 'logs', 'permission']
const sectionTitles = {
  ai: 'AI配置',
  knowledge: 'AI知识库',
  logs: '日志',
  permission: '权限配置'
}

const legacyMenus = [
  { name: 'AI工作台', section: 'ai', path: '/chat', sortOrder: 10 },
  { name: '大模型配置', section: 'ai', path: '/agents', sortOrder: 20 },
  { name: '参数配置', section: 'ai', path: '/params', sortOrder: 30 },
  { name: '产品库', section: 'knowledge', path: '/knowledge/products', sortOrder: 10 },
  { name: '企业画像', section: 'knowledge', path: '/knowledge/portraits', sortOrder: 20 },
  { name: '行业动态', section: 'knowledge', path: '/knowledge/trends', sortOrder: 30 },
  { name: 'Badcase', section: 'logs', path: '/logs/badcase', sortOrder: 10 },
  { name: '观测认证', section: 'logs', path: '/logs/observation-auth', sortOrder: 20 },
  { name: '回归评测', section: 'logs', path: '/logs/regression-review', sortOrder: 30 },
  { name: '修复队列', section: 'logs', path: '/logs/fix-queue', sortOrder: 40 },
  { name: '规则库', section: 'logs', path: '/logs/rule-library', sortOrder: 50 },
  { name: '说明', section: 'logs', path: '/logs/instructions', sortOrder: 60 },
  { name: '角色管理', section: 'permission', path: '/roles', sortOrder: 10 },
  { name: '用户管理', section: 'permission', path: '/users', sortOrder: 20 },
  { name: '岗位管理', section: 'permission', path: '/posts', sortOrder: 30 },
  { name: '菜单管理', section: 'permission', path: '/menus', sortOrder: 40 },
  { name: '所属公司', section: 'permission', path: '/companies', sortOrder: 50 }
]

const displayUsername = computed(
  () => session.user?.nickname || session.user?.username || '管理员'
)

const currentRoles = computed(() => {
  const roles = session.user?.roleNames || []
  return roles.length ? roles.join('、') : '--'
})

const currentPosts = computed(() => {
  const posts = session.user?.postNames || []
  return posts.length ? posts.join('、') : '--'
})

const currentCompany = computed(() => session.user?.companyName || '--')
const currentTheme = computed(() => session.theme === 'light' ? 'light' : 'dark')

const effectiveMenus = computed(() => {
  if (hasMenuSnapshot(session.user)) {
    return (session.user?.menus || []).map((item, index) => ({
      name: item.name,
      section: item.section,
      path: item.path,
      sortOrder: item.sortOrder ?? index + 1
    }))
  }
  return legacyMenus
})

const groupedMenus = computed(() =>
  sectionOrder
    .map((key) => ({
      key,
      title: sectionTitles[key],
      items: effectiveMenus.value
        .filter((item) => item.section === key)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    }))
    .filter((group) => group.items.length)
)

const currentMenuItem = computed(() => {
  const exactMatched = effectiveMenus.value.find((item) => item.path === route.path)
  if (exactMatched) {
    return exactMatched
  }

  const partialMatched = effectiveMenus.value.find(
    (item) => item.path !== '/' && route.path.startsWith(item.path)
  )
  return partialMatched || null
})

const currentSectionLabel = computed(() => currentMenuItem.value?.name || route.meta.title || 'AI工作台')

const currentDateText = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date())
)

const shouldConstrainContent = computed(() => {
  const routeName = typeof route.name === 'string' ? route.name : ''
  return (
    routeName.startsWith('logs-') ||
    routeName.startsWith('knowledge-') ||
    constrainedRouteNames.has(routeName)
  )
})

const shellVisualStyle = {
  '--shell-hero': `url("${loginBackground}")`,
  '--shell-art-a': `url("${qwenBackground}")`,
  '--shell-art-b': `url("${zhipuBackground}")`,
  '--shell-art-c': `url("${openaiSymbol}")`
}

function isMenuActive(group) {
  return activeMenu.value === group.key || group.items.some((item) => route.path === item.path)
}

function toggleMenu(name) {
  activeMenu.value = activeMenu.value === name ? '' : name
}

function closeMenu() {
  activeMenu.value = ''
}

function goTo(path) {
  closeMenu()
  router.push(path)
}

function selectTheme(theme) {
  setTheme(theme)
}

function handleDocumentClick(event) {
  if (headerToolsRef.value && !headerToolsRef.value.contains(event.target)) {
    closeMenu()
  }
}

async function handleLogout() {
  try {
    await api.post('/api/auth/logout', {})
  } catch (error) {
    // Ignore logout failures and clear local session anyway.
  } finally {
    closeMenu()
    clearSession()
    router.replace('/login')
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div
    class="app-shell"
    :class="[
      `theme-${currentTheme}`,
      { 'app-shell-constrained': shouldConstrainContent }
    ]"
    :style="shellVisualStyle"
  >
    <main class="shell-main" :class="{ 'shell-main-constrained': shouldConstrainContent }">
      <header class="shell-header glass-card">
        <div class="header-left">
          <div class="header-copy">
            <span class="header-section-pill">{{ currentSectionLabel }}</span>
            <p class="header-date-inline">{{ currentDateText }}</p>
          </div>
        </div>

        <div ref="headerToolsRef" class="header-right">
          <div class="header-tool-group">
            <div
              v-for="group in groupedMenus"
              :key="group.key"
              class="menu-anchor"
            >
              <button
                class="top-action glass-card"
                :class="{ active: isMenuActive(group) }"
                type="button"
                @click="toggleMenu(group.key)"
              >
                <span>{{ group.title }}</span>
              </button>

              <div v-if="activeMenu === group.key" class="menu-popover glass-card">
                <div class="menu-section">
                  <span class="menu-title">{{ group.title }}</span>
                  <button
                    v-for="item in group.items"
                    :key="item.path"
                    type="button"
                    class="menu-item"
                    :class="{ active: route.path === item.path }"
                    @click="goTo(item.path)"
                  >
                    {{ item.name }}
                  </button>
                </div>
              </div>
            </div>

            <div class="menu-anchor user-anchor">
              <button
                class="user-button glass-card"
                :class="{ active: activeMenu === 'user' }"
                type="button"
                @click="toggleMenu('user')"
              >
                <div class="user-mark">{{ displayUsername }}</div>
              </button>

              <div v-if="activeMenu === 'user'" class="menu-popover user-popover glass-card">
                <div class="menu-section">
                  <div class="menu-meta-card">
                    <span class="menu-meta-label">当前用户</span>
                    <strong class="menu-meta-value">{{ displayUsername }}</strong>
                  </div>

                  <div class="menu-meta-card">
                    <span class="menu-meta-label">角色</span>
                    <strong class="menu-meta-value">{{ currentRoles }}</strong>
                  </div>

                  <div class="menu-meta-card">
                    <span class="menu-meta-label">岗位</span>
                    <strong class="menu-meta-value">{{ currentPosts }}</strong>
                  </div>

                  <div class="menu-meta-card">
                    <span class="menu-meta-label">所属公司</span>
                    <strong class="menu-meta-value">{{ currentCompany }}</strong>
                  </div>

                  <div class="theme-switch-row">
                    <button
                      type="button"
                      class="theme-switch-button"
                      :class="{ active: currentTheme === 'dark' }"
                      @click="selectTheme('dark')"
                    >
                      <span class="theme-switch-icon moon" aria-hidden="true"></span>
                      <span>暗系</span>
                    </button>

                    <button
                      type="button"
                      class="theme-switch-button"
                      :class="{ active: currentTheme === 'light' }"
                      @click="selectTheme('light')"
                    >
                      <span class="theme-switch-icon sun" aria-hidden="true"></span>
                      <span>亮系</span>
                    </button>
                  </div>
                </div>

                <div class="menu-divider"></div>

                <button type="button" class="menu-item logout-item" @click="handleLogout">
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section
        class="shell-content"
        :class="{ 'shell-content-constrained': shouldConstrainContent }"
      >
        <router-view />
      </section>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  padding: clamp(0.875rem, 0.5rem + 1vw, 1.375rem);
  overflow: hidden;
  color: var(--text-main);
  --bg-panel:
    radial-gradient(circle at top right, rgba(34, 211, 238, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.66));
  --bg-soft: rgba(15, 23, 42, 0.58);
  --line: rgba(148, 163, 184, 0.18);
  --line-strong: rgba(34, 211, 238, 0.24);
  --text-main: #e5e7eb;
  --text-muted: #94a3b8;
  --brand-alt: #7addc1;
  --danger: #fb7185;
  --surface-panel: rgba(15, 23, 42, 0.78);
  --surface-card: rgba(15, 23, 42, 0.62);
  --surface-card-strong: rgba(15, 23, 42, 0.76);
  --surface-card-soft: rgba(15, 23, 42, 0.5);
  --surface-card-faint: rgba(15, 23, 42, 0.4);
  --surface-accent: rgba(34, 211, 238, 0.16);
  --surface-accent-alt: rgba(122, 221, 193, 0.12);
  --surface-code: rgba(2, 6, 23, 0.58);
  --surface-border: rgba(148, 163, 184, 0.18);
  --surface-inset: rgba(255, 255, 255, 0.06);
  --shadow-lg: 0 30px 90px rgba(3, 10, 26, 0.28);
  --shadow-md: 0 18px 42px rgba(3, 10, 26, 0.18);
}

.app-shell.theme-light {
  --bg-panel:
    radial-gradient(circle at top right, rgba(255, 216, 188, 0.22), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(248, 250, 254, 0.74));
  --bg-soft: rgba(255, 255, 255, 0.68);
  --line: rgba(27, 37, 54, 0.08);
  --line-strong: rgba(27, 37, 54, 0.16);
  --text-main: #1b2536;
  --text-muted: #677287;
  --brand-alt: #2f8374;
  --danger: #cf4c4c;
  --surface-panel: rgba(255, 255, 255, 0.82);
  --surface-card: rgba(255, 255, 255, 0.72);
  --surface-card-strong: rgba(255, 255, 255, 0.86);
  --surface-card-soft: rgba(255, 255, 255, 0.54);
  --surface-card-faint: rgba(255, 255, 255, 0.36);
  --surface-accent: rgba(237, 124, 71, 0.14);
  --surface-accent-alt: rgba(47, 131, 116, 0.12);
  --surface-code: rgba(241, 245, 249, 0.92);
  --surface-border: rgba(27, 37, 54, 0.1);
  --surface-inset: rgba(255, 255, 255, 0.78);
  --shadow-lg: 0 24px 70px rgba(29, 35, 52, 0.12);
  --shadow-md: 0 14px 32px rgba(29, 35, 52, 0.08);
}

.app-shell::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background-image:
    linear-gradient(118deg, rgba(5, 12, 26, 0.82), rgba(9, 18, 36, 0.56)),
    radial-gradient(circle at 74% 18%, rgba(122, 221, 193, 0.18), transparent 22%),
    radial-gradient(circle at 18% 82%, rgba(237, 124, 71, 0.16), transparent 28%),
    var(--shell-art-a),
    var(--shell-art-b),
    var(--shell-art-c),
    var(--shell-hero);
  background-repeat: no-repeat;
  background-size:
    auto,
    auto,
    auto,
    min(28vw, 22rem),
    min(30vw, 24rem),
    min(16vw, 10rem),
    cover;
  background-position:
    center,
    center,
    center,
    right 4% top 14%,
    left 4% bottom 10%,
    right 24% bottom 12%,
    center;
  transform: scale(1.02);
}

.app-shell::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(circle at 12% 16%, rgba(79, 109, 255, 0.18), transparent 18%),
    radial-gradient(circle at 86% 20%, rgba(122, 221, 193, 0.15), transparent 20%),
    radial-gradient(circle at 76% 84%, rgba(237, 124, 71, 0.12), transparent 18%),
    linear-gradient(180deg, rgba(5, 12, 26, 0.14), rgba(5, 12, 26, 0.42));
}

.app-shell.theme-light::before {
  background-image:
    linear-gradient(118deg, rgba(255, 255, 255, 0.26), rgba(246, 248, 252, 0.08)),
    radial-gradient(circle at 74% 18%, rgba(122, 221, 193, 0.18), transparent 22%),
    radial-gradient(circle at 18% 82%, rgba(237, 124, 71, 0.18), transparent 28%),
    var(--shell-art-a),
    var(--shell-art-b),
    var(--shell-art-c),
    var(--shell-hero);
}

.app-shell.theme-light::after {
  background:
    radial-gradient(circle at 12% 16%, rgba(79, 109, 255, 0.16), transparent 18%),
    radial-gradient(circle at 86% 20%, rgba(122, 221, 193, 0.14), transparent 20%),
    radial-gradient(circle at 76% 84%, rgba(237, 124, 71, 0.14), transparent 18%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.52));
}

.app-shell-constrained {
  height: 100dvh;
  overflow: hidden;
}

.shell-main {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(0.875rem, 0.5rem + 1vw, 1.25rem);
}

.shell-main-constrained {
  height: 100%;
  min-height: 0;
}

.shell-header {
  position: relative;
  z-index: 40;
  border-radius: calc(28px * var(--ui-scale));
  padding: clamp(1rem, 0.55rem + 1.2vw, 1.5rem) clamp(1rem, 0.4rem + 1.5vw, 1.75rem);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  background:
    radial-gradient(circle at top right, rgba(34, 211, 238, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(15, 23, 42, 0.68)),
    rgba(15, 23, 42, 0.62);
  border: 1px solid rgba(34, 211, 238, 0.18);
  box-shadow:
    0 24px 48px rgba(3, 10, 26, 0.38),
    0 0 24px rgba(34, 211, 238, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(24px) saturate(140%);
}

.app-shell.theme-light .shell-header {
  background:
    radial-gradient(circle at top right, rgba(255, 216, 188, 0.24), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(247, 250, 255, 0.76)),
    rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow:
    0 24px 48px rgba(29, 35, 52, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.header-left {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: calc(14px * var(--ui-scale));
  flex-wrap: wrap;
  flex: 1 1 auto;
  min-width: 0;
}

.header-copy {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: calc(14px * var(--ui-scale));
  flex-wrap: nowrap;
}

.header-section-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: calc(34px * var(--ui-scale));
  padding: calc(8px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(19, 32, 58, 0.94), rgba(8, 16, 29, 0.94)),
    linear-gradient(135deg, rgba(34, 211, 238, 0.08), transparent);
  border: 1px solid rgba(34, 211, 238, 0.18);
  color: #e6faff;
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  letter-spacing: 0.08em;
  box-shadow:
    0 12px 28px rgba(3, 10, 26, 0.28),
    0 0 18px rgba(34, 211, 238, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.header-date-inline {
  margin: 0;
  color: rgba(229, 231, 235, 0.76);
  font-size: calc(13px * var(--ui-scale));
  line-height: 1.5;
  white-space: nowrap;
}

.app-shell.theme-light .header-section-pill {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 252, 0.92)),
    linear-gradient(135deg, rgba(237, 124, 71, 0.12), rgba(47, 131, 116, 0.1));
  border-color: rgba(27, 37, 54, 0.08);
  color: #1b2536;
  box-shadow:
    0 12px 24px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.app-shell.theme-light .header-date-inline {
  color: var(--text-muted);
}

.header-right {
  position: relative;
  min-width: 0;
}

.header-tool-group {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: calc(10px * var(--ui-scale));
  flex-wrap: wrap;
}

.menu-anchor {
  position: relative;
}

.top-action,
.user-button {
  min-height: calc(52px * var(--ui-scale));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: calc(10px * var(--ui-scale)) calc(16px * var(--ui-scale));
  border: 1px solid var(--line);
  border-radius: calc(22px * var(--ui-scale));
  background:
    linear-gradient(180deg, rgba(19, 32, 58, 0.94), rgba(8, 16, 29, 0.9)),
    linear-gradient(135deg, rgba(34, 211, 238, 0.08), transparent);
  color: var(--text-main);
  box-shadow:
    0 16px 32px rgba(3, 10, 26, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(135%);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.top-action {
  min-width: calc(112px * var(--ui-scale));
}

.top-action:hover {
  transform: translateY(-1px);
  border-color: rgba(34, 211, 238, 0.28);
  box-shadow:
    0 18px 36px rgba(3, 10, 26, 0.3),
    0 0 24px rgba(34, 211, 238, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.top-action.active {
  border-color: rgba(34, 211, 238, 0.24);
  background:
    linear-gradient(135deg, rgba(19, 32, 58, 0.96), rgba(8, 16, 29, 0.92)),
    linear-gradient(135deg, rgba(34, 211, 238, 0.14), rgba(122, 221, 193, 0.08));
  color: #f8fafc;
}

.app-shell.theme-light .top-action {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 250, 255, 0.82)),
    rgba(255, 255, 255, 0.76);
  border-color: rgba(27, 37, 54, 0.08);
  color: var(--text-main);
  box-shadow:
    0 16px 32px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.app-shell.theme-light .top-action:hover {
  border-color: rgba(237, 124, 71, 0.22);
  box-shadow:
    0 18px 36px rgba(29, 35, 52, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.app-shell.theme-light .top-action.active {
  border-color: rgba(237, 124, 71, 0.18);
  background:
    linear-gradient(135deg, rgba(255, 243, 234, 0.94), rgba(241, 248, 246, 0.92)),
    rgba(255, 255, 255, 0.84);
  color: #182131;
  box-shadow:
    0 18px 34px rgba(29, 35, 52, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.user-button {
  gap: calc(10px * var(--ui-scale));
  padding: calc(8px * var(--ui-scale)) calc(16px * var(--ui-scale));
  border-radius: 999px;
  border-color: rgba(34, 211, 238, 0.18);
  background:
    linear-gradient(180deg, rgba(19, 32, 58, 0.96), rgba(8, 16, 29, 0.94)),
    linear-gradient(135deg, rgba(34, 211, 238, 0.14), rgba(122, 221, 193, 0.08));
  color: #fff;
  box-shadow:
    0 16px 30px rgba(3, 10, 26, 0.3),
    0 0 20px rgba(34, 211, 238, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.user-button::before {
  content: '';
  display: block;
  width: calc(8px * var(--ui-scale));
  height: calc(8px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 calc(4px * var(--ui-scale)) rgba(34, 211, 238, 0.16);
  flex-shrink: 0;
}

.user-button:hover {
  transform: translateY(-1px);
  border-color: rgba(34, 211, 238, 0.28);
  box-shadow:
    0 18px 34px rgba(3, 10, 26, 0.36),
    0 0 24px rgba(34, 211, 238, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.user-button.active {
  background:
    linear-gradient(180deg, rgba(19, 32, 58, 0.98), rgba(8, 16, 29, 0.96)),
    linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(122, 221, 193, 0.1));
  box-shadow:
    0 18px 34px rgba(3, 10, 26, 0.38),
    0 0 26px rgba(34, 211, 238, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.user-mark {
  min-width: 0;
  max-width: calc(140px * var(--ui-scale));
  color: #fff;
  font-size: calc(14px * var(--ui-scale));
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-shell.theme-light .user-button {
  border-color: rgba(237, 124, 71, 0.18);
  background: linear-gradient(135deg, #ed7c47 0%, #f3a166 100%);
  color: #ffffff;
  box-shadow:
    0 16px 30px rgba(237, 124, 71, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.app-shell.theme-light .user-button::before {
  box-shadow: 0 0 0 calc(4px * var(--ui-scale)) rgba(255, 255, 255, 0.18);
}

.app-shell.theme-light .user-button:hover {
  border-color: rgba(237, 124, 71, 0.28);
  box-shadow:
    0 18px 34px rgba(237, 124, 71, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.app-shell.theme-light .user-button.active {
  background: linear-gradient(135deg, #e26f38 0%, #ee9756 100%);
  box-shadow:
    0 18px 34px rgba(237, 124, 71, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

.app-shell.theme-light .user-mark {
  color: #ffffff;
}

.menu-popover {
  position: absolute;
  top: calc(100% + calc(12px * var(--ui-scale)));
  right: 0;
  width: min(15rem, calc(100vw - 3rem));
  border-radius: calc(24px * var(--ui-scale));
  padding: calc(14px * var(--ui-scale));
  z-index: 80;
  background:
    radial-gradient(circle at top right, rgba(34, 211, 238, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.78)),
    rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(34, 211, 238, 0.18);
  box-shadow:
    0 22px 44px rgba(3, 10, 26, 0.36),
    0 0 24px rgba(34, 211, 238, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(26px) saturate(150%);
}

.app-shell.theme-light .menu-popover {
  background:
    radial-gradient(circle at top right, rgba(255, 216, 188, 0.24), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(247, 250, 255, 0.84)),
    rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(27, 37, 54, 0.08);
  box-shadow:
    0 22px 44px rgba(29, 35, 52, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.user-popover {
  width: min(18rem, calc(100vw - 3rem));
}

.menu-section {
  display: grid;
  gap: calc(10px * var(--ui-scale));
}

.menu-title {
  padding: calc(4px * var(--ui-scale)) calc(6px * var(--ui-scale));
  color: rgba(229, 231, 235, 0.64);
  font-size: calc(11px * var(--ui-scale));
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.menu-meta-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(10px * var(--ui-scale));
  padding: calc(11px * var(--ui-scale)) calc(13px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  background: rgba(2, 6, 23, 0.28);
  border: 1px solid rgba(148, 163, 184, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.app-shell.theme-light .menu-title {
  color: var(--text-muted);
}

.app-shell.theme-light .menu-meta-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 249, 253, 0.9)),
    rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(27, 37, 54, 0.08);
  box-shadow:
    0 10px 22px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.app-shell.theme-light .menu-meta-label {
  color: var(--text-muted);
}

.app-shell.theme-light .menu-meta-value {
  color: #1b2536;
}

.menu-meta-label {
  color: rgba(229, 231, 235, 0.68);
  font-size: calc(12px * var(--ui-scale));
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.menu-section > .menu-meta-card:nth-child(4) .menu-meta-label {
  font-size: 0;
}

.menu-section > .menu-meta-card:nth-child(4) .menu-meta-label::before {
  content: '所属公司';
  font-size: calc(12px * var(--ui-scale));
}

.menu-meta-value {
  color: var(--text-main);
  font-size: calc(14px * var(--ui-scale));
  line-height: 1.3;
  text-align: right;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-divider {
  height: 1px;
  background: var(--line);
  margin: calc(12px * var(--ui-scale)) 0;
}

.menu-item {
  display: block;
  width: 100%;
  border: 1px solid transparent;
  border-radius: calc(18px * var(--ui-scale));
  padding: calc(14px * var(--ui-scale)) calc(16px * var(--ui-scale));
  background: rgba(2, 6, 23, 0.3);
  color: var(--text-main);
  text-align: left;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.menu-item:hover {
  transform: translateY(-1px);
  border-color: rgba(34, 211, 238, 0.16);
  box-shadow:
    0 12px 24px rgba(3, 10, 26, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.menu-item.active {
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(122, 221, 193, 0.1)),
    rgba(2, 6, 23, 0.36);
  border-color: rgba(34, 211, 238, 0.2);
  color: #f8fafc;
  font-weight: 600;
}

.logout-item {
  background: rgba(127, 29, 29, 0.24);
  border-color: rgba(248, 113, 113, 0.2);
  color: #fecaca;
}

.app-shell.theme-light .menu-item {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 249, 253, 0.9)),
    rgba(255, 255, 255, 0.84);
  border-color: rgba(27, 37, 54, 0.06);
  color: var(--text-main);
  box-shadow:
    0 10px 22px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.app-shell.theme-light .menu-item:hover {
  border-color: rgba(237, 124, 71, 0.16);
  box-shadow:
    0 12px 24px rgba(29, 35, 52, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.app-shell.theme-light .menu-item.active {
  background: linear-gradient(135deg, rgba(237, 124, 71, 0.14), rgba(47, 131, 116, 0.12));
  border-color: rgba(237, 124, 71, 0.16);
  color: #182131;
}

.app-shell.theme-light .logout-item {
  background: rgba(207, 76, 76, 0.12);
  border-color: rgba(207, 76, 76, 0.14);
  color: #c24141;
}

.theme-switch-row {
  display: flex;
  gap: calc(10px * var(--ui-scale));
}

.theme-switch-button {
  flex: 1 1 0;
  min-height: calc(44px * var(--ui-scale));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(10px * var(--ui-scale));
  padding: calc(10px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: calc(16px * var(--ui-scale));
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(2, 6, 23, 0.28);
  color: var(--text-main);
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.theme-switch-button:hover {
  transform: translateY(-1px);
  border-color: rgba(34, 211, 238, 0.18);
  box-shadow:
    0 10px 20px rgba(3, 10, 26, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.theme-switch-button.active {
  border-color: rgba(34, 211, 238, 0.22);
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(122, 221, 193, 0.1));
  box-shadow:
    0 12px 22px rgba(34, 211, 238, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.app-shell.theme-light .theme-switch-button {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 249, 253, 0.9)),
    rgba(255, 255, 255, 0.84);
  border-color: rgba(27, 37, 54, 0.08);
  color: #1b2536;
  box-shadow:
    0 10px 22px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.app-shell.theme-light .theme-switch-button:hover {
  border-color: rgba(237, 124, 71, 0.18);
  box-shadow:
    0 10px 20px rgba(29, 35, 52, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.app-shell.theme-light .theme-switch-button.active {
  border-color: rgba(237, 124, 71, 0.16);
  background: linear-gradient(135deg, rgba(255, 243, 234, 0.94), rgba(241, 248, 246, 0.92));
  color: #1b2536;
}

.theme-switch-icon {
  position: relative;
  width: calc(14px * var(--ui-scale));
  height: calc(14px * var(--ui-scale));
  flex: 0 0 auto;
  color: currentColor;
}

.theme-switch-icon.moon {
  border-radius: 50%;
  box-shadow: inset calc(-4px * var(--ui-scale)) 0 0 currentColor;
  transform: rotate(-20deg);
}

.theme-switch-icon.sun {
  border-radius: 50%;
  background: currentColor;
  box-shadow:
    0 calc(-7px * var(--ui-scale)) 0 calc(-5px * var(--ui-scale)) currentColor,
    0 calc(7px * var(--ui-scale)) 0 calc(-5px * var(--ui-scale)) currentColor,
    calc(7px * var(--ui-scale)) 0 0 calc(-5px * var(--ui-scale)) currentColor,
    calc(-7px * var(--ui-scale)) 0 0 calc(-5px * var(--ui-scale)) currentColor,
    calc(5px * var(--ui-scale)) calc(5px * var(--ui-scale)) 0 calc(-5px * var(--ui-scale)) currentColor,
    calc(-5px * var(--ui-scale)) calc(5px * var(--ui-scale)) 0 calc(-5px * var(--ui-scale)) currentColor,
    calc(5px * var(--ui-scale)) calc(-5px * var(--ui-scale)) 0 calc(-5px * var(--ui-scale)) currentColor,
    calc(-5px * var(--ui-scale)) calc(-5px * var(--ui-scale)) 0 calc(-5px * var(--ui-scale)) currentColor;
}

.shell-content {
  min-width: 0;
  position: relative;
  z-index: 1;
}

.shell-content-constrained {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1080px) {
  .shell-header {
    align-items: stretch;
  }

  .header-left {
    width: 100%;
  }

  .header-right {
    width: 100%;
  }

  .header-tool-group {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .header-tool-group {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
  }

  .header-left {
    align-items: stretch;
  }

  .header-copy {
    width: 100%;
  }

  .menu-anchor,
  .top-action,
  .user-button {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .app-shell {
    padding: 0.875rem;
  }

  .shell-header {
    padding: 1rem;
  }

  .header-copy {
    gap: 0.75rem;
  }

  .menu-popover,
  .user-popover {
    width: min(100%, calc(100vw - 28px));
  }
}
</style>
