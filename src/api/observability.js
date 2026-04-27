/**
 * 可观测性 / 合规审计 SDK
 *
 * 用于 LogModuleView "观测认证" + "合规日志" 子面板。
 *
 * 覆盖：
 *   - GET  /api/observability/logs   全链路问答日志（问题、答复、召回、合规）
 *   - GET  /api/moderation/logs      合规命中日志
 *   - POST /api/moderation/reload    重新加载合规规则配置
 */
import { api, qs } from './_request'

/**
 * 列出 agent 调用全链路日志。
 * @param {{
 *   agent_name?: 'visit_assistant_agent'|'rule_qa_agent'|'admin_rule_qa_agent',
 *   keyword?: string,
 *   limit?: number
 * }} [params]
 */
export function listObservabilityLogs(params) {
  return api.get(`/api/observability/logs${qs(params)}`)
}

/**
 * 列出合规命中日志。
 * @param {{ direction?: 'input'|'output', action?: 'allow'|'block'|'redact', limit?: number }} [params]
 */
export function listModerationLogs(params) {
  return api.get(`/api/moderation/logs${qs(params)}`)
}

/** 重新加载合规规则配置（运维操作） */
export function reloadModerationRules() {
  return api.post('/api/moderation/reload')
}
