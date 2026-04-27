/**
 * 规则答疑域 SDK（rule_qa_agent + admin_rule_qa_agent）
 *
 * 覆盖：
 *   - /awp/rule-qa[ + /history + /thread-ids ]      （普通规则答疑流式 + 历史）
 *   - /awp/admin-rule-qa[ + /history + /thread-ids ]（管理员规则答疑流式 + 历史）
 *   - /api/rule-qa/{history,thread-ids}             （REST 历史拉取）
 *   - /api/admin-rule-qa/{history,thread-ids}
 */
import { api, qs } from './_request'

/* -------------------- 普通规则答疑 -------------------- */

/**
 * 启动规则答疑流。
 * @param {import('./visitAssistant').RunAgentInput} body
 * @example
 *   const stream = ruleQaStream({
 *     threadId, runId,
 *     state: { agent: 'rule_qa_agent', action: 'query' },
 *     messages: [{ id: 'm1', role: 'user', content: '南京分行单笔限额是多少？' }],
 *   })
 */
export function ruleQaStream(body) {
  return api.stream('/awp/rule-qa', body)
}

/** 规则答疑历史（流式） */
export function ruleQaStreamHistory(body) {
  return api.stream('/awp/rule-qa/history', body)
}

/** 规则答疑 thread id 列表（流式） */
export function ruleQaStreamThreadIds(body) {
  return api.stream('/awp/rule-qa/thread-ids', body)
}

/**
 * 规则答疑历史（REST）。
 * @param {{ thread_id?: string, limit?: number }} [params]
 */
export function listRuleQaHistory(params) {
  return api.get(`/api/rule-qa/history${qs(params)}`)
}

/**
 * 规则答疑 thread id 列表（REST）。
 * @param {{ limit?: number }} [params]
 */
export function listRuleQaThreadIds(params) {
  return api.get(`/api/rule-qa/thread-ids${qs(params)}`)
}

/* -------------------- 管理员规则答疑 -------------------- */

/** 启动管理员规则答疑流（admin_rule_qa_agent） */
export function adminRuleQaStream(body) {
  return api.stream('/awp/admin-rule-qa', body)
}

export function adminRuleQaStreamHistory(body) {
  return api.stream('/awp/admin-rule-qa/history', body)
}

export function adminRuleQaStreamThreadIds(body) {
  return api.stream('/awp/admin-rule-qa/thread-ids', body)
}

/** @param {{ thread_id?: string, limit?: number }} [params] */
export function listAdminRuleQaHistory(params) {
  return api.get(`/api/admin-rule-qa/history${qs(params)}`)
}

/** @param {{ limit?: number }} [params] */
export function listAdminRuleQaThreadIds(params) {
  return api.get(`/api/admin-rule-qa/thread-ids${qs(params)}`)
}

/* -------------------- 通用 agent 入口（不指定 agent，走默认路由） -------------------- */

/**
 * 不强制 agent，由后端根据消息自动路由到 visit_assistant_agent / rule_qa_agent。
 * 一般业务页不用，调试或 generic chat 才会用到。
 */
export function runAgent(body) {
  return api.stream('/awp', body)
}
