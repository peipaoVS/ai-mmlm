/**
 * 内部 helper：把对象拼接成 query string，自动跳过 null/undefined/空串。
 * 让所有 SDK 函数对 `params` 入参的处理保持一致。
 *
 * @param {Record<string, any>} [params]
 * @returns {string}  形如 "?status=pending&limit=50"，无参数则返回空串
 */
export function qs(params) {
  if (!params || typeof params !== 'object') return ''
  const entries = Object.entries(params).filter(([, v]) => {
    if (v === undefined || v === null) return false
    if (typeof v === 'string' && v === '') return false
    return true
  })
  if (!entries.length) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of entries) sp.append(k, String(v))
  return `?${sp.toString()}`
}

/**
 * 标准化 boolean，避免前端把 "false" 字符串当 true。
 * @param {any} v
 * @returns {boolean}
 */
export function asBool(v) {
  if (typeof v === 'boolean') return v
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'y'
}

// 重新导出底层 http 客户端（带 token / SSE / 401 处理）
export { api, request, streamRequest } from './http'
