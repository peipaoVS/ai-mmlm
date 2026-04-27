/**
 * 用户偏好（user habits）SDK
 *
 * 偏好分两类来源：
 *   - source='auto'   ：HabitCaptureAgent 自动抽取
 *   - source='manual' ：用户在偏好面板手动录入
 *
 * 覆盖：
 *   - GET    /api/habits                偏好列表
 *   - POST   /api/habits                upsert 一条
 *   - DELETE /api/habits                清空当前用户全部
 *   - DELETE /api/habits/{habit_key}    删指定 key
 *   - GET    /api/habits/events         自动抽取事件审计
 */
import { api, qs } from './_request'

/**
 * 列出当前用户的所有偏好。
 * @param {{ user_id?: string }} [params]
 */
export function listHabits(params) {
  return api.get(`/api/habits${qs(params)}`)
}

/**
 * 新增 / 更新一条偏好（按 habit_key upsert）。
 * @param {{ habit_key: string, habit_value: string|object, source?: 'auto'|'manual', user_id?: string }} body
 */
export function upsertHabit(body) {
  return api.post('/api/habits', body)
}

/**
 * 删除指定 habit。
 * @param {string} habitKey
 * @param {{ user_id?: string }} [params]
 */
export function deleteHabit(habitKey, params) {
  return api.delete(`/api/habits/${encodeURIComponent(habitKey)}${qs(params)}`)
}

/**
 * 清空当前用户全部偏好。
 * @param {{ user_id?: string }} [params]
 */
export function clearHabits(params) {
  return api.delete(`/api/habits${qs(params)}`)
}

/**
 * 自动抽取事件列表（"最近一次自动抽取在 X 分钟前"）。
 * @param {{ user_id?: string, limit?: number }} [params]
 */
export function listHabitEvents(params) {
  return api.get(`/api/habits/events${qs(params)}`)
}
