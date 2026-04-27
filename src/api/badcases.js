/**
 * Badcase 归因 SDK
 *
 * 用于 LogModuleView "Badcase" 子面板：标记问题样本、查看 ReAct 轨迹、归因建议。
 *
 * 覆盖：
 *   - POST   /api/badcases               创建
 *   - GET    /api/badcases               列表
 *   - GET    /api/badcases/{id}          详情
 *   - PATCH  /api/badcases/{id}          更新（status/tags/reason）
 *   - DELETE /api/badcases/{id}
 *   - GET    /api/regression/badcases    回归用例
 *   - GET    /api/repair-queue           修复队列
 */
import { api, qs } from './_request'

/**
 * 创建一条 badcase 记录。
 * 推荐传 `message_id`（让后端自己回查 agent_output + ReAct 轨迹）；
 * 兜底也支持手动传 agent_output。
 *
 * @param {{
 *   thread_id?: string,
 *   message_id?: number,
 *   source_agent?: 'visit_assistant_agent'|'rule_qa_agent'|'admin_rule_qa_agent',
 *   agent_output?: string,
 *   tags?: string[],
 *   reason?: string,
 *   user_input?: string,
 *   run_id?: string,
 *   reporter?: string
 * }} body
 */
export function createBadcase(body) {
  return api.post('/api/badcases', body)
}

/**
 * 列出 badcase。
 * @param {{ status?: 'open'|'triaged'|'fixed'|'wontfix', source_agent?: string, limit?: number }} [params]
 */
export function listBadcases(params) {
  return api.get(`/api/badcases${qs(params)}`)
}

/** 查 badcase 详情（含归因 + ReAct trace） */
export function getBadcase(badcaseId) {
  return api.get(`/api/badcases/${badcaseId}`)
}

/**
 * 更新 badcase（如标记为已修复 / 改 tags / 补 reason）。
 * @param {number} badcaseId
 * @param {{ status?: string, tags?: string[], reason?: string }} payload
 */
export function updateBadcase(badcaseId, payload) {
  return api.patch(`/api/badcases/${badcaseId}`, payload)
}

/** 删除 badcase */
export function deleteBadcase(badcaseId) {
  return api.delete(`/api/badcases/${badcaseId}`)
}

/**
 * Badcase 自动生成的回归用例。
 * @param {{ source_agent?: string, limit?: number }} [params]
 */
export function listRegressionBadcases(params) {
  return api.get(`/api/regression/badcases${qs(params)}`)
}

/**
 * 修复队列（按 target=prompt/tool/retrieval/... 聚合）。
 * @param {{ source_agent?: string, limit?: number }} [params]
 */
export function listRepairQueue(params) {
  return api.get(`/api/repair-queue${qs(params)}`)
}
