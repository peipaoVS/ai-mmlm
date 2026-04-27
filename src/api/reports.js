/**
 * 报告 + 访后纪要 SDK
 *
 * 覆盖：
 *   - /api/reports                                       报告列表
 *   - /api/reports/{report_id}                           删除报告
 *   - /api/reports/{report_id}/post-visit-summary        访后纪要 CRUD
 *   - /api/reports/{report_id}/post-visit-summary/rewrite 重写
 *   - /api/post-visit-summaries                          全量列表
 */
import { api, qs } from './_request'

/* -------------------- 报告 -------------------- */

/**
 * 列出报告。可按公司名/创建时间过滤。
 * @param {{ company_name?: string, limit?: number }} [params]
 */
export function listReports(params) {
  return api.get(`/api/reports${qs(params)}`)
}

/** 删除报告（连同版本快照、变更日志）。 */
export function deleteReport(reportId) {
  return api.delete(`/api/reports/${reportId}`)
}

/* -------------------- 访后纪要 -------------------- */

/**
 * 给指定报告生成访后纪要（需要上传 .docx/.md 文件 + LLM 提炼）。
 * 该接口接收 multipart/form-data，需要传 File。
 *
 * @param {number} reportId
 * @param {File}   file
 * @param {{ supplement?: string }} [extra]
 * @returns {Promise<any>}
 * @example
 *   const fd = new FormData()
 *   fd.append('file', file)
 *   fd.append('supplement', '附加说明')
 *   await uploadPostVisitSummary(reportId, file, { supplement: '...' })
 */
export function uploadPostVisitSummary(reportId, file, extra = {}) {
  const fd = new FormData()
  fd.append('file', file)
  if (extra.supplement) fd.append('supplement', extra.supplement)
  // 这里走原生 fetch，因 api.post 默认 application/json
  return fetch(`/api/reports/${reportId}/post-visit-summary`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  }).then(async (resp) => {
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) throw new Error(data.detail || data.message || '上传失败')
    return data
  })
}

/** 拉指定报告的当前访后纪要 */
export function getPostVisitSummary(reportId) {
  return api.get(`/api/reports/${reportId}/post-visit-summary`)
}

/** 删除指定报告的访后纪要 */
export function deletePostVisitSummary(reportId) {
  return api.delete(`/api/reports/${reportId}/post-visit-summary`)
}

/** 拉访后纪要的所有版本（含 supplement / next_visit_time 等历史） */
export function listPostVisitSummaryVersions(reportId) {
  return api.get(`/api/reports/${reportId}/post-visit-summary/versions`)
}

/**
 * 触发 LLM 重写访后纪要。
 * @param {number} reportId
 * @param {{ supplement?: string }} [body]
 */
export function rewritePostVisitSummary(reportId, body) {
  return api.post(`/api/reports/${reportId}/post-visit-summary/rewrite`, body || {})
}

/**
 * 全量访后纪要列表（不限定 report_id）。
 * @param {{ limit?: number }} [params]
 */
export function listAllPostVisitSummaries(params) {
  return api.get(`/api/post-visit-summaries${qs(params)}`)
}

/* -------------------- Todos / 待办 -------------------- */

/**
 * 业务侧 todos（独立于 scheduled_tasks，用于"客户问题待跟进"等场景）。
 * @param {{ company_name?: string, status?: string }} [params]
 */
export function listTodos(params) {
  return api.get(`/api/todos${qs(params)}`)
}

/* -------------------- Report 生成进度（轮询）-------------------- */

/**
 * 拉报告生成/重写任务进度（in-flight + 最近完成）。
 * frontend_test 里的页面在用，ai-mmlm 暂未使用。
 */
export function listReportJobs() {
  return api.get('/api/report-jobs')
}
