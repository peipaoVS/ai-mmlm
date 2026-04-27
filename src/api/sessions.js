/**
 * 会话管理 SDK
 *   - 内存里的 thread → agent 路由表
 *   - 持久化的 conversation_messages 表（含访客辅助 + 规则答疑所有消息）
 */
import { api } from './_request'

/**
 * 清理内存中的会话路由（不会删 DB 里的历史，只断开 agent 绑定）。
 * @param {string} threadId
 */
export function clearSession(threadId) {
  return api.delete(`/api/session/${encodeURIComponent(threadId)}`)
}

/**
 * 删除整个 thread 的对话记录（DB 真删）。
 * 删除后右上角的"历史会话"列表会少一项。
 * @param {string} threadId
 */
export function deleteConversation(threadId) {
  return api.delete(`/api/conversations/${encodeURIComponent(threadId)}`)
}
