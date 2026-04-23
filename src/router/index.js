import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import LoginView from '../views/LoginView.vue'
import ChatView from '../views/ChatView.vue'
import AgentConfigView from '../views/AgentConfigView.vue'
import KnowledgeBaseView from '../views/KnowledgeBaseView.vue'
import LogModuleView from '../views/LogModuleView.vue'
import UsersView from '../views/UsersView.vue'
import RolesView from '../views/RolesView.vue'
import PostsView from '../views/PostsView.vue'
import { getToken, getUser, isObserverUser } from '../stores/session'

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
        path: '/logs/badcase',
        name: 'logs-badcase',
        component: LogModuleView,
        meta: {
          title: 'Badcase',
          observerOnly: true,
          description: '预留 Badcase 管理页，后续可接问题样本、失败案例和归档接口。'
        }
      },
      {
        path: '/logs/observation-auth',
        name: 'logs-observation-auth',
        component: LogModuleView,
        meta: {
          title: '观测认证',
          observerOnly: true,
          description: '预留观测认证管理页，后续可接观测数据、认证流程和审核接口。'
        }
      },
      {
        path: '/logs/regression-review',
        name: 'logs-regression-review',
        component: LogModuleView,
        meta: {
          title: '回归评测',
          observerOnly: true,
          description: '预留回归评测管理页，后续可接回归任务、评测结果和趋势接口。'
        }
      },
      {
        path: '/logs/fix-queue',
        name: 'logs-fix-queue',
        component: LogModuleView,
        meta: {
          title: '修复队列',
          observerOnly: true,
          description: '预留修复队列管理页，后续可接问题流转、修复状态和负责人接口。'
        }
      },
      {
        path: '/logs/rule-library',
        name: 'logs-rule-library',
        component: LogModuleView,
        meta: {
          title: '规则库',
          description: '预留规则库页面，后续可接规则配置、版本管理和发布接口。'
        }
      },
      {
        path: '/logs/instructions',
        name: 'logs-instructions',
        component: LogModuleView,
        meta: {
          title: '说明',
          description: '预留说明页面，后续可接文档、操作手册和说明内容接口。'
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
  if (to.meta.observerOnly && !isObserverUser(getUser())) {
    next('/chat')
    return
  }
  next()
})

export default router
