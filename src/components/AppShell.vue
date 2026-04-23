<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api/http'
import { clearSession, useSession } from '../stores/session'

const route = useRoute()
const router = useRouter()
const session = useSession()

const headerToolsRef = ref(null)
const activeMenu = ref('')

const aiMenus = [
  { label: 'AI工作台', path: '/chat' },
  { label: '智能体配置', path: '/agents' }
]

const knowledgeMenus = [
  { label: '产品库', path: '/knowledge/products' },
  { label: '企业画像', path: '/knowledge/portraits' },
  { label: '行业动态', path: '/knowledge/trends' }
]

const permissionMenus = [
  { label: '角色管理', path: '/roles' },
  { label: '用户管理', path: '/users' },
  { label: '岗位管理', path: '/posts' }
]

const currentSection = computed(() => route.meta.title || 'AI工作台')
const today = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date())
)

const displayUsername = computed(
  () => session.user?.username || session.user?.nickname || '管理员'
)

const currentRoles = computed(() => {
  const roles = session.user?.roleNames || []
  return roles.length ? roles.join('、') : '--'
})

const currentPosts = computed(() => {
  const posts = session.user?.postNames || []
  return posts.length ? posts.join('、') : '--'
})

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
    // ignore logout request failure and clear the client session anyway
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
  <div class="app-shell">
    <main class="shell-main">
      <header class="shell-header glass-card">
        <div class="header-left">
          <h2>{{ currentSection }}</h2>
          <p>{{ today }}</p>
        </div>

        <div ref="headerToolsRef" class="header-right">
          <div class="header-tool-group">
            <div class="menu-anchor">
              <button
                class="top-action glass-card"
                :class="{ active: activeMenu === 'ai' }"
                type="button"
                @click="toggleMenu('ai')"
              >
                <span>AI配置</span>
              </button>

              <div v-if="activeMenu === 'ai'" class="menu-popover glass-card">
                <div class="menu-section">
                  <span class="menu-title">AI配置</span>
                  <button
                    v-for="item in aiMenus"
                    :key="item.path"
                    type="button"
                    class="menu-item"
                    :class="{ active: route.path === item.path }"
                    @click="goTo(item.path)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </div>

            <div class="menu-anchor">
              <button
                class="top-action glass-card"
                :class="{ active: activeMenu === 'knowledge' }"
                type="button"
                @click="toggleMenu('knowledge')"
              >
                <span>AI知识库</span>
              </button>

              <div v-if="activeMenu === 'knowledge'" class="menu-popover glass-card">
                <div class="menu-section">
                  <span class="menu-title">AI知识库</span>
                  <button
                    v-for="item in knowledgeMenus"
                    :key="item.path"
                    type="button"
                    class="menu-item"
                    :class="{ active: route.path === item.path }"
                    @click="goTo(item.path)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </div>

            <div class="menu-anchor">
              <button
                class="top-action glass-card"
                :class="{ active: activeMenu === 'permission' }"
                type="button"
                @click="toggleMenu('permission')"
              >
                <span>权限配置</span>
              </button>

              <div v-if="activeMenu === 'permission'" class="menu-popover glass-card">
                <div class="menu-section">
                  <span class="menu-title">权限配置</span>
                  <button
                    v-for="item in permissionMenus"
                    :key="item.path"
                    type="button"
                    class="menu-item"
                    :class="{ active: route.path === item.path }"
                    @click="goTo(item.path)"
                  >
                    {{ item.label }}
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
                  <span class="menu-title">当前账号</span>

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
                </div>

                <div class="menu-divider"></div>

                <button type="button" class="menu-item logout-item" @click="handleLogout">
                  退出
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section class="shell-content">
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

.shell-main {
  display: flex;
  flex-direction: column;
  gap: clamp(0.875rem, 0.5rem + 1vw, 1.25rem);
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

.header-left h2 {
  margin: 0;
  font-size: clamp(1.6rem, 1.1rem + 1vw, 2rem);
  line-height: 1.1;
}

.header-left p {
  margin: calc(8px * var(--ui-scale)) 0 0;
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
  gap: 0;
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

.top-action:hover,
.user-button:hover {
  transform: translateY(-1px);
  border-color: rgba(237, 124, 71, 0.2);
  box-shadow:
    0 12px 24px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.top-action.active,
.user-button.active {
  border-color: rgba(237, 124, 71, 0.22);
  background:
    linear-gradient(135deg, rgba(255, 243, 234, 0.94), rgba(241, 248, 246, 0.92)),
    rgba(255, 255, 255, 0.84);
}

.user-mark {
  min-width: calc(52px * var(--ui-scale));
  max-width: calc(140px * var(--ui-scale));
  padding: calc(9px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  background: linear-gradient(135deg, #f39a61, #2f8374);
  color: #fff;
  font-size: calc(14px * var(--ui-scale));
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 16px 26px rgba(47, 131, 116, 0.22);
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
  width: min(15rem, calc(100vw - 3rem));
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

@media (max-width: 1080px) {
  .shell-header {
    align-items: stretch;
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

  .header-left h2 {
    font-size: 1.5rem;
  }

  .menu-popover,
  .user-popover {
    width: min(100%, calc(100vw - 28px));
  }
}
</style>
