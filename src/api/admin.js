/**
 * 管理台种子数据 SDK
 *
 * 覆盖：
 *   - 银行产品目录 /api/admin/products
 *   - 企业画像   /api/admin/enterprises
 *   - 行业动态   /api/admin/insights
 */
import { api } from './_request'

/* -------------------- 银行产品 -------------------- */

/** 列出激活的银行产品 */
export function listProducts() {
  return api.get('/api/admin/products')
}

/** 拉单个产品 */
export function getProduct(productId) {
  return api.get(`/api/admin/products/${encodeURIComponent(productId)}`)
}

/**
 * upsert 产品（按 product_id 主键判断新建还是覆盖）。
 * @param {{
 *   product_id: string,
 *   product_name: string,
 *   target_industries?: string[],
 *   client_tiers?: string[],
 *   trigger_signals?: string[],
 *   description?: string,
 *   risk_level?: string,
 *   status?: 'active'|'inactive'
 * }} body
 */
export function upsertProduct(body) {
  return api.post('/api/admin/products', body)
}

/** 删产品 */
export function deleteProduct(productId) {
  return api.delete(`/api/admin/products/${encodeURIComponent(productId)}`)
}

/* -------------------- 企业画像 -------------------- */

/** 列出企业画像 */
export function listEnterprises() {
  return api.get('/api/admin/enterprises')
}

/** 单个企业画像（按公司名） */
export function getEnterprise(companyName) {
  return api.get(`/api/admin/enterprises/${encodeURIComponent(companyName)}`)
}

/**
 * upsert 企业画像。
 * @param {{
 *   company_name: string,
 *   industry?: string,
 *   tier?: string,
 *   summary?: string,
 *   tags?: string[],
 *   risk_signals?: string[]
 * }} body
 */
export function upsertEnterprise(body) {
  return api.post('/api/admin/enterprises', body)
}

/** 删企业画像 */
export function deleteEnterprise(companyName) {
  return api.delete(`/api/admin/enterprises/${encodeURIComponent(companyName)}`)
}

/* -------------------- 行业动态 -------------------- */

/** 列出行业动态 */
export function listInsights() {
  return api.get('/api/admin/insights')
}

/** 单个行业动态 */
export function getInsight(insightId) {
  return api.get(`/api/admin/insights/${insightId}`)
}

/**
 * 创建行业动态。
 * @param {{ industry: string, title: string, content: string, source?: string, published_at?: string }} body
 */
export function createInsight(body) {
  return api.post('/api/admin/insights', body)
}

/**
 * 更新指定行业动态。
 * @param {number} insightId
 * @param {object} body
 */
export function updateInsight(insightId, body) {
  return api.put(`/api/admin/insights/${insightId}`, body)
}

/** 删行业动态 */
export function deleteInsight(insightId) {
  return api.delete(`/api/admin/insights/${insightId}`)
}
