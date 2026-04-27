/**
 * 规则知识库 SDK
 *
 * 读端（普通用户可访问）：
 *   - GET /api/rule-kb/catalog          目录（按用户分行权限过滤）
 *   - GET /api/rule-kb/source           整篇文档全文
 *   - GET /api/rule-kb/chapter          单章节内容
 *
 * 写端（仅管理员，admin-rule-qa）：
 *   - POST /api/admin-rule-kb/upload-md       上传 .md 入库
 *   - GET  /api/admin-rule-kb/impact-analysis 评估改动影响
 *   - POST /api/admin-rule-kb/batch-upsert    批量创建/更新章节
 */
import { api, qs } from './_request'

/* -------------------- 读端 -------------------- */

/**
 * 拉规则库目录（按当前用户的分行权限过滤）。
 * @param {{ branch?: string }} [params]  显式指定分行（管理员才能跨分行）
 */
export function listKbCatalog(params) {
  return api.get(`/api/rule-kb/catalog${qs(params)}`)
}

/**
 * 拉指定 (scope, source) 的整篇文档全文。
 * @param {{ scope: string, source: string }} params
 */
export function getKbSource(params) {
  return api.get(`/api/rule-kb/source${qs(params)}`)
}

/**
 * 拉指定章节的当前生效内容。
 * @param {{ scope: string, source: string, chapter: string }} params
 */
export function getKbChapter(params) {
  return api.get(`/api/rule-kb/chapter${qs(params)}`)
}

/* -------------------- 写端（管理员）-------------------- */

/**
 * 上传 .md 文件入库（multipart/form-data）。
 * @param {File} file
 * @param {{ scope?: string, source?: string }} [extra]
 */
export function uploadKbMarkdown(file, extra = {}) {
  const fd = new FormData()
  fd.append('file', file)
  if (extra.scope) fd.append('scope', extra.scope)
  if (extra.source) fd.append('source', extra.source)
  return fetch('/api/admin-rule-kb/upload-md', {
    method: 'POST',
    body: fd,
    credentials: 'include',
  }).then(async (resp) => {
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) throw new Error(data.detail || data.message || '上传失败')
    return data
  })
}

/**
 * 评估即将提交的改动会影响哪些下游答疑（合规、检索命中度等）。
 * @param {{ scope?: string, source?: string }} [params]
 */
export function getKbImpactAnalysis(params) {
  return api.get(`/api/admin-rule-kb/impact-analysis${qs(params)}`)
}

/**
 * 批量 upsert 章节内容。
 * @param {{ scope: string, source: string, chapters: Array<{ node_key: string, title: string, content: string, level?: number, parent_title?: string }> }} body
 */
export function batchUpsertKbChapters(body) {
  return api.post('/api/admin-rule-kb/batch-upsert', body)
}
