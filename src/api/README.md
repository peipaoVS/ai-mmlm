# 接口注册中心（API SDK）

后端 70+ 个路由按业务域拆成 11 个 SDK 文件，每个函数都有 JSDoc 注释 + 参数类型 + 使用场景。
调用方不再硬编码 URL，IDE 直接补全。

## 目录

| 文件 | 域 | 路由前缀 | 主要使用方 |
|---|---|---|---|
| `visitAssistant.js` | 访客辅助（流式 + REST） | `/awp/visit-assistant`、`/api/visit-assistant` | `ChatView` |
| `ruleQa.js`         | 规则答疑 / 管理员规则答疑 | `/awp/rule-qa`、`/awp/admin-rule-qa`、`/api/rule-qa`、`/api/admin-rule-qa` | `ChatView` 规则模式 |
| `sessions.js`       | 会话清理 / 删除对话 | `/api/session/{id}`、`/api/conversations/{id}` | 历史侧栏 |
| `reports.js`        | 报告 + 访后纪要 + Todo + 报告任务 | `/api/reports`、`/api/post-visit-summaries`、`/api/todos`、`/api/report-jobs` | 报告页 / 待办面板 |
| `pushMessages.js`   | 定时任务推送通知 | `/api/push-messages` | 顶部小红点 |
| `badcases.js`       | Badcase 归因 / 回归 / 修复队列 | `/api/badcases`、`/api/regression`、`/api/repair-queue` | `LogModuleView` Badcase 子面板 |
| `observability.js`  | 可观测性 + 合规 | `/api/observability/logs`、`/api/moderation/*` | `LogModuleView` 观测/合规子面板 |
| `habits.js`         | 用户偏好 + 自动抽取审计 | `/api/habits` | 偏好面板 |
| `ruleKb.js`         | 规则知识库（读 + 管理员写） | `/api/rule-kb`、`/api/admin-rule-kb` | `LogModuleView` 规则库 / 管理员上传 |
| `admin.js`          | 银行产品 / 企业画像 / 行业动态 | `/api/admin/products`、`/api/admin/enterprises`、`/api/admin/insights` | 管理台 |
| `auth.js`           | AI 侧登录态 + 健康检查 | `/api/auth/*`、`/api/health` | `LoginView` |

> 系统侧 `/api/users` `/api/roles` `/api/posts` `/api/menus` `/api/companies` **不在本 SDK 范围**，
> 它们经 vite 代理打到 192.168.1.37:8017，仍直接 `api.get('/api/users')` 用即可。

## 使用方式

### 推荐：命名空间导入

```js
import { VisitApi, BadcasesApi, PushMessagesApi } from '@/api'

const { tasks } = await VisitApi.listTasks({ status: 'pending', limit: 50 })
await VisitApi.deleteTask(taskId)

const stream = VisitApi.startStream({
  threadId, runId,
  state: { agent: 'visit_assistant_agent', action: 'parse', task_payload: {} },
  messages: [{ id: 'm1', role: 'user', content: '...' }],
})
for await (const evt of stream) { /* ... */ }

const badcases = await BadcasesApi.listBadcases({ status: 'open', limit: 100 })
const unread = await PushMessagesApi.listPushMessages({ unread_only: true, limit: 20 })
```

### 也可以按需具名导入

```js
import { listTasks, reviseTask, deleteTask } from '@/api/visitAssistant'

const tasks = await listTasks({ status: 'pending' })
await reviseTask(taskId, { title: '改个名字', dry_run: false })
```

### 底层（不推荐直接用）

```js
import { api, qs } from '@/api'

await api.get(`/api/whatever${qs({ foo: 'bar' })}`)
```

## 文件互引关系

```
http.js            (底层 fetch + token + SSE + 401 处理)
  ↑
_request.js        (qs / asBool 工具 + re-export http)
  ↑
visitAssistant.js / ruleQa.js / sessions.js / reports.js / pushMessages.js
badcases.js / observability.js / habits.js / ruleKb.js / admin.js / auth.js
  ↑
index.js           (barrel)
```

## 增减接口怎么改

**后端加了一个新路由** `/api/foo/bar`：

1. 在对应业务域文件里加一个函数（带 JSDoc + 参数注释）
2. 不需要改 view 代码（调用方直接 import 即可）
3. 如果路径前缀是新的（如 `/api/xxx`），还要在 `vite.config.js` 加一条 proxy 规则

**后端改了一个路径**：

只改 SDK 文件里那一行 string，所有调用方自动跟随。

## 已知补充

- `frontend/ai-mmlm/src/config/aiApi.js` 里的旧路径常量仍在用（`ChatView` 引用了），暂不删除，
  待 view 全部迁到本 SDK 后再清理。
- `/api/auth/users`、`/api/auth/login` 在 LoginView 里**绕过 SDK**直接用 `${API_CONFIG.MAIN}` 拼接 fetch，
  原因是它需要在登录前没 token 时也能访问。要切到本地后端，改 `src/config/api.js` 的 `MAIN` 即可。
