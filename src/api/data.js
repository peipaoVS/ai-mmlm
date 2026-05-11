/**
 * 统一查询入口 SDK：对 ``GET /api/data?scope=xxx`` 的封装。
 *
 * 后端实现见 ``app/api.py`` 中的 ``unified_query``，按 ``scope`` 路由到对应表，
 * 统一返回 ``{scope, items, count}``。本 SDK 默认从 ``items`` 取数组返回，
 * 让业务页可以一行调用：
 *
 *   import { DataApi } from '@/api'
 *   const tasks = await DataApi.listTasks({ status: 'pending' })
 *
 * 如需拿到完整 ``{scope, items, count}`` 对象（比如要展示总数），用 ``fetchRaw``：
 *
 *   const { items, count } = await DataApi.fetchRaw('task')
 *
 * 隔离规则与老接口一致：后端按登录用户的 ``visible_codes`` 过滤；未登录或拿不
 * 到 code 时返回零行（防止越权）。前端无需关心 code，只要 ``http.js`` 的身份
 * header / token 正确注入即可。
 */
import { api } from './http'
import { qs } from './_request'

const BASE = '/api/data'

/**
 * 内部基础调用：发请求并从响应里取 ``items`` 数组。
 *
 * @param {string} scope    后端支持的 scope（task / report / todo / push / summary / message / thread）
 * @param {Record<string, any>} [params]  其他 query 参数
 * @returns {Promise<any[]>}  items 数组（后端为空时返回 []）
 */
async function fetchByScope(scope, params = {}) {
  const result = await api.get(`${BASE}${qs({ scope, ...params })}`)
  return Array.isArray(result?.items) ? result.items : []
}

/**
 * 拿到完整响应 ``{scope, items, count}``。
 *
 * @param {string} scope
 * @param {Record<string, any>} [params]
 * @returns {Promise<{scope: string, items: any[], count: number}>}
 */
async function fetchRaw(scope, params = {}) {
  const result = await api.get(`${BASE}${qs({ scope, ...params })}`)
  return {
    scope: result?.scope ?? scope,
    items: Array.isArray(result?.items) ? result.items : [],
    count: typeof result?.count === 'number' ? result.count : 0,
  }
}

// ------------------------------------------------------------------
// 业务别名（让调用点更可读，等同于 fetchByScope('xxx', params)）
// ------------------------------------------------------------------

/**
 * 定时任务（``scheduled_tasks`` 表）。
 * @param {{status?: string, task_type?: string, user_id?: string, limit?: number}} [params]
 *   - ``status``：pending / running / done 等
 *   - ``task_type``：visit_prep / follow_up 等
 *   - ``user_id``：按创建者元数据过滤（不是身份）
 *   - ``limit``：默认 200
 */
export const listTasks = (params = {}) => fetchByScope('task', params)

/**
 * 回访报告（``visit_reports`` 表）。
 * @param {{company_name?: string, limit?: number}} [params]
 */
export const listReports = (params = {}) => fetchByScope('report', params)

/**
 * 待办事项（``todos`` 表）。
 * @param {{status?: string, company_name?: string, limit?: number}} [params]
 *   ``status`` 默认 ``pending``。
 */
export const listTodos = (params = {}) => fetchByScope('todo', params)

/**
 * 推送消息（``push_messages`` 表）。
 * @param {{unread_only?: boolean, limit?: number}} [params]
 *   ``unread_only`` 默认 ``true``。
 */
export const listPushMessages = (params = {}) => fetchByScope('push', params)

/**
 * 访后纪要（``post_visit_summaries`` 表）。
 * @param {{limit?: number}} [params]
 */
export const listSummaries = (params = {}) => fetchByScope('summary', params)

/**
 * 会话消息（``conversation_messages`` 表）。
 * @param {{thread_id?: string, report_id?: number, agent_name?: string, limit?: number}} [params]
 *   - ``agent_name`` 不传 → 走 visit_assistant agent
 *   - ``agent_name`` 传值 → 走指定 agent（如 ``rule_qa_agent``、``admin_rule_qa_agent``）
 */
export const listMessages = (params = {}) => fetchByScope('message', params)

/**
 * 会话列表（按 thread_id 去重）。
 * @param {{agent_name?: string, limit?: number}} [params]
 */
export const listThreads = (params = {}) => fetchByScope('thread', params)

// ------------------------------------------------------------------
// 通用导出（业务页可以直接调 fetchByScope/fetchRaw 传任意 scope）
// ------------------------------------------------------------------
export { fetchByScope, fetchRaw }
