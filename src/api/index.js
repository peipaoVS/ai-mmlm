/**
 * 接口注册中心（barrel exports）
 *
 * 业务页用法：
 *   import { listTasks, deleteTask, getReport } from '@/api'
 *   import * as VisitApi from '@/api/visitAssistant'   // 命名空间导入
 *
 * 各域 SDK：
 *   - visitAssistant : 访客辅助（流式 + REST）
 *   - ruleQa         : 规则答疑 + 管理员规则答疑
 *   - sessions       : 会话清理 / 删除对话
 *   - reports        : 访前报告 + 访后纪要
 *   - pushMessages   : 定时任务推送通知
 *   - badcases       : Badcase 归因 + 回归 + 修复队列
 *   - observability  : 可观测性 + 合规
 *   - habits         : 用户偏好
 *   - ruleKb         : 规则知识库（读 + 管理员写）
 *   - admin          : 银行产品 / 企业画像 / 行业动态
 *   - auth           : AI 侧登录态 + 健康检查
 *
 * 底层（http）一般不用直接 import：
 *   - api / request / streamRequest 见 `./http.js`
 *   - qs / asBool 见 `./_request.js`
 */
export * as VisitApi from './visitAssistant'
export * as RuleQaApi from './ruleQa'
export * as SessionsApi from './sessions'
export * as ReportsApi from './reports'
export * as PushMessagesApi from './pushMessages'
export * as BadcasesApi from './badcases'
export * as ObservabilityApi from './observability'
export * as HabitsApi from './habits'
export * as RuleKbApi from './ruleKb'
export * as AdminApi from './admin'
export * as AuthApi from './auth'

// 底层工具
export { api, request, streamRequest, qs, asBool } from './_request'
