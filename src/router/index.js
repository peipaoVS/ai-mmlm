import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import LoginView from '../views/LoginView.vue'
import ChatView from '../views/ChatView.vue'
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
