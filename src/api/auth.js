/**
 * AI 侧认证 SDK（注意：与系统侧 SSO /api/users 等是两套体系）
 *
 * 这套接口用于 AI 后端（FastAPI）的演示登录态：
 *   - GET  /api/auth/users   demo 用户名册
 *   - POST /api/auth/login   登录拿 token
 *   - POST /api/auth/logout
 *   - GET  /api/auth/me      当前登录态
 *   - GET  /api/health       健康检查
 *
 * 系统侧（用户/角色/岗位/菜单/公司）走另一台机器（vite proxy → 192.168.1.37:8017），
 * 不在本 SDK 范围内，UsersView/RolesView 仍直接 `api.get('/api/users')` 走代理即可。
 */
import { api } from './_request'

/** demo 用户名册（含 password_hint，用于自动选号） */
export function listAiUsers() {
  return api.get('/api/auth/users')
}

/**
 * AI 侧登录。
 * @param {{ username: string, password: string }} body
 * @returns {Promise<{ access_token?: string, token?: string, user?: object }>}
 */
export function aiLogin(body) {
  return api.post('/api/auth/login', body)
}

/** AI 侧登出 */
export function aiLogout() {
  return api.post('/api/auth/logout')
}

/** 拉当前登录态（auth middleware 解出来的 user_id 等） */
export function getAiMe() {
  return api.get('/api/auth/me')
}

/** 健康检查（无需登录） */
export function getHealth() {
  return api.get('/api/health')
}
