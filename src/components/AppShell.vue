<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api/http'
import loginBackground from '../assets/login-ai-background.jpg'
import qwenBackground from '../assets/providers/qwen-background.webp'
import zhipuBackground from '../assets/providers/zhipu-background.png'
import openaiSymbol from '../assets/providers/openai-symbol.svg'
import { clearSession, hasMenuSnapshot, setTheme, useSession } from '../stores/session'

const xiaoyiVisible = ref(true)
const xiaoyiPosition = ref({ x: 0, y: 0 })
const xiaoyiDragging = ref(false)
const xiaoyiDragOffset = ref({ x: 0, y: 0 })

function initXiaoyiPosition() {
  const saved = localStorage.getItem('xiaoyi-position')
  if (saved) {
    try {
      xiaoyiPosition.value = JSON.parse(saved)
    } catch {
      xiaoyiPosition.value = { x: 0, y: 0 }
    }
  }
}

function startDrag(event) {
  xiaoyiDragging.value = true
  const rect = event.currentTarget.getBoundingClientRect()
  xiaoyiDragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(event) {
  if (!xiaoyiDragging.value) return
  const x = event.clientX - xiaoyiDragOffset.value.x
  const y = event.clientY - xiaoyiDragOffset.value.y
  const maxX = window.innerWidth - 60
  const maxY = window.innerHeight - 60
  xiaoyiPosition.value = {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY))
  }
}

function stopDrag() {
  xiaoyiDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  localStorage.setItem('xiaoyi-position', JSON.stringify(xiaoyiPosition.value))
}

function openXiaoyiMenu() {
  if (xiaoyiDragging.value) return
  const url = window.location.origin + '/xiaoyi-menu'
  window.open(url, '_blank')
}

onMounted(() => {
  initXiaoyiPosition()
})

const SECTION_ORDER = {
  ai: 0,
  knowledge: 1,
  logs: 2,
  permission: 3
}

const route = useRoute()
const router = useRouter()
const session = useSession()
const headerMenuOpen = ref(false)
const expandedRootKeys = ref([])

const constrainedRouteNames = new Set([
  'home',
  'users',
  'roles',
  'posts',
  'menus',
  'companies',
  'params',
  'session-transfer'
])

const fullSizePageRouteNames = new Set([
  'home',
  'users',
  'roles',
  'posts',
  'menus',
  'companies',
  'params',
  'session-transfer'
])

const legacyMenus = [
  { id: 101, name: 'AI配置', code: 'AI_ROOT', section: 'ai', path: '/nav/ai', parentId: null, sortOrder: 1 },
  { id: 1, name: 'AI工作台', section: 'ai', path: '/chat', parentId: 101, sortOrder: 10 },
  { id: 2, name: '大模型配置', section: 'ai', path: '/agents', parentId: 101, sortOrder: 20 },
  { id: 17, name: '参数配置', section: 'ai', path: '/params', parentId: 101, sortOrder: 30 },
  { id: 102, name: 'AI知识库', code: 'KNOWLEDGE_ROOT', section: 'knowledge', path: '/nav/knowledge', parentId: null, sortOrder: 2 },
  { id: 3, name: '产品库', section: 'knowledge', path: '/knowledge/products', parentId: 102, sortOrder: 10 },
  { id: 4, name: '企业画像', section: 'knowledge', path: '/knowledge/portraits', parentId: 102, sortOrder: 20 },
  { id: 5, name: '行业动态', section: 'knowledge', path: '/knowledge/trends', parentId: 102, sortOrder: 30 },
  { id: 103, name: '日志', code: 'LOG_ROOT', section: 'logs', path: '/nav/logs', parentId: null, sortOrder: 3 },
  { id: 6, name: 'Badcase', section: 'logs', path: '/logs/badcase', parentId: 103, sortOrder: 10 },
  { id: 7, name: '观测认证', section: 'logs', path: '/logs/observation-auth', parentId: 103, sortOrder: 20 },
  { id: 8, name: '回归评测', section: 'logs', path: '/logs/regression-review', parentId: 103, sortOrder: 30 },
  { id: 9, name: '修复队列', section: 'logs', path: '/logs/fix-queue', parentId: 103, sortOrder: 40 },
  { id: 10, name: '规则库', section: 'logs', path: '/logs/rule-library', parentId: 103, sortOrder: 50 },
  { id: 11, name: '说明', section: 'logs', path: '/logs/instructions', parentId: 103, sortOrder: 60 },
  { id: 104, name: '权限配置', code: 'PERMISSION_ROOT', section: 'permission', path: '/nav/permission', parentId: null, sortOrder: 4 },
  { id: 'builtin-home', name: '首页', section: 'permission', path: '/home', parentId: 104, sortOrder: 5 },
  { id: 12, name: '角色管理', section: 'permission', path: '/roles', parentId: 104, sortOrder: 10 },
  { id: 13, name: '用户管理', section: 'permission', path: '/users', parentId: 104, sortOrder: 20 },
  { id: 14, name: '岗位管理', section: 'permission', path: '/posts', parentId: 104, sortOrder: 30 },
  { id: 15, name: '菜单管理', section: 'permission', path: '/menus', parentId: 104, sortOrder: 40 },
  { id: 16, name: '所属公司', section: 'permission', path: '/companies', parentId: 104, sortOrder: 50 }
]

const displayUsername = computed(
  () => session.user?.nickname || session.user?.username || '管理员'
)

const currentRoles = computed(() => {
  const roles = session.user?.roleNames || []
  return roles.length ? roles.join(' / ') : '--'
})

const currentPosts = computed(() => {
  const posts = session.user?.postNames || []
  return posts.length ? posts.join(' / ') : '--'
})

const currentCompany = computed(() => session.user?.companyName || '--')
const currentTheme = computed(() => (session.theme === 'light' ? 'light' : 'dark'))

const effectiveMenus = computed(() => {
  if (!hasMenuSnapshot(session.user)) {
    return []
  }

  return (session.user?.menus || []).map((item, index) => ({
    id: item.id ?? item.code ?? item.path ?? index + 1,
    name: item.name,
    code: item.code,
    section: item.section,
    path: item.path,
    parentId: item.parentId ?? null,
    sortOrder: item.sortOrder ?? index + 1
  }))
})

const menuIdMap = computed(() => {
  const map = new Map()
  effectiveMenus.value.forEach((item) => {
    map.set(String(item.id), item)
  })
  return map
})

const navigationRoots = computed(() => buildNavigationTree(effectiveMenus.value))

const currentMenuItem = computed(() => {
  const exactMatched = effectiveMenus.value.find(
    (item) => item.path === route.path && !item.path.startsWith('/nav/')
  )
  if (exactMatched) {
    return exactMatched
  }

  const partialMatched = [...effectiveMenus.value]
    .filter((item) => item.path !== '/' && !item.path.startsWith('/nav/') && route.path.startsWith(item.path))
    .sort((left, right) => String(right.path || '').length - String(left.path || '').length)[0]

  return partialMatched || null
})

const currentRootKey = computed(() => {
  const current = currentMenuItem.value
  if (!current) {
    return ''
  }

  let node = current
  let guard = 0

  while (node?.parentId != null && guard < 30) {
    const parent = menuIdMap.value.get(String(node.parentId))
    if (!parent) {
      break
    }
    node = parent
    guard += 1
  }

  return getNodeKey(node)
})

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
    routeName === 'chat' ||
    routeName.startsWith('logs-') ||
    routeName.startsWith('knowledge-') ||
    constrainedRouteNames.has(routeName)
  )
})

const shouldFullSizePageCard = computed(() => {
  const routeName = typeof route.name === 'string' ? route.name : ''
  return (
    fullSizePageRouteNames.has(routeName) ||
    routeName.startsWith('logs-') ||
    routeName.startsWith('knowledge-')
  )
})

const shouldNarrowPageCard = computed(() => {
  const routeName = typeof route.name === 'string' ? route.name : ''
  return routeName !== 'chat' && !shouldFullSizePageCard.value
})

const isWorkbenchRoute = computed(() => route.name === 'workbench')

const shellVisualStyle = {
  '--shell-hero': `url("${loginBackground}")`,
  '--shell-art-a': `url("${qwenBackground}")`,
  '--shell-art-b': `url("${zhipuBackground}")`,
  '--shell-art-c': `url("${openaiSymbol}")`
}

function getSectionRank(value) {
  return SECTION_ORDER[String(value || '').trim()] ?? Number.MAX_SAFE_INTEGER
}

function compareMenuItem(left, right) {
  const sectionDiff = getSectionRank(left?.section) - getSectionRank(right?.section)
  if (sectionDiff !== 0) {
    return sectionDiff
  }

  const sortDiff = Number(left?.sortOrder ?? 0) - Number(right?.sortOrder ?? 0)
  if (sortDiff !== 0) {
    return sortDiff
  }

  const pathDiff = String(left?.path || '').localeCompare(String(right?.path || ''))
  if (pathDiff !== 0) {
    return pathDiff
  }

  const nameDiff = String(left?.name || '').localeCompare(String(right?.name || ''))
  if (nameDiff !== 0) {
    return nameDiff
  }

  return String(left?.id || '').localeCompare(String(right?.id || ''))
}

function buildNavigationTree(list) {
  const items = Array.isArray(list) ? list.map((item) => ({ ...item, children: [] })) : []
  const map = new Map(items.map((item) => [String(item.id), item]))
  const roots = []

  items.forEach((item) => {
    const parentKey = item.parentId == null ? '' : String(item.parentId)
    if (parentKey && map.has(parentKey)) {
      map.get(parentKey).children.push(item)
      return
    }

    roots.push(item)
  })

  const sortNodes = (nodes, level = 0) =>
    nodes
      .slice()
      .sort(compareMenuItem)
      .map((item) => ({
        ...item,
        level,
        children: sortNodes(item.children || [], level + 1)
      }))

  return sortNodes(roots)
}

function flattenChildren(nodes) {
  return nodes.flatMap((node) => [node, ...flattenChildren(node.children || [])])
}

function getNodeKey(node) {
  if (!node) {
    return ''
  }
  return String(node.id ?? node.path ?? '')
}

function isRootExpanded(root) {
  return expandedRootKeys.value.includes(getNodeKey(root))
}

function toggleRoot(root) {
  const key = getNodeKey(root)
  if (!key) {
    return
  }

  if (root.path && !root.path.startsWith('/nav/')) {
    goTo(root.path)
    if (!root.children?.length) {
      return
    }
  }

  if (isRootExpanded(root)) {
    expandedRootKeys.value = expandedRootKeys.value.filter((item) => item !== key)
    return
  }

  expandedRootKeys.value = [...expandedRootKeys.value, key]
}

function isRootActive(root) {
  return currentRootKey.value !== '' && currentRootKey.value === getNodeKey(root)
}

function isItemActive(path) {
  return route.path === path || (path !== '/' && route.path.startsWith(path))
}

function childIndentStyle(item) {
  return {
    paddingLeft: `${14 + Math.max((item.level || 1) - 1, 0) * 16}px`
  }
}

function goTo(path) {
  if (!path || path.startsWith('/nav/')) {
    return
  }

  if (route.path === path) {
    return
  }

  router.push(path)
}

function selectTheme(theme) {
  setTheme(theme)
}

function toggleHeaderMenu() {
  headerMenuOpen.value = !headerMenuOpen.value
}

function closeHeaderMenu() {
  headerMenuOpen.value = false
}

function handleShellClick(event) {
  const trigger = event.target.closest('[data-header-user-trigger]')
  const menu = event.target.closest('[data-header-user-menu]')

  if (trigger || menu) {
    return
  }

  closeHeaderMenu()
}

function syncPageOverflow() {
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
}

async function handleLogout() {
  try {
    await api.post('/api/auth/logout', {})
  } catch (error) {
    // Ignore logout failures and clear local session anyway.
  } finally {
    closeHeaderMenu()
    clearSession()
    router.replace('/login')
  }
}

watch(
  navigationRoots,
  (roots) => {
    const rootKeys = roots.map((item) => getNodeKey(item)).filter(Boolean)
    const previous = new Set(expandedRootKeys.value)

    if (!previous.size) {
      expandedRootKeys.value = []
      return
    }

    expandedRootKeys.value = rootKeys.filter((key) => previous.has(key))
  },
  { immediate: true }
)

watch(shouldConstrainContent, () => {
  syncPageOverflow()
})

onMounted(() => {
  syncPageOverflow()
})

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})
</script>

<template>
  <div
    class="app-shell"
    :class="[
      `theme-${currentTheme}`,
      {
        'app-shell-constrained': shouldConstrainContent,
        'app-shell-workbench': isWorkbenchRoute
      }
    ]"
    :style="shellVisualStyle"
    @click="handleShellClick"
  >
    <main
      class="shell-main"
      :class="{
        'shell-main-constrained': shouldConstrainContent,
        'shell-main-workbench': isWorkbenchRoute
      }"
    >
      <header v-if="!isWorkbenchRoute" class="shell-header glass-card">
        <div class="header-left">
          <div class="header-copy">
            <span class="header-section-pill">模型一体化平台</span>
            <p class="header-date-inline">{{ currentDateText }}</p>
          </div>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="header-user-card"
            :class="{ active: headerMenuOpen }"
            data-header-user-trigger
            @click.stop="toggleHeaderMenu"
          >
            <strong class="header-user-name">{{ displayUsername }}</strong>
          </button>

          <div
            v-if="headerMenuOpen"
            class="header-user-menu glass-card"
            data-header-user-menu
            @click.stop
          >
            <div class="header-user-menu-section">
              <span class="header-user-menu-title">用户信息</span>
              <div class="header-summary">
                <span class="header-summary-item">角色：{{ currentRoles }}</span>
                <span class="header-summary-item">岗位：{{ currentPosts }}</span>
                <span class="header-summary-item">公司：{{ currentCompany }}</span>
              </div>
            </div>

            <div class="header-user-menu-section">
              <span class="header-user-menu-title">主题切换</span>
              <div class="theme-switch-row header-theme-switch">
                <button
                  type="button"
                  class="theme-switch-button"
                  :class="{ active: currentTheme === 'dark' }"
                  @click="selectTheme('dark')"
                >
                  <span class="theme-switch-icon moon" aria-hidden="true"></span>
                  <span>暗色</span>
                </button>

                <button
                  type="button"
                  class="theme-switch-button"
                  :class="{ active: currentTheme === 'light' }"
                  @click="selectTheme('light')"
                >
                  <span class="theme-switch-icon sun" aria-hidden="true"></span>
                  <span>亮色</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              class="logout-button header-logout-button"
              @click="handleLogout"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>
      <aside v-if="!isWorkbenchRoute" class="shell-sidebar glass-card">
        <div class="sidebar-brand">
          <strong class="sidebar-title" style="text-align: center; display: block;">系统导航</strong>
        </div>

        <nav class="sidebar-tree">
          <section
            v-for="root in navigationRoots"
            :key="getNodeKey(root)"
            class="tree-group"
            :class="{ expanded: isRootExpanded(root) }"
          >
            <button
              type="button"
              class="tree-group-trigger"
              :class="{ active: isRootActive(root) }"
              @click="toggleRoot(root)"
            >
              <span class="tree-group-title">{{ root.name }}</span>
              <span v-if="root.children?.length" class="tree-group-side">
                <span class="tree-group-arrow" aria-hidden="true"></span>
              </span>
            </button>

            <div v-if="root.children?.length" v-show="isRootExpanded(root)" class="tree-group-items">
              <div class="tree-subitems">
                <button
                  v-for="item in flattenChildren(root.children || [])"
                  :key="getNodeKey(item)"
                  type="button"
                  class="tree-item tree-item-child"
                  :class="{ active: isItemActive(item.path) }"
                  :style="childIndentStyle(item)"
                  @click="goTo(item.path)"
                >
                  <span class="tree-item-label">{{ item.name }}</span>
                </button>
              </div>
            </div>
          </section>
        </nav>
      </aside>

      <section class="shell-panel">
        <section
          class="shell-content"
          :class="{
            'shell-content-constrained': shouldConstrainContent,
            'shell-content-page-full': shouldFullSizePageCard,
            'shell-content-page-narrow': shouldNarrowPageCard
          }"
        >
          <router-view />
        </section>
      </section>
    </main>

    <div
      v-if="xiaoyiVisible && !isWorkbenchRoute"
      class="xiaoyi-float-card"
      :style="{ left: xiaoyiPosition.x + 'px', top: xiaoyiPosition.y + 'px' }"
      @mousedown="startDrag"
      @click="openXiaoyiMenu"
    >
      <span class="xiaoyi-label">小易</span>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  height: 100vh;
  padding: clamp(0.3rem, 0.16rem + 0.4vw, 0.46rem) clamp(0.875rem, 0.5rem + 1vw, 1.375rem)
    clamp(0.875rem, 0.5rem + 1vw, 1.375rem);
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
  --surface-warning: rgba(237, 124, 71, 0.12);
  --surface-success: var(--surface-accent-alt);
  --surface-neutral: rgba(148, 163, 184, 0.12);
  --surface-danger: rgba(251, 113, 133, 0.14);
  --surface-code: rgba(2, 6, 23, 0.58);
  --surface-border: rgba(148, 163, 184, 0.18);
  --surface-inset: rgba(255, 255, 255, 0.06);
  --panel-card-bg: var(--surface-card);
  --panel-card-bg-strong: var(--surface-card-strong);
  --panel-card-bg-soft: var(--surface-card-soft);
  --panel-card-bg-faint: var(--surface-card-faint);
  --panel-card-border: var(--surface-border);
  --panel-card-shadow: var(--shadow-md);
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
  --surface-warning: rgba(237, 124, 71, 0.12);
  --surface-success: var(--surface-accent-alt);
  --surface-neutral: rgba(103, 114, 135, 0.1);
  --surface-danger: rgba(207, 76, 76, 0.12);
  --surface-code: rgba(241, 245, 249, 0.92);
  --surface-border: rgba(27, 37, 54, 0.1);
  --surface-inset: rgba(255, 255, 255, 0.78);
  --panel-card-bg: var(--surface-card);
  --panel-card-bg-strong: var(--surface-card-strong);
  --panel-card-bg-soft: var(--surface-card-soft);
  --panel-card-bg-faint: var(--surface-card-faint);
  --panel-card-border: var(--surface-border);
  --panel-card-shadow: var(--shadow-md);
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
  display: grid;
  grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas:
    'header header'
    'sidebar panel';
  gap: clamp(0.875rem, 0.5rem + 1vw, 1.25rem);
  min-height: calc(100dvh - 1.75rem);
  height: calc(100dvh - 1.75rem);
}

.shell-main-constrained {
  min-height: 0;
}

.shell-main-workbench {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  grid-template-areas: 'panel';
  min-height: 100dvh;
  height: 100dvh;
  padding: 0;
  gap: 0;
}

.shell-sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  gap: calc(16px * var(--ui-scale));
  min-height: 0;
  height: 98%;
  align-self: start;
  padding: clamp(1rem, 0.55rem + 1.2vw, 1.4rem);
  border-radius: calc(30px * var(--ui-scale));
  background:
    radial-gradient(circle at top left, rgba(34, 211, 238, 0.14), transparent 32%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(15, 23, 42, 0.72)),
    rgba(15, 23, 42, 0.62);
  border: 1px solid rgba(34, 211, 238, 0.18);
  box-shadow:
    0 24px 48px rgba(3, 10, 26, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.app-shell.theme-light .shell-sidebar {
  background:
    radial-gradient(circle at top left, rgba(255, 216, 188, 0.26), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(247, 250, 255, 0.84)),
    rgba(255, 255, 255, 0.78);
  border-color: rgba(27, 37, 54, 0.08);
  box-shadow:
    0 24px 48px rgba(29, 35, 52, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.sidebar-brand {
  display: grid;
  gap: calc(8px * var(--ui-scale));
}

.sidebar-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: calc(7px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: 999px;
  background: var(--surface-accent-alt);
  color: var(--brand-alt);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  letter-spacing: 0.06em;
}

.sidebar-title {
  color: var(--text-main);
  font-size: 14px;
  line-height: 1.1;
}

.sidebar-date {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.sidebar-tree {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: calc(12px * var(--ui-scale));
  padding-right: calc(4px * var(--ui-scale));
  -ms-overflow-style: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
}

.sidebar-tree::-webkit-scrollbar {
  width: calc(8px * var(--ui-scale));
}

.sidebar-tree::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-tree::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.36);
}

.sidebar-tree::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.54);
}

.tree-group {
  overflow: visible;
}

.tree-group-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(10px * var(--ui-scale));
  padding: calc(10px * var(--ui-scale)) calc(8px * var(--ui-scale));
  border: none;
  border-radius: calc(14px * var(--ui-scale));
  background: transparent;
  color: var(--text-main);
  text-align: left;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.tree-group-trigger:hover {
  transform: translateX(2px);
  background: rgba(255, 255, 255, 0.04);
}

.tree-group-trigger.active {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(122, 221, 193, 0.1));
  color: #f8fafc;
}

.app-shell.theme-light .tree-group-trigger:hover {
  background: rgba(27, 37, 54, 0.04);
}

.app-shell.theme-light .tree-group-trigger.active {
  background: linear-gradient(135deg, rgba(255, 243, 234, 0.94), rgba(241, 248, 246, 0.92));
  color: #182131;
}

.tree-group-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.tree-group-side {
  display: inline-flex;
  align-items: center;
  gap: calc(10px * var(--ui-scale));
  flex: 0 0 auto;
}

.tree-group-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: calc(28px * var(--ui-scale));
  min-height: calc(24px * var(--ui-scale));
  padding: 0 calc(8px * var(--ui-scale));
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 16px;
  font-weight: 700;
}

.tree-group-arrow {
  width: calc(10px * var(--ui-scale));
  height: calc(10px * var(--ui-scale));
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.18s ease;
}

.tree-group.expanded .tree-group-arrow {
  transform: rotate(225deg);
}

.tree-group-items {
  display: grid;
  gap: calc(6px * var(--ui-scale));
  padding: 0 0 calc(8px * var(--ui-scale)) calc(12px * var(--ui-scale));
}

.tree-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: calc(36px * var(--ui-scale));
  padding: calc(6px * var(--ui-scale)) calc(8px * var(--ui-scale));
  border: none;
  border-radius: calc(12px * var(--ui-scale));
  background: transparent;
  color: var(--text-main);
  text-align: left;
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.tree-item:hover {
  transform: translateX(2px);
  background: rgba(255, 255, 255, 0.04);
}

.tree-item.active {
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(122, 221, 193, 0.1));
  color: #f8fafc;
  font-weight: 700;
}

.app-shell.theme-light .tree-item {
  background: transparent;
  color: var(--text-main);
}

.app-shell.theme-light .tree-item:hover {
  background: rgba(27, 37, 54, 0.04);
}

.app-shell.theme-light .tree-item.active {
  background: linear-gradient(135deg, rgba(255, 243, 234, 0.94), rgba(241, 248, 246, 0.92));
  color: #182131;
}

.tree-item-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.tree-subitems {
  display: grid;
  gap: calc(6px * var(--ui-scale));
  padding-left: calc(4px * var(--ui-scale));
}

.tree-item-child {
  min-height: calc(38px * var(--ui-scale));
  background: rgba(2, 6, 23, 0.18);
}

.theme-switch-row {
  display: flex;
  gap: calc(10px * var(--ui-scale));
}

.theme-switch-button,
.logout-button {
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

.theme-switch-button {
  flex: 1 1 0;
}

.theme-switch-button:hover,
.logout-button:hover {
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

.logout-button {
  background: rgba(127, 29, 29, 0.24);
  border-color: rgba(248, 113, 113, 0.18);
  color: #fecaca;
}

.logout-button:hover {
  border-color: rgba(248, 113, 113, 0.28);
  color: #ffe4e6;
}

.app-shell.theme-light .theme-switch-button,
.app-shell.theme-light .logout-button {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 249, 253, 0.9)),
    rgba(255, 255, 255, 0.84);
  border-color: rgba(27, 37, 54, 0.08);
  color: #1b2536;
  box-shadow:
    0 10px 22px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.app-shell.theme-light .theme-switch-button:hover,
.app-shell.theme-light .logout-button:hover {
  border-color: rgba(237, 124, 71, 0.18);
  box-shadow:
    0 10px 20px rgba(29, 35, 52, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.app-shell.theme-light .theme-switch-button.active {
  border-color: rgba(237, 124, 71, 0.16);
  background: linear-gradient(135deg, rgba(255, 243, 234, 0.94), rgba(241, 248, 246, 0.92));
}

.app-shell.theme-light .logout-button {
  background: rgba(207, 76, 76, 0.12);
  border-color: rgba(207, 76, 76, 0.14);
  color: #c24141;
}

.theme-switch-icon {
  --theme-icon-surface: rgba(255, 255, 255, 0.06);
  --theme-icon-cutout: rgba(8, 16, 29, 0.92);
  position: relative;
  width: calc(18px * var(--ui-scale));
  height: calc(18px * var(--ui-scale));
  flex: 0 0 auto;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.24), transparent 48%),
    var(--theme-icon-surface);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 5px 12px rgba(2, 6, 23, 0.18);
  transform: var(--theme-icon-transform, none);
  isolation: isolate;
}

.theme-switch-icon::before,
.theme-switch-icon::after {
  content: '';
  position: absolute;
  border-radius: 50%;
}

.app-shell.theme-light .theme-switch-icon {
  --theme-icon-surface: rgba(255, 255, 255, 0.78);
  --theme-icon-cutout: rgba(247, 250, 255, 0.96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 7px 14px rgba(148, 163, 184, 0.18);
}

.theme-switch-icon.moon {
  --theme-icon-transform: rotate(-16deg);
}

.theme-switch-icon.moon::before {
  inset: calc(2px * var(--ui-scale));
  background: linear-gradient(135deg, #f8fbff 12%, #dbeafe 48%, #a5b4fc 100%);
  box-shadow: 0 0 12px rgba(191, 219, 254, 0.44);
}

.theme-switch-icon.moon::after {
  top: calc(1px * var(--ui-scale));
  right: calc(1px * var(--ui-scale));
  bottom: calc(1px * var(--ui-scale));
  left: calc(8px * var(--ui-scale));
  background: var(--theme-icon-cutout);
  box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.06);
}

.app-shell.theme-light .theme-switch-icon.moon::before {
  background: linear-gradient(135deg, #eff6ff 0%, #c7d2fe 52%, #93c5fd 100%);
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.24);
}

.theme-switch-icon.sun {
  overflow: visible;
}

.theme-switch-icon.sun::before {
  inset: calc(4px * var(--ui-scale));
  background: radial-gradient(circle at 35% 35%, #fff7bf 0%, #fcd34d 46%, #f59e0b 100%);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
}

.theme-switch-icon.sun::after {
  inset: calc(-3px * var(--ui-scale));
  background: repeating-conic-gradient(
    from 0deg,
    rgba(245, 158, 11, 0) 0deg 24deg,
    rgba(245, 158, 11, 0.92) 24deg 36deg
  );
  -webkit-mask: radial-gradient(circle, transparent 0 52%, #000 55% 68%, transparent 72%);
  mask: radial-gradient(circle, transparent 0 52%, #000 55% 68%, transparent 72%);
  opacity: 0.96;
}

.app-shell.theme-light .theme-switch-icon.sun::before {
  background: radial-gradient(circle at 35% 35%, #fff7d1 0%, #fdba74 42%, #ed7c47 100%);
  box-shadow: 0 0 12px rgba(237, 124, 71, 0.28);
}

.app-shell.theme-light .theme-switch-icon.sun::after {
  background: repeating-conic-gradient(
    from 0deg,
    rgba(237, 124, 71, 0) 0deg 24deg,
    rgba(237, 124, 71, 0.86) 24deg 36deg
  );
}

.shell-panel {
  grid-area: panel;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.shell-header {
  grid-area: header;
  position: relative;
  z-index: 40;
  flex: 0 0 auto;
  width: 100%;
  font-size: 16px;
  border-radius: calc(28px * var(--ui-scale));
  padding: clamp(1rem, 0.55rem + 1.2vw, 1.5rem) clamp(1rem, 0.4rem + 1.5vw, 1.75rem);
  display: flex;
  justify-content: space-between;
  gap: calc(14px * var(--ui-scale));
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
  flex-wrap: wrap;
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
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
  box-shadow:
    0 12px 28px rgba(3, 10, 26, 0.28),
    0 0 18px rgba(34, 211, 238, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
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

.header-date-inline {
  margin: 0;
  color: rgba(229, 231, 235, 0.76);
  font-size: 10px;
  line-height: 1.5;
  white-space: nowrap;
}

.app-shell.theme-light .header-date-inline {
  color: var(--text-muted);
}

.header-summary {
  display: grid;
  gap: calc(8px * var(--ui-scale));
}

.header-summary-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: calc(8px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: 999px;
  background: var(--panel-card-bg-soft);
  border: 1px solid var(--panel-card-border);
  color: var(--text-main);
  font-size: 14px;
  box-shadow:
    var(--panel-card-shadow),
    inset 0 1px 0 var(--surface-inset);
}

.header-actions {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: calc(10px * var(--ui-scale));
  flex-wrap: wrap;
}

.header-user-card {
  appearance: none;
  display: inline-grid;
  align-items: center;
  gap: calc(2px * var(--ui-scale));
  padding: calc(8px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: 999px;
  border: 1px solid rgba(34, 211, 238, 0.18);
  background:
    linear-gradient(180deg, rgba(19, 32, 58, 0.94), rgba(8, 16, 29, 0.94)),
    linear-gradient(135deg, rgba(34, 211, 238, 0.08), transparent);
  color: #e6faff;
  cursor: pointer;
  box-shadow:
    0 14px 30px rgba(3, 10, 26, 0.32),
    0 0 20px rgba(34, 211, 238, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.header-user-label {
  color: rgba(230, 250, 255, 0.76);
  font-size: calc(11px * var(--ui-scale));
  line-height: 1.2;
  text-align: left;
}

.header-user-name {
  color: #ffffff;
  font-size: 16px;
  line-height: 1.2;
  text-align: left;
}

.header-user-card.active {
  border-color: rgba(34, 211, 238, 0.3);
  box-shadow:
    0 18px 36px rgba(3, 10, 26, 0.38),
    0 0 26px rgba(34, 211, 238, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.app-shell.theme-light .header-user-card {
  border-color: rgba(237, 124, 71, 0.18);
  background: linear-gradient(135deg, #ed7c47 0%, #f3a166 100%);
  color: #ffffff;
  box-shadow:
    0 14px 28px rgba(237, 124, 71, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.24);
}

.app-shell.theme-light .header-user-label {
  color: rgba(255, 247, 240, 0.86);
}

.app-shell.theme-light .header-user-name {
  color: #ffffff;
}

.app-shell.theme-light .header-user-card.active {
  border-color: rgba(237, 124, 71, 0.28);
  box-shadow:
    0 18px 34px rgba(237, 124, 71, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.header-user-menu {
  position: absolute;
  top: calc(100% + 10px * var(--ui-scale));
  right: 0;
  width: min(24rem, calc(100vw - 2rem));
  padding: calc(14px * var(--ui-scale));
  border-radius: calc(20px * var(--ui-scale));
  border: 1px solid var(--panel-card-border);
  background:
    radial-gradient(circle at top right, rgba(34, 211, 238, 0.1), transparent 34%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.84));
  box-shadow:
    0 18px 40px rgba(3, 10, 26, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  z-index: 60;
}

.app-shell.theme-light .header-user-menu {
  background:
    radial-gradient(circle at top right, rgba(255, 216, 188, 0.22), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.94));
  box-shadow:
    0 18px 36px rgba(29, 35, 52, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.header-user-menu-section {
  display: grid;
  gap: calc(10px * var(--ui-scale));
}

.header-user-menu-section + .header-user-menu-section {
  margin-top: calc(12px * var(--ui-scale));
  padding-top: calc(12px * var(--ui-scale));
  border-top: 1px solid var(--panel-card-border);
}

.header-user-menu-title {
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.2;
  letter-spacing: 0.04em;
}

.header-user-menu .theme-switch-button,
.header-user-menu .logout-button {
  font-size: 14px;
}

.header-theme-switch {
  flex: 0 0 auto;
  width: 100%;
}

.header-logout-button {
  width: 100%;
  flex: 0 0 auto;
  margin-top: calc(12px * var(--ui-scale));
}

.shell-content {
  min-width: 0;
  min-height: 0;
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  overflow: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.shell-content::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.shell-content-constrained {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.shell-content-page-full :deep(.admin-scroll-page) {
  width: 100%;
  height: 98%;
  margin-left: auto;
  margin-right: auto;
}

.shell-content-page-full :deep(.data-panel),
.shell-content-page-full :deep(.home-panel),
.shell-content-page-full :deep(.log-panel) {
  width: 100%;
  height: 100%;
  margin-left: auto;
  margin-right: auto;
}

.shell-content-page-narrow :deep(.data-panel),
.shell-content-page-narrow :deep(.home-panel) {
  width: 98%;
  margin-left: auto;
  margin-right: auto;
}

.app-shell-workbench .shell-panel,
.app-shell-workbench .shell-content {
  height: 100%;
}

.app-shell-workbench {
  padding: 0;
  background: #ffffff;
}

.app-shell-workbench::before,
.app-shell-workbench::after {
  display: none;
}

.app-shell-workbench.theme-light {
  background: #ffffff;
}

@media (max-width: 1180px) {
  .shell-main {
    grid-template-columns: minmax(14rem, 16rem) minmax(0, 1fr);
  }
}

@media (max-width: 960px) {
  .shell-main {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto minmax(0, 1fr);
    grid-template-areas:
      'header'
      'sidebar'
      'panel';
    min-height: auto;
    height: auto;
  }

  .shell-sidebar {
    min-height: auto;
  }

  .sidebar-tree {
    max-height: 34vh;
  }

  .shell-panel {
    overflow: visible;
  }

  .shell-content {
    overflow: visible;
  }
}

@media (max-width: 720px) {
  .app-shell {
    padding: 0.3rem 0.875rem 0.875rem;
  }

  .header-copy,
  .header-actions {
    width: 100%;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .header-user-menu {
    left: 0;
    right: auto;
    width: 100%;
  }

  .theme-switch-row {
    flex-direction: column;
  }
}

.xiaoyi-float-card {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #4a9eff, #7addc1);
  color: white;
  border-radius: 20px;
  cursor: grab;
  user-select: none;
  box-shadow: 0 4px 16px rgba(74, 158, 255, 0.35);
  font-size: 14px;
  font-weight: 600;
  transition: box-shadow 0.2s;
}

.xiaoyi-float-card:hover {
  box-shadow: 0 6px 24px rgba(74, 158, 255, 0.5);
}

.xiaoyi-float-card:active {
  cursor: grabbing;
}

.xiaoyi-icon {
  font-size: 16px;
  font-weight: 700;
}

.xiaoyi-label {
  font-size: 13px;
}
</style>
