<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api/http'
import { clearSession, hasMenuSnapshot, useSession } from '../stores/session'

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
  <div class="app-shell" :class="{ 'app-shell-constrained': shouldConstrainContent }">
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
  min-height: 100vh;
  padding: clamp(0.875rem, 0.5rem + 1vw, 1.375rem);
}

.app-shell-constrained {
  height: 100dvh;
  overflow: hidden;
}

.shell-main {
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
  background: linear-gradient(135deg, rgba(237, 124, 71, 0.16), rgba(47, 131, 116, 0.14));
  border: 1px solid rgba(237, 124, 71, 0.16);
  color: var(--brand-alt);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  letter-spacing: 0.08em;
}

.header-date-inline {
  margin: 0;
  color: var(--text-muted);
  font-size: calc(13px * var(--ui-scale));
  line-height: 1.5;
  white-space: nowrap;
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
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(247, 250, 255, 0.72)),
    rgba(255, 255, 255, 0.7);
  color: var(--text-main);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
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
  border-color: rgba(237, 124, 71, 0.2);
  box-shadow:
    0 12px 24px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.top-action.active {
  border-color: rgba(237, 124, 71, 0.22);
  background:
    linear-gradient(135deg, rgba(255, 243, 234, 0.94), rgba(241, 248, 246, 0.92)),
    rgba(255, 255, 255, 0.84);
}

.user-button {
  gap: calc(10px * var(--ui-scale));
  padding: calc(8px * var(--ui-scale)) calc(16px * var(--ui-scale));
  border-radius: 999px;
  border-color: transparent;
  background: linear-gradient(135deg, #2f8374 0%, #6eb6ab 100%);
  color: #fff;
  box-shadow:
    0 16px 30px rgba(47, 131, 116, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.user-button::before {
  content: '';
  display: block;
  width: calc(8px * var(--ui-scale));
  height: calc(8px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 calc(4px * var(--ui-scale)) rgba(255, 255, 255, 0.14);
  flex-shrink: 0;
}

.user-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 18px 34px rgba(47, 131, 116, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.user-button.active {
  background: linear-gradient(135deg, #256d61 0%, #5aa89c 100%);
  box-shadow:
    0 18px 34px rgba(47, 131, 116, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
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

.menu-popover {
  position: absolute;
  top: calc(100% + calc(12px * var(--ui-scale)));
  right: 0;
  width: min(15rem, calc(100vw - 3rem));
  border-radius: calc(24px * var(--ui-scale));
  padding: calc(14px * var(--ui-scale));
  z-index: 80;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 250, 255, 0.82)),
    rgba(255, 255, 255, 0.78);
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
  color: var(--text-muted);
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
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(27, 37, 54, 0.06);
}

.menu-meta-label {
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
  letter-spacing: 0.06em;
  white-space: nowrap;
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
  background: rgba(255, 255, 255, 0.58);
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
  border-color: var(--line);
  box-shadow: 0 10px 20px rgba(29, 35, 52, 0.07);
}

.menu-item.active {
  background: linear-gradient(135deg, rgba(237, 124, 71, 0.14), rgba(47, 131, 116, 0.12));
  border-color: rgba(237, 124, 71, 0.16);
  font-weight: 600;
}

.logout-item {
  background: rgba(29, 35, 52, 0.08);
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
