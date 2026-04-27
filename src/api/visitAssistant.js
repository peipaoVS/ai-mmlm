/**
 * 访客辅助域（visit_assistant_agent）SDK
 *
 * 覆盖 `app/api.py` 中所有 /awp/visit-assistant/* 流式接口
 * 与 /api/visit-assistant/* REST 接口。
 *
 * 调用方典型场景：
 *   - 聊天页：startStream / startReportRegenerate
 *   - 历史侧栏：listHistory / listThreadIds
 *   - 待办面板：listTasks / reviseTask / deleteTask / listTaskRevisions
 *   - 报告查看：getReport / getReportHistory / downloadReport
 */
import { api, qs } from './_request'

/* -------------------------------------------------------------------- */
/* AG-UI 流式接口（SSE）                                                  */
/* -------------------------------------------------------------------- */

/**
 * 标准 RunAgentInput body 形态（与后端 ag_ui.core.RunAgentInput 对齐）。
 * @typedef {Object} RunAgentInput
 * @property {string} threadId       会话 id（同一个会话保持不变）
 * @property {string} runId          单次运行 id（每次发送都新生成）
 * @property {string} [parentRunId]  父运行 id，可空
 * @property {string} [variant]      可选 'full' | 'brief' | 'both'
 * @property {Object} state          业务状态：{ agent, action, task_payload, ... }
 * @property {Array<{id:string, role:'user'|'assistant', content:string}>} messages
 * @property {Array} [tools]
 * @property {Array} [context]
 * @property {Object} [forwardedProps]
 */

/**
 * 启动访客辅助主流（parse / confirm / supplement / correct）。
 * 用于 ChatView 主聊天框。
 * @param {RunAgentInput} body
 * @returns {AsyncGenerator}  SSE 事件流，调用方用 `for await ... of` 消费
 * @example
 *   const stream = startStream({
 *     threadId, runId,
 *     state: { agent: 'visit_assistant_agent', action: 'parse', task_payload: {} },
 *     messages: [{ id: 'm1', role: 'user', content: '明天 9 点拜访华夏科技' }],
 *   })
 *   for await (const evt of stream) { ... }
 */
export function startStream(body) {
  return api.stream('/awp/visit-assistant', body)
}

/** 报告详情流（基于已有 report_id 重放报告生成） */
export function startReportDetail(body) {
  return api.stream('/awp/visit-assistant/report-detail', body)
}

/** 重新生成报告（带 supplement 文本） */
export function startReportRegenerate(body) {
  return api.stream('/awp/visit-assistant/report-regenerate', body)
}

/** 流式拉历史（用 AG-UI 协议返回 JSON 事件） */
export function streamHistory(body) {
  return api.stream('/awp/visit-assistant/history', body)
}

/** 流式拉 thread id 列表 */
export function streamThreadIds(body) {
  return api.stream('/awp/visit-assistant/thread-ids', body)
}

/** 流式拉报告变更历史 */
export function streamReportHistory(body) {
  return api.stream('/awp/visit-assistant/report-history', body)
}

/** 流式拉任务清单（少用，REST 版 listTasks 更直观） */
export function streamTasks(body) {
  return api.stream('/awp/visit-assistant/tasks', body)
}

/* -------------------------------------------------------------------- */
/* REST：会话 / 历史                                                      */
/* -------------------------------------------------------------------- */

/**
 * 拉访客辅助会话历史（多轮消息）。
 * 用于：ChatView 启动时回填上次对话。
 * @param {{ thread_id?: string, report_id?: number, limit?: number }} [params]
 * @returns {Promise<{ messages: Array, count: number }>}
 */
export function listHistory(params) {
  return api.get(`/api/visit-assistant/history${qs(params)}`)
}

/**
 * 拉所有 thread id（按时间倒序）。
 * @param {{ limit?: number }} [params]
 */
export function listThreadIds(params) {
  return api.get(`/api/visit-assistant/thread-ids${qs(params)}`)
}

/* -------------------------------------------------------------------- */
/* REST：定时任务                                                         */
/* -------------------------------------------------------------------- */

/**
 * 拉定时任务列表。用于 ChatView 左侧"待办事项"。
 * @param {{ status?: 'pending'|'ready'|'preparing'|'sent'|'done'|'cancelled', task_type?: 'visit_report'|'follow_up', limit?: number }} [params]
 * @returns {Promise<{ tasks: Array, count: number }>}
 */
export function listTasks(params) {
  return api.get(`/api/visit-assistant/tasks${qs(params)}`)
}

/**
 * 删除定时任务（同时清掉 APScheduler 中对应的 job）。
 * @param {number} taskId
 */
export function deleteTask(taskId) {
  return api.delete(`/api/visit-assistant/tasks/${taskId}`)
}

/**
 * 修订定时任务。支持自然语言 description 或结构化字段，二者至少给一个。
 * 当 dry_run=true 时仅校验，不真正落库（用于"预览修改结果"场景）。
 *
 * @param {number} taskId
 * @param {{
 *   description?: string,
 *   visit_time?: string,
 *   trigger_time?: string,
 *   report_send_time?: string,
 *   company_name?: string,
 *   title?: string,
 *   dry_run?: boolean,
 *   regenerate_report?: boolean
 * }} payload
 * @example
 *   await reviseTask(12, { title: '华夏科技拜访（改名）', dry_run: false })
 */
export function reviseTask(taskId, payload) {
  return api.post(`/api/visit-assistant/tasks/${taskId}/revise`, payload)
}

/**
 * 任务的修订审计日志。
 * @param {number} taskId
 * @param {{ limit?: number }} [params]
 */
export function listTaskRevisions(taskId, params) {
  return api.get(`/api/visit-assistant/tasks/${taskId}/revisions${qs(params)}`)
}

/* -------------------------------------------------------------------- */
/* REST：访前报告                                                         */
/* -------------------------------------------------------------------- */

/**
 * 拉单份报告完整内容。
 * 注意：传入的应是 `task.prepared_report_id`，不是 `task.id`。
 * @param {number} reportId
 */
export function getReport(reportId) {
  return api.get(`/api/visit-assistant/reports/${reportId}`)
}

/**
 * 拉报告的修改历史 + 版本快照。
 * @param {number} reportId
 * @param {{ thread_id?: string, limit?: number }} [params]
 */
export function getReportHistory(reportId, params) {
  return api.get(`/api/visit-assistant/reports/${reportId}/history${qs(params)}`)
}

/**
 * 下载报告 Word 文件。返回原始 Blob，调用方需自行用 fetch/axios。
 * 这里仅返回拼好的 URL；导出按钮里用 `fetch(url, { headers: { Authorization } })` 拉。
 *
 * @param {number} reportId
 * @param {{ variant?: 'full'|'brief', include_meta?: boolean, version?: number }} [params]
 * @returns {string}  完整请求路径（不含 base，由调用方 + token 自行 fetch）
 */
export function buildDownloadUrl(reportId, params) {
  return `/api/visit-assistant/reports/${reportId}/download${qs(params)}`
}
