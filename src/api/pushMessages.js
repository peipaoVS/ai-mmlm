/**
 * 定时任务推送通知 SDK
 *
 * 后端在定时任务到点时往 push_messages 表写一条；前端通过本接口轮询展示。
 */
import { api, qs } from './_request'

/**
 * 拉推送消息（默认只拿未读）。
 * @param {{ unread_only?: boolean, limit?: number }} [params]
 * @returns {Promise<Array<{ id: number, company_name: string, content: string, is_read: 0|1, created_at: string }>>}
 */
export function listPushMessages(params) {
  return api.get(`/api/push-messages${qs(params)}`)
}

/** 标记指定消息为已读 */
export function markPushMessageRead(messageId) {
  return api.post(`/api/push-messages/${messageId}/read`)
}

/** 全部标为已读（一键清空小红点） */
export function markAllPushMessagesRead() {
  return api.post('/api/push-messages/mark-all-read')
}
