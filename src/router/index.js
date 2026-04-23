import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import LoginView from '../views/LoginView.vue'
import ChatView from '../views/ChatView.vue'
import AgentConfigView from '../views/AgentConfigView.vue'
import KnowledgeBaseView from '../views/KnowledgeBaseView.vue'
import UsersView from '../views/UsersView.vue'
import RolesView from '../views/RolesView.vue'
import PostsView from '../views/PostsView.vue'
import { getToken } from '../stores/session'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      requiresAuth: false
    }
  },
  {
    path: '/',
    component: AppShell,
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        redirect: '/chat'
      },
      {
        path: '/chat',
        name: 'chat',
        component: ChatView,
        meta: {
          title: 'AI工作台'
        }
      },
      {
        path: '/agents',
        name: 'agents',
        component: AgentConfigView,
        meta: {
          title: '智能体配置'
        }
      },
      {
        path: '/knowledge/products',
        name: 'knowledge-products',
        component: KnowledgeBaseView,
        meta: {
          title: '产品库',
          kbKey: 'products',
          entityName: '产品',
          nameLabel: '产品名称',
          codeLabel: '产品编码',
          searchPlaceholder: '搜索产品名称 / 编码',
          codePlaceholder: '例如 PROD_001',
          remarkPlaceholder: '补充产品说明'
        }
      },
      {
        path: '/knowledge/portraits',
        name: 'knowledge-portraits',
        component: KnowledgeBaseView,
        meta: {
          title: '企业画像',
          kbKey: 'portraits',
          entityName: '画像',
          nameLabel: '画像名称',
          codeLabel: '画像编码',
          searchPlaceholder: '搜索画像名称 / 编码',
          codePlaceholder: '例如 PROFILE_001',
          remarkPlaceholder: '补充画像说明'
        }
      },
      {
        path: '/knowledge/trends',
        name: 'knowledge-trends',
        component: KnowledgeBaseView,
        meta: {
          title: '行业动态',
          kbKey: 'trends',
          entityName: '动态',
          nameLabel: '动态名称',
          codeLabel: '动态编码',
          searchPlaceholder: '搜索动态名称 / 编码',
          codePlaceholder: '例如 TREND_001',
          remarkPlaceholder: '补充动态说明'
        }
      },
      {
        path: '/users',
        name: 'users',
        component: UsersView,
        meta: {
          title: '用户管理'
        }
      },
      {
        path: '/roles',
        name: 'roles',
        component: RolesView,
        meta: {
          title: '角色管理'
        }
      },
      {
        path: '/posts',
        name: 'posts',
        component: PostsView,
        meta: {
          title: '岗位管理'
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = getToken()
  if (to.meta.requiresAuth && !token) {
    next('/login')
    return
  }
  if (to.path === '/login' && token) {
    next('/chat')
    return
  }
  next()
})

export default router
