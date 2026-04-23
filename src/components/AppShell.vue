<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api/http'
import { clearSession, useSession } from '../stores/session'

const route = useRoute()
const router = useRouter()
const session = useSession()
const menuVisible = ref(false)

const systemMenus = [
  { label: '用户管理', path: '/users' },
  { label: '角色管理', path: '/roles' },
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

function toggleMenu() {
  menuVisible.value = !menuVisible.value
}

function goToChat() {
  menuVisible.value = false
  router.push('/chat')
}

function closeMenu() {
  menuVisible.value = false
}

async function handleLogout() {
  try {
    await api.post('/api/auth/logout', {})
  } catch (error) {
    // ignore logout request failure and clear the client session anyway
  } finally {
    clearSession()
    router.replace('/login')
  }
}
</script>

<template>
  <div class="app-shell">
    <main class="shell-main">
      <header class="shell-header glass-card">
        <div class="header-left">
          <h2>{{ currentSection }}</h2>
          <p>{{ today }}</p>
        </div>

        <div class="header-right">
          <button class="control-card glass-card" type="button" @click="toggleMenu">
            <div class="brand-mark">M</div>
            <div class="control-copy">
              <strong>Model Mind Lab</strong>
              <span>
                {{ session.user?.nickname || '管理员' }}
                <template v-if="session.user?.username">
                  · {{ session.user.username }}
                </template>
              </span>
            </div>
            <span class="control-arrow" :class="{ open: menuVisible }">⌄</span>
          </button>

          <div v-if="menuVisible" class="menu-popover glass-card">
            <button
              type="button"
              class="menu-item"
              :class="{ active: route.path === '/chat' }"
              @click="goToChat"
            >
              AI工作台
            </button>

            <div class="menu-divider"></div>

            <div class="menu-section">
              <span class="menu-title">系统管理</span>
              <router-link
                v-for="item in systemMenus"
                :key="item.path"
                :to="item.path"
                class="menu-item"
                :class="{ active: route.path === item.path }"
                @click="closeMenu"
              >
                {{ item.label }}
              </router-link>
            </div>

            <div class="menu-divider"></div>

            <button type="button" class="menu-item logout-item" @click="handleLogout">
              退出登录
            </button>
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

.control-card {
  display: flex;
  align-items: center;
  gap: calc(14px * var(--ui-scale));
  width: min(100%, 24rem);
  min-width: min(100%, 18rem);
  padding: 0.875rem 1rem;
  border: 1px solid var(--line);
  border-radius: calc(24px * var(--ui-scale));
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(247, 250, 255, 0.72)),
    rgba(255, 255, 255, 0.7);
  color: var(--text-main);
  text-align: left;
}

.brand-mark {
  width: calc(46px * var(--ui-scale));
  height: calc(46px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  background: linear-gradient(135deg, #f39a61, #2f8374);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: calc(20px * var(--ui-scale));
  font-weight: 700;
  box-shadow: 0 16px 26px rgba(47, 131, 116, 0.22);
  flex-shrink: 0;
}

.control-copy {
  min-width: 0;
  flex: 1;
}

.control-copy strong {
  display: block;
  font-size: calc(16px * var(--ui-scale));
  line-height: 1.2;
}

.control-copy span {
  display: block;
  margin-top: calc(6px * var(--ui-scale));
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
  white-space: nowrap;
}

.control-arrow {
  font-size: calc(20px * var(--ui-scale));
  color: var(--text-muted);
  transition: transform 0.18s ease;
}

.control-arrow.open {
  transform: rotate(180deg);
}

.menu-popover {
  position: absolute;
  top: calc(100% + calc(14px * var(--ui-scale)));
  right: 0;
  width: min(22.5rem, calc(100vw - 3rem));
  border-radius: calc(26px * var(--ui-scale));
  padding: calc(16px * var(--ui-scale));
  z-index: 80;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(247, 250, 255, 0.74)),
    rgba(255, 255, 255, 0.68);
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
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.menu-item:hover {
  transform: translateY(-1px);
  border-color: var(--line);
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

  .control-card {
    width: 100%;
    min-width: 0;
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

  .control-copy span {
    white-space: normal;
  }

  .menu-popover {
    width: min(100%, calc(100vw - 28px));
  }
}
</style>
