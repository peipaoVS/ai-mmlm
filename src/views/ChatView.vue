<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api/http'
import { useSession, getToken, getAiToken } from '../stores/session'
// 统一接口注册中心：所有后端调用都通过 SDK，避免硬编码 URL
import { VisitApi, RuleQaApi, ReportsApi, PushMessagesApi } from '../api'
import { API_PATHS } from '../config/aiApi';

const session = useSession()
const loading = ref(false)
const inputValue = ref('')
const conversationTitle = ref('新会话')
const messages = ref([])
const visitTaskPayload  = ref([])
const recentSessions = ref([])
const visitThreadId = ref('')
const ruleThreadId = ref('')
const thread = ref('')

function genThreadId(prefix) {
  const rand = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10)
  return `${prefix}_${Date.now()}_${rand}`
}
function genRunId() {
  return `run_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}
function ensureVisitThreadId() {
  if (!visitThreadId.value) visitThreadId.value = genThreadId('visit')
  return visitThreadId.value
}
function ensureRuleThreadId() {
  if (!ruleThreadId.value) ruleThreadId.value = genThreadId('rule')
  return ruleThreadId.value
}
function resetAgentThreads() {
  visitThreadId.value = ''
  ruleThreadId.value = ''
}
const taskJobs = ref([
  {
    id: 1,
    title: '测试访客提醒任务',
    prepared_at: '0 0/30 * * * ?',
    status: '启用',
    remark: '前端写死的测试数据，后续再切换为真实接口。'
  }
])
// 最近会话接口
async function startFreshConver() {
  loading.value = true
  try {
    const response = await VisitApi.listHistory()
    recentSessions.value = response.messages.filter(item => item.role === 'user')
  } finally {
    loading.value = false
  }
}
// 待办事项接口
async function loadTaskJobs() {
  loading.value = true
  try {
    const response = await VisitApi.listTasks()
    taskJobs.value = response.tasks || []
    console.log('待办事项接口', response)
  } finally {
    loading.value = false
  }
}
const activeSessionId = ref('')
const showAllSessions = ref(false)
const showAllTasks = ref(false)
const modelMenuVisible = ref(false)
const modelMenuRef = ref(null)
const messagePanelRef = ref(null)
const defaultModelLabel = '规则答疑'

const modelOptions = [
  {
    label: defaultModelLabel,
    description: '适合制度、流程、规范类问题'
  },
  {
    label: '访客辅助',
    description: '适合访客接待、咨询与引导场景'
  }
]

const selectedModel = ref(defaultModelLabel)

const promptCards = [
  '我明天上午9:30需要去招商银行北京分行营业部办理一笔大额跨境汇款,请在上午8:45前准备好所有必需的申请材料清单、合规问卷以及预计费用明细。',
  // '明天下午2:00,我约了工商银行支行的客户经理,在其VIP室洽谈企业综合授信方案,请在下午1:15前将我方最新的财务报表、融资需求及核心谈判要点整理成简报。',
  // '我明早10:15要去建设银行总行,参加一个关于数字人民币对公钱包业务的内部研讨会,请在上午9:30前生成一份参会指引,包含会议议程、核心议题和我行关注点。',
  // '明天下午4:45,我需要在线上面试一位应聘我行风险控制岗的候选人,请在下午4:00前准备好该候选人的详细简历分析、结构化面试问题及岗位能力评估表。',
  // '我明天中午1:00要去浦发银行数据中心进行季度性安全检查,请在上午12:00前生成检查清单,重点包含网络安全、机房物理安全及上次整改项的复核。',
  // '明天下午3:30,我需要在农业银行的线上对公服务平台提交年度监管报告,请在下午2:45前完成报告终稿的复核,并生成一份分步提交操作指南。',
  // '我明早8:50要去本地银保监局报送一项创新业务的事后报告,请在今晚8:00前,将报告定稿、监管条文对应索引及可能的问答预案准备完毕。',
  // '明天上午11:00,我与摩根士丹利分析师有关于银行业未来趋势的电话会议,请在上午10:20前准备好业绩亮点、行业对标数据及可讨论方向。',
]

const recentSessionList = computed(() =>
  recentSessions.value.map((item) => ({
    ...item,
    active: item.id === activeSessionId.value
  }))
)

const visibleRecentSessions = computed(() =>
  showAllSessions.value ? recentSessionList.value : recentSessionList.value.slice(0, 3)
)

const visibleTaskJobs = computed(() =>
  showAllTasks.value ? taskJobs.value : taskJobs.value.slice(0, 2)
)

// ---- 访前报告列表（侧栏第三块）----
const reportList = ref([])
const reportLoading = ref(false)
const reportCompanyFilter = ref('')
const showAllReports = ref(false)
const visibleReports = computed(() =>
  showAllReports.value ? reportList.value : reportList.value.slice(0, 2)
)

// ---- 访后纪要列表（侧栏第四块）----
const postSummaryList = ref([])
const postSummaryLoading = ref(false)
const showAllPostSummaries = ref(false)
const visiblePostSummaries = computed(() =>
  showAllPostSummaries.value ? postSummaryList.value : postSummaryList.value.slice(0, 2)
)

// ---- 待办列表（侧栏第五块）----
const todoList = ref([])
const todoLoading = ref(false)
const showAllTodos = ref(false)
const todoCompanyFilter = ref('')
const todoStatusFilter = ref('pending')
const TODO_STATUS_OPTIONS = [
  { value: 'pending', label: '待办' },
  { value: 'done', label: '已完成' },
]
const visibleTodos = computed(() =>
  showAllTodos.value ? todoList.value : todoList.value.slice(0, 3)
)

const selectedModelLabel = computed(() => selectedModel.value || defaultModelLabel)

onMounted(() => {
  startFreshConversation()
  startFreshConver()
  loadTaskJobs()
  loadReports()
  loadPostSummaries()
  loadTodos()
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

async function sendMessage(preset) {
  const content = (preset ?? inputValue.value).trim()
  if (!content || loading.value) {
    return
  }

  let sessionId = activeSessionId.value
  if (!sessionId) {
    const title = content.slice(0, 14) || '新会话'
    const newSession = {
      id: createId(),
      title,
      content: content,
      model: selectedModelLabel.value,
      messages: cloneMessages(messages.value),
      updatedAt: Date.now()
    }

    recentSessions.value = sortSessions([
      newSession,
      ...recentSessions.value.filter((item) => item.id !== newSession.id)
    ])

    activeSessionId.value = newSession.id
    conversationTitle.value = title
    sessionId = newSession.id
  }

  const currentModel = selectedModel.value

  messages.value.push({
    role: 'user',
    content
  })
  await scrollMessagesToBottom()
  syncActiveSession(sessionId)

  inputValue.value = ''
  loading.value = true
  await scrollMessagesToBottom()

  try {
    console.log('sendMessage', session)
    // 先添加一个空的助手消息，用于流式填充
    const assistantMessage = { role: 'assistant', content: '', model: currentModel }
    messages.value.push(assistantMessage)
    if(selectedModel.value === '规则答疑') {
      const stream = RuleQaApi.ruleQaStream({
        threadId: ensureRuleThreadId(),
          runId: genRunId(),
          parentRunId: "",
          variant: 'both',
          state: {
            // branch 取自用户的 AI 身份或分行，不要用岗位名(postNames)，
            // 后端 rule-qa 会按此字段过滤分行规则库。省略将默认按用户权限查询。
            action: "query",
            agent: 'rule_qa_agent',
          },
          messages: [
            { id: "m1", thread_id: thread.value || '', role: "user", content: content }
          ],
          tools: [],
          context: [],
          forwardedProps: {},
          additionalProp1: {}
      })

      let jsonContent = ''
      for await (const eventData of stream) {
        if (eventData.type === 'TEXT_MESSAGE_CONTENT' && eventData.delta) {
          jsonContent += eventData.delta
        }
      }

      // 尝试解析 JSON 并格式化为 Markdown
      try {
        const data = JSON.parse(jsonContent)
        if (data.type === 'rule_qa_response') {
          assistantMessage.content = formatRuleQaResponse(data)
          assistantMessage.rawPayload = data
        } else {
          assistantMessage.content = jsonContent
        }
      } catch (e) {
        // 如果不是 JSON，直接显示原始内容
        assistantMessage.content = jsonContent
      }
    }
    // 访客辅助
    else {
      const stream = VisitApi.startStream({
        threadId: ensureVisitThreadId(),
        runId: genRunId(),
        parentRunId: "",
        variant: 'both',
        state: {
          agent: "visit_assistant_agent",
          action: "parse",
          task_payload: {},
        },
        messages: [{ id: "m1", thread_id: thread.value || '', role: "user", content: content }],
        tools: [],
        context: [],
        forwardedProps: {},
        additionalProp1: {}
      })

      let jsonContent = ''
      for await (const eventData of stream) {
        // 收集 TEXT_MESSAGE_CONTENT 的内容
        if (eventData.type === 'TEXT_MESSAGE_CONTENT' && eventData.delta) {
          jsonContent += eventData.delta
        }
      }

      // 尝试解析 JSON 并格式化为 Markdown
      try {
        const data = JSON.parse(jsonContent)
        visitTaskPayload .value = data
        console.log('访客辅助接口返回的完整数据:', visitTaskPayload.value)
        assistantMessage.content = formatToFriendlyMarkdown(data)
        assistantMessage.rawPayload = data
      } catch (e) {
        // 如果不是 JSON，直接显示原始内容
        assistantMessage.content = jsonContent
      }
    }
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: `请求失败：${error.message}`
    })
    await scrollMessagesToBottom()
  } finally {
    syncActiveSession(sessionId)
    loading.value = false
  }
}

function startFreshConversation() {
  activeSessionId.value = ''
  conversationTitle.value = '新会话'
  selectedModel.value = defaultModelLabel
  modelMenuVisible.value = false
  resetAgentThreads()
  visitTaskPayload.value = []
  messages.value = [
    {
      role: 'assistant',
      content: `你好，${session.user?.nickname || session.user?.username || '管理员'}。我是智能助理，可以帮你处理规则答疑、内容整理和日常工作问题。`
    }
  ]
  inputValue.value = ''
  scrollMessagesToBottom()
}

async function switchSession(item) {
  // 记录切换日志
  console.log('切换会话:', item)
  // 保存当前会话的 thread_id
  thread.value = item.thread_id
  // 调用接口获取会话详情
  const response = await api.get(API_PATHS.SESSION.LIST + "?thread_id=" + item.thread_id)
  console.log('获取会话详情接口返回的数据:', response)

  // item 来自 recentSessions（后端 conversation_messages 一行行的 user 消息），
  // 关键字段是 item.thread_id —— 之前的版本忽略了它，导致：
  //   1) 点进历史会话后并没有把 thread_id 恢复到 visitThreadId/ruleThreadId
  //   2) 用户继续追问时 ensureVisitThreadId() 仍用旧值或新生成一个 UUID
  //   3) 新消息被写到另一个 thread，回到这个历史会话就看不见刚才的追问了
  //
  // 修复：把后端 thread_id 恢复到对应 ref，并按 thread_id 重新拉一次完整时间
  // 线（包含 parse + confirm + detail + regenerate 全部 turn），避免只显示
  // 单条 user 消息。
  // 更新当前会话状态
  activeSessionId.value = item.id
  conversationTitle.value = item.title || item.content || '历史会话'
  let nextModel = item.model || defaultModelLabel
  modelMenuVisible.value = false
  let nextMessages = normalizeConversationMessages(response.messages || [])
  nextModel = inferConversationModel(nextMessages, nextModel)

  // 根据模型类型恢复对应的 thread_id
  const threadId = item.thread_id || item.threadId || ''
  if (threadId) {
    // 根据模型选择对应的 thread 存储
    if (selectedModel.value === '规则答疑') {
      ruleThreadId.value = threadId
    } else {
      visitThreadId.value = threadId
    }
    try {
      // 拉取完整历史消息
      const resp = await VisitApi.listHistory({ thread_id: threadId, limit: 200 })
      const all = Array.isArray(resp?.messages) ? resp.messages : []
      // 后端按 created_at ASC 返回；前端只关心 role + content 字段。
      // assistant 端的 JSON 卡片留给气泡渲染层自己 try-parse。
      messages.value = all.map((m) => ({
        role: m.role,
        content: m.content,
        // 给访客辅助的 assistant JSON 气泡用，触发卡片渲染
        model: m.role === 'assistant' && m.agent_name === 'visit_assistant_agent'
          ? '访客辅助'
          : ''
      }))
      if (all.length) {
        nextMessages = normalizeConversationMessages(all)
        nextModel = inferConversationModel(nextMessages, nextModel)
      }
    } catch (e) {
      // 拉历史失败时退回老逻辑：仅展示当前选中那条
      console.warn('加载完整历史失败：', e)
      messages.value = cloneMessages(item.messages || [{ role: item.role, content: item.content }])
      nextMessages = normalizeConversationMessages(
        item.messages || response.messages || [{ role: item.role, content: item.content, model: item.model || '' }]
      )
      nextModel = inferConversationModel(nextMessages, nextModel)
    }
  } else {
    // 无 thread_id 时仅展示当前消息
    messages.value = cloneMessages(item.messages || [{ role: item.role, content: item.content }])
    nextMessages = normalizeConversationMessages(
      item.messages || response.messages || [{ role: item.role, content: item.content, model: item.model || '' }]
    )
    nextModel = inferConversationModel(nextMessages, nextModel)
  }
  // 滚动到底部
  selectedModel.value = nextModel
  bindThreadToModel(threadId, nextModel)
  syncVisitTaskPayloadFromMessages(nextMessages)
  messages.value = nextMessages
  scrollMessagesToBottom()
}

function syncActiveSession(sessionId) {
  recentSessions.value = sortSessions(
    recentSessions.value.map((item) =>
      item.id === sessionId
        ? {
            ...item,
            model: selectedModelLabel.value,
            preview: getSessionPreview(messages.value),
            messages: cloneMessages(messages.value),
            updatedAt: Date.now()
          }
        : item
    )
  )
}

function getSessionPreview(source) {
  const firstUserMessage = source.find((item) => item.role === 'user')
  return firstUserMessage ? firstUserMessage.content : '新会话'
}

function cloneMessages(source) {
  return source.map((item) => ({
    role: item.role,
    content: item.content,
    ...(item.model ? { model: item.model } : {}),
    ...(item.rawPayload ? { rawPayload: item.rawPayload } : {})
  }))
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function sortSessions(source) {
  return [...source].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

function handleComposerKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function toggleModelMenu() {
  modelMenuVisible.value = !modelMenuVisible.value
}

function selectModel(label) {
  selectedModel.value = label
  if (activeSessionId.value) {
    syncActiveSession(activeSessionId.value)
  }
  modelMenuVisible.value = false
}

function handleDocumentClick(event) {
  if (modelMenuRef.value && !modelMenuRef.value.contains(event.target)) {
    modelMenuVisible.value = false
  }
}

async function scrollMessagesToBottom() {
  await nextTick()

  if (messagePanelRef.value) {
    messagePanelRef.value.scrollTop = messagePanelRef.value.scrollHeight
  }
}

// ---- 待办事项·修改任务弹窗 ----
const taskEditDialog = ref(false)
const taskEditSubmitting = ref(false)
const taskEditingId = ref(null)
const taskEditOriginal = ref(null)
const taskEditForm = ref({
  company_name: '',
  visit_time: '',
  trigger_time: '',
  title: '',
  description: '',
  dry_run: false
})

// ---- 待办事项·修改记录弹窗 ----
const taskRevisionsDialog = ref(false)
const taskRevisionsLoading = ref(false)
const taskRevisionsTaskId = ref(null)
const taskRevisions = ref([])

const TASK_TYPE_LABEL = {
  visit_report: '拜访报告',
  follow_up: '跟进提醒'
}

function taskTypeLabel(type) {
  return TASK_TYPE_LABEL[type] || type || ''
}

// 状态徽章配色：把后端枚举映射到 .task-pill--xxx 样式类
function taskStatusVariant(status) {
  switch (status) {
    case 'ready':
    case 'done':
      return 'task-pill--ok'
    case 'preparing':
      return 'task-pill--info'
    case 'prepare_failed':
    case 'send_failed':
    case 'timeout':
      return 'task-pill--danger'
    case 'cancelled':
      return 'task-pill--muted'
    default:
      return 'task-pill--pending'
  }
}

// 后端 "YYYY-MM-DD HH:MM:SS" → <input type="datetime-local"> 需要的 "YYYY-MM-DDTHH:MM"
function toLocalDatetime(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?/)
  return m ? `${m[1]}T${m[2]}` : ''
}

// datetime-local → 后端规范 "YYYY-MM-DD HH:MM:00"
function fromLocalDatetime(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/)
  if (!m) return s
  return `${m[1]} ${m[2]}:${m[3] || '00'}`
}

function editTask(task) {
  taskEditingId.value = task.id
  taskEditOriginal.value = task
  taskEditForm.value = {
    company_name: task.company_name || '',
    visit_time: toLocalDatetime(task.visit_time),
    trigger_time: toLocalDatetime(task.trigger_time),
    title: task.title || '',
    description: '',
    dry_run: false
  }
  taskEditDialog.value = true
}

function closeTaskEditor() {
  taskEditDialog.value = false
  taskEditingId.value = null
  taskEditOriginal.value = null
}

async function submitTaskEdit() {
  if (!taskEditingId.value) return
  const t = taskEditOriginal.value || {}
  const form = taskEditForm.value
  const desc = (form.description || '').trim()
  const company = (form.company_name || '').trim()
  const title = (form.title || '').trim()
  const visitTime = fromLocalDatetime(form.visit_time)
  const triggerTime = fromLocalDatetime(form.trigger_time)

  // 仅发送真正改变的字段，未填字段保持原值（与 demo.html 一致）
  const body = { dry_run: !!form.dry_run, regenerate_report: true }
  if (desc) body.description = desc
  if (company && company !== (t.company_name || '')) body.company_name = company
  if (visitTime && visitTime !== (t.visit_time || '')) body.visit_time = visitTime
  if (triggerTime && triggerTime !== (t.trigger_time || '')) body.trigger_time = triggerTime
  if (title && title !== (t.title || '')) body.title = title

  if (!desc && !body.company_name && !body.visit_time && !body.trigger_time && !body.title) {
    window.alert('请至少修改一个字段，或填写修改描述。')
    return
  }

  taskEditSubmitting.value = true
  try {
    await VisitApi.reviseTask(taskEditingId.value, body)
    if (form.dry_run) {
      window.alert(`任务 #${taskEditingId.value} 仅预览（dry_run）成功，未真正修改。`)
    } else {
      window.alert(`任务 #${taskEditingId.value} 修改成功，新报告将在后台重新生成。`)
    }
    closeTaskEditor()
    await loadTaskJobs()
  } catch (error) {
    window.alert('修改失败：' + error.message)
  } finally {
    taskEditSubmitting.value = false
  }
}

async function openTaskRevisions(task) {
  taskRevisionsTaskId.value = task.id
  taskRevisionsDialog.value = true
  taskRevisionsLoading.value = true
  taskRevisions.value = []
  try {
    const resp = await VisitApi.listTaskRevisions(task.id, { limit: 50 })
    taskRevisions.value = resp?.logs || []
  } catch (error) {
    window.alert('加载修改记录失败：' + error.message)
  } finally {
    taskRevisionsLoading.value = false
  }
}

function closeTaskRevisions() {
  taskRevisionsDialog.value = false
  taskRevisionsTaskId.value = null
  taskRevisions.value = []
}

/* =================================================================
   访前报告 · 列表 / 详情 / 历史 / 下载 / 改写 / 访后纪要 / 删除
   ================================================================= */

// 报告详情弹窗
const reportDetailDialog = ref(false)
const reportDetailLoading = ref(false)
const reportDetail = ref(null)

// 报告版本历史弹窗
const reportHistoryDialog = ref(false)
const reportHistoryLoading = ref(false)
const reportHistoryReportId = ref(null)
const reportHistoryLogs = ref([])

// 访后纪要上传弹窗
const postVisitDialog = ref(false)
const postVisitSubmitting = ref(false)
const postVisitReportId = ref(null)
const postVisitCompany = ref('')
const postVisitFile = ref(null)
const postVisitSupplement = ref('')

async function loadReports() {
  reportLoading.value = true
  try {
    const params = {}
    const filter = reportCompanyFilter.value.trim()
    if (filter) params.company_name = filter
    // 后端 /api/reports 直接返回数组
    const resp = await ReportsApi.listReports(params)
    reportList.value = Array.isArray(resp) ? resp : (resp?.reports || [])
  } catch (error) {
    reportList.value = []
    window.alert('报告列表加载失败：' + error.message)
  } finally {
    reportLoading.value = false
  }
}

async function openReportDetail(report) {
  reportDetailDialog.value = true
  reportDetailLoading.value = true
  reportDetail.value = null
  reportDetailTab.value = 'cards'
  reportRewriteSupplement.value = ''
  reportRewriteStatus.value = ''
  reportRewriteError.value = ''
  try {
    const resp = await VisitApi.getReport(report.id)
    reportDetail.value = resp || null
  } catch (error) {
    window.alert('报告详情加载失败：' + error.message)
    reportDetailDialog.value = false
  } finally {
    reportDetailLoading.value = false
  }
}

function closeReportDetail() {
  reportDetailDialog.value = false
  reportDetail.value = null
  reportDetailTab.value = 'cards'
  reportRewriteSupplement.value = ''
  reportRewriteStatus.value = ''
  reportRewriteError.value = ''
}

async function openReportHistory(report) {
  reportHistoryReportId.value = report.id
  reportHistoryDialog.value = true
  reportHistoryLoading.value = true
  reportHistoryLogs.value = []
  try {
    const resp = await VisitApi.getReportHistory(report.id, { limit: 50 })
    // 后端返回 { logs: [...] } 或直接数组，统一兜底
    reportHistoryLogs.value = resp?.logs || resp?.history || resp || []
    if (!Array.isArray(reportHistoryLogs.value)) {
      reportHistoryLogs.value = []
    }
  } catch (error) {
    window.alert('版本历史加载失败：' + error.message)
  } finally {
    reportHistoryLoading.value = false
  }
}

function closeReportHistory() {
  reportHistoryDialog.value = false
  reportHistoryReportId.value = null
  reportHistoryLogs.value = []
}

// 下载 .docx：和 exportTask 走相同路径，复用 buildDownloadUrl
async function downloadReportFile(report, variant = 'both') {
  const url = VisitApi.buildDownloadUrl(report.id, {
    variant,
    include_meta: true,
    version: report.version || 0
  })
  try {
    const token = getAiToken() || getToken()
    const resp = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`)
    }
    const blob = await resp.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `report_${report.id}_v${report.version || 1}_${variant}.docx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    window.alert('下载失败：' + error.message)
  }
}

// ---- 报告详情弹窗 · Tab + 改写 ----
const reportDetailTab = ref('cards')       // 'cards' | 'brief' | 'full' | 'json' | 'rewrite'
const reportRewriteSupplement = ref('')
const reportRewriteSubmitting = ref(false)
const reportRewriteStatus = ref('')          // '' | 'loading' | 'error'
const reportRewriteError = ref('')

function useReportForRegenerate(report) {
  // 打开报告详情弹窗并切到「改写」Tab
  if (!reportDetailDialog.value) {
    openReportDetail(report)
  }
  reportDetailTab.value = 'rewrite'
  reportRewriteSupplement.value = ''
  reportRewriteStatus.value = ''
  reportRewriteError.value = ''
}

async function submitReportRewrite() {
  const reportId = reportDetail.value?.report_id || reportDetail.value?.id
  if (!reportId) return
  const supplement = reportRewriteSupplement.value.trim()
  if (!supplement) {
    window.alert('请输入改写要求')
    return
  }
  reportRewriteSubmitting.value = true
  reportRewriteStatus.value = 'loading'
  reportRewriteError.value = ''
  try {
    const stream = VisitApi.startReportRegenerate({
      threadId: ensureVisitThreadId(),
      runId: genRunId(),
      parentRunId: '',
      variant: 'both',
      state: {
        agent: 'visit_assistant_agent',
        action: 'regenerate',
        report_id: reportId,
        supplement: supplement,
        report_variant: 'both',
        task_payload: {},
      },
      messages: [{ id: 'm1', thread_id: thread.value || '', role: 'user', content: supplement }],
      tools: [],
      context: [],
      forwardedProps: {},
      additionalProp1: {},
    })

    let jsonContent = ''
    for await (const evt of stream) {
      if (evt.type === 'TEXT_MESSAGE_CONTENT' && evt.delta) {
        jsonContent += evt.delta
      }
    }

    // 尝试解析返回的 JSON
    let result = null
    try { result = JSON.parse(jsonContent) } catch (_) { /* 非 JSON */ }

    // 后端 _handle_regenerate 返回 {pending: true, message: "改写已在后台进行..."}
    // 如果 result 里有 error 字段，视为失败
    if (result?.error) {
      throw new Error(result.error || result.message || '改写失败')
    }

    reportRewriteStatus.value = ''
    reportRewriteSupplement.value = ''

    // 如果后端返回了新的报告内容（非 pending），直接刷新
    if (result && !result.pending) {
      reportDetail.value = {
        ...reportDetail.value,
        full_report_content: result.full_report_content || reportDetail.value?.full_report_content,
        brief_report_content: result.brief_report_content || reportDetail.value?.brief_report_content,
        report_content: result.report_content || reportDetail.value?.report_content,
        version: result.version || (reportDetail.value?.version || 0) + 1,
      }
      reportDetailTab.value = 'full'
    }

    await loadReports()

    const label = reportDetail.value?.company_name || reportDetail.value?.visit_location || ''
    const hint = result?.pending
      ? `报告 #${reportId}（${label}）改写已在后台进行，稍后请刷新查看新版本。`
      : `报告 #${reportId}（${label}）已改写完成。`
    messages.value.push({ role: 'assistant', content: hint })

    // pending 时提示用户稍后刷新
    if (result?.pending) {
      reportRewriteStatus.value = ''
      window.alert(result.message || '改写已在后台进行，请稍后在报告列表中刷新查看新版本。')
    }
  } catch (error) {
    reportRewriteStatus.value = 'error'
    reportRewriteError.value = error.message || '改写失败'
  } finally {
    reportRewriteSubmitting.value = false
  }
}

// 「访后纪要」：打开上传弹窗（粘贴拜访过程概要 / 可选附件，调后端 LLM 提炼）
function openPostVisitUpload(report) {
  postVisitReportId.value = report.id
  postVisitCompany.value = report.company_name || report.visit_location || ''
  postVisitFile.value = null
  postVisitSupplement.value = ''
  postVisitDialog.value = true
}

function closePostVisitUpload() {
  postVisitDialog.value = false
  postVisitReportId.value = null
  postVisitCompany.value = ''
  postVisitFile.value = null
  postVisitSupplement.value = ''
}

function onPostVisitFileChange(event) {
  const f = event?.target?.files?.[0] || null
  postVisitFile.value = f
}

async function submitPostVisitUpload() {
  if (!postVisitReportId.value) return
  if (!postVisitFile.value) {
    window.alert('请先选择拜访过程概要文件（.docx / .md / .txt）。')
    return
  }
  postVisitSubmitting.value = true
  try {
    await ReportsApi.uploadPostVisitSummary(postVisitReportId.value, postVisitFile.value, {
      supplement: postVisitSupplement.value.trim() || undefined
    })
    window.alert(`报告 #${postVisitReportId.value} 的访后纪要已生成。`)
    closePostVisitUpload()
    await loadPostSummaries()
  } catch (error) {
    window.alert('生成访后纪要失败：' + error.message)
  } finally {
    postVisitSubmitting.value = false
  }
}

async function removeReport(report) {
  const label = `${report.company_name || report.visit_location || ''} #${report.id}`
  if (!window.confirm(`确认删除报告「${label}」？此操作会一并删除所有版本，不可撤销。`)) {
    return
  }
  try {
    await ReportsApi.deleteReport(report.id)
    window.alert('删除成功')
    await loadReports()
  } catch (error) {
    window.alert('删除失败：' + error.message)
  }
}

/* =================================================================
   访后纪要 · 列表 / 展开详情 / 查看报告 / 下载 / 版本历史 / 重新上传 / 删除
   ================================================================= */

// 详情弹窗
const postSummaryDetailDialog = ref(false)
const postSummaryDetailLoading = ref(false)
const postSummaryDetail = ref(null)

// 版本历史弹窗
const postSummaryVersionsDialog = ref(false)
const postSummaryVersionsLoading = ref(false)
const postSummaryVersionsReportId = ref(null)
const postSummaryVersions = ref([])

async function loadPostSummaries() {
  postSummaryLoading.value = true
  try {
    const resp = await ReportsApi.listAllPostVisitSummaries({ limit: 50 })
    postSummaryList.value = Array.isArray(resp) ? resp : (resp?.summaries || [])
  } catch (error) {
    postSummaryList.value = []
    // 静默失败：列表加载失败不打扰用户，只在控制台留痕
    console.warn('访后纪要列表加载失败：', error)
  } finally {
    postSummaryLoading.value = false
  }
}

// ---- 待办列表加载 ----
async function loadTodos() {
  todoLoading.value = true
  try {
    const params = { status: todoStatusFilter.value }
    if (todoCompanyFilter.value.trim()) {
      params.company_name = todoCompanyFilter.value.trim()
    }
    const resp = await ReportsApi.listTodos(params)
    todoList.value = Array.isArray(resp) ? resp : (resp?.items || resp?.todos || [])
  } catch (error) {
    todoList.value = []
    console.warn('待办列表加载失败：', error)
  } finally {
    todoLoading.value = false
  }
}

// 摘要正文截断（长文 120 字内显示，避免卡片过高）
function postSummaryShort(row) {
  const s = String(row?.summary_content || '').trim()
  if (!s) return ''
  return s.length > 120 ? s.slice(0, 120) + '…' : s
}

async function openPostSummaryDetail(row) {
  postSummaryDetailDialog.value = true
  postSummaryDetailLoading.value = true
  postSummaryDetail.value = null
  postSummaryDetailTab.value = 'summary'
  pvRewriteSupplement.value = ''
  pvRewriteStatus.value = ''
  pvRewriteError.value = ''
  try {
    const resp = await ReportsApi.getPostVisitSummary(row.report_id)
    postSummaryDetail.value = resp || null
  } catch (error) {
    window.alert('访后纪要详情加载失败：' + error.message)
    postSummaryDetailDialog.value = false
  } finally {
    postSummaryDetailLoading.value = false
  }
}

function closePostSummaryDetail() {
  postSummaryDetailDialog.value = false
  postSummaryDetail.value = null
  postSummaryDetailTab.value = 'summary'
  pvRewriteSupplement.value = ''
  pvRewriteStatus.value = ''
  pvRewriteError.value = ''
}

// 「查看报告」：复用访前报告详情弹窗；优先用 summary_report_id（生成的 docx 报告），否则原报告
function viewPostSummaryReport(row) {
  const targetId = row.summary_report_id || row.report_id
  if (!targetId) {
    window.alert('该访后纪要没有关联的报告。')
    return
  }
  openReportDetail({ id: targetId })
}

// 「下载 .docx」：复用访前报告下载逻辑
function downloadPostSummary(row) {
  const targetId = row.summary_report_id || row.report_id
  if (!targetId) {
    window.alert('该访后纪要没有可下载的报告文件。')
    return
  }
  downloadReportFile({ id: targetId, version: row.version || 1 }, 'both')
}

async function openPostSummaryVersions(row) {
  postSummaryVersionsReportId.value = row.report_id
  postSummaryVersionsDialog.value = true
  postSummaryVersionsLoading.value = true
  postSummaryVersions.value = []
  try {
    const resp = await ReportsApi.listPostVisitSummaryVersions(row.report_id)
    postSummaryVersions.value = Array.isArray(resp) ? resp : (resp?.versions || [])
  } catch (error) {
    window.alert('版本历史加载失败：' + error.message)
  } finally {
    postSummaryVersionsLoading.value = false
  }
}

function closePostSummaryVersions() {
  postSummaryVersionsDialog.value = false
  postSummaryVersionsReportId.value = null
  postSummaryVersions.value = []
}

// 「重新上传」：复用访前报告上的访后纪要上传弹窗
function reuploadPostSummary(row) {
  openPostVisitUpload({
    id: row.report_id,
    company_name: row.company_name || row.visit_location || ''
  })
}

async function removePostSummary(row) {
  const company = row.company_name || row.visit_location || ''
  if (!window.confirm(`删除「${company}」的访后纪要（原报告 #${row.report_id}）？此操作不可撤销。`)) {
    return
  }
  try {
    await ReportsApi.deletePostVisitSummary(row.report_id)
    window.alert('删除成功')
    await loadPostSummaries()
  } catch (error) {
    window.alert('删除失败：' + error.message)
  }
}

// ---- 访后纪要 · 补充重写 ----
const postSummaryDetailTab = ref('summary')       // 'summary' | 'raw' | 'rewrite'
const pvRewriteSupplement = ref('')
const pvRewriteSubmitting = ref(false)
const pvRewriteStatus = ref('')     // '', 'loading', 'error'
const pvRewriteError = ref('')

async function submitPostVisitRewrite() {
  const reportId = postSummaryDetail.value?.report_id
  if (!reportId) return
  const supplement = pvRewriteSupplement.value.trim()
  if (!supplement) {
    window.alert('请输入补充内容')
    return
  }
  pvRewriteSubmitting.value = true
  pvRewriteStatus.value = 'loading'
  pvRewriteError.value = ''
  try {
    const resp = await ReportsApi.rewritePostVisitSummary(reportId, { supplement })
    // 重写成功后刷新详情 + 列表
    postSummaryDetail.value = {
      ...postSummaryDetail.value,
      summary_content: resp.summary || resp.summary_content || postSummaryDetail.value.summary_content,
      highlights_list: resp.highlights || resp.highlights_list || postSummaryDetail.value.highlights_list,
      todos: resp.todos || postSummaryDetail.value.todos,
      next_visit_time: resp.next_visit_time || postSummaryDetail.value.next_visit_time,
      next_visit_location: resp.next_visit_location || postSummaryDetail.value.next_visit_location,
      raw_text: resp.raw_text || postSummaryDetail.value.raw_text,
      version: resp.version || (postSummaryDetail.value.version || 0) + 1,
    }
    pvRewriteStatus.value = ''
    pvRewriteSupplement.value = ''
    postSummaryDetailTab.value = 'summary'
    await loadPostSummaries()
    messages.value.push({
      role: 'assistant',
      content: `纪要已重写（报告 #${reportId}）`
    })
  } catch (error) {
    pvRewriteStatus.value = 'error'
    pvRewriteError.value = error.message || '重写失败'
  } finally {
    pvRewriteSubmitting.value = false
  }
}

// 报告详情：精简版 / 完整版 / 分节卡片
const reportBriefContent = computed(() => {
  const r = reportDetail.value
  return (r?.brief_report_content || '').trim() || '（暂无精简版）'
})
const reportFullContent = computed(() => {
  const r = reportDetail.value
  return (r?.full_report_content || r?.report_content || '').trim() || '（暂无完整版）'
})
const reportSections = computed(() => {
  const r = reportDetail.value
  return Array.isArray(r?.sections) ? r.sections : []
})
const reportStructuredJson = computed(() => {
  const r = reportDetail.value
  if (!r) return '{}'
  const pl = r.payload || {}
  return JSON.stringify({
    report_id: r.report_id || r.id,
    version: r.version,
    visit_time: pl.visit_time || r.visit_time || '',
    visit_location: pl.visit_location || r.visit_location || '',
    person: pl.person || r.person || '',
    report_send_time: pl.report_send_time || r.report_send_time || '',
    remark: pl.remark || r.remark || '',
    created_at: r.created_at || '',
    updated_at: r.updated_at || '',
    payload: pl,
  }, null, 2)
})

function copyReportText(key) {
  const text = key === 'brief' ? reportBriefContent.value : reportFullContent.value
  if (!text) return
  navigator.clipboard?.writeText(text).then(
    () => window.alert(`已复制${key === 'brief' ? '精简版' : '完整版'}到剪贴板`),
    () => window.alert('复制失败')
  )
}
// 点击待办任务卡片时，查询并显示该任务对应的访前报告内容。
// 注意：task.id 是 scheduled_tasks.id，而报告接口需要的是 report_id，
// 两者不同；应该优先用 task.prepared_report_id。
async function viewTaskReport(task) {
  const reportId = task.prepared_report_id || task.report_id || task.id
  if (!reportId) {
    window.alert('该任务尚未生成报告。')
    return
  }
  const assistantMessage = { role: 'assistant', content: '正在查询报告...', model: '' }
  messages.value.push(assistantMessage)
  await scrollMessagesToBottom()

  try {
    const response = await VisitApi.getReport(reportId)
    console.log('查询报告接口返回的数据：', response)
    const data = response || {}
    const index = messages.value.indexOf(assistantMessage)
    if (index !== -1) {
      messages.value[index] = { ...assistantMessage, content: formatToFriendlyMarkdown(data) }
    }
  } catch (error) {
    const index = messages.value.indexOf(assistantMessage)
    if (index !== -1) {
      messages.value[index] = { ...assistantMessage, content: '报告查询失败：' + error.message }
    }
  }
  await scrollMessagesToBottom()
}

async function deleteTask(task) {
  if (!window.confirm(`删除任务 #${task.id}「${task.title || task.company_name || ''}」？此操作不可撤销。`)) {
    return
  }
  try {
    await VisitApi.deleteTask(task.id)
    window.alert('删除成功')
    loadTaskJobs()
  } catch (error) {
    window.alert('删除失败：' + error.message)
  }
}

function importTask() {
  window.alert('导入功能占位')
}

async function exportTask(task) {
  console.log('导出功能：', task.title)
  // 下载需要手动带 Bearer（取 Word/blob，不能走 api.get 的 JSON parse）
  const downloadUrl = VisitApi.buildDownloadUrl(task.id, { variant: 'full', include_meta: true, version: 1 })
  const token = getAiToken() || getToken()
  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = task.title + '.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败: ' + error.message);
  }
}
function getTaskStatusText(status) {
  const statusMap = {
    'pending': '待处理',
    'ready': '就绪',
    'timeout': '超时',
    'preparing': '准备中',
    'prepare_failed': '报告生成失败',
    'done': '已推送',
    'send_failed': '推送失败',
    'cancelled': '已取消',
  }
  return statusMap[status] || status || '未知'
}

function formatRuleQaResponse(data) {
  let md = ''
  // 标题
  if (data.title) {
    md += `### ${data.title}\n\n`
  }
  // 答案正文
  if (data.answer_text) {
    md += `${data.answer_text}\n\n`
  }
  // 分段显示
  if (data.sections && data.sections.length > 0) {
    data.sections.forEach((section, index) => {
      md += `**${section.title || `部分 ${index + 1}`}**\n`
      if (section.body) {
        md += `${section.body}\n`
      }
      if (section.bullets && section.bullets.length > 0) {
        section.bullets.forEach(bullet => {
          md += `- ${bullet}\n`
        })
      }
      md += '\n'
    })
  }
  // 推理步骤
  if (data.reasoning_steps && data.reasoning_steps.length > 0) {
    md += '**推理过程**\n'
    data.reasoning_steps.forEach((step, index) => {
      md += `${index + 1}. **${step.title}**\n`
      if (step.body) {
        md += `   ${step.body}\n`
      }
      if (step.chips && step.chips.length > 0) {
        md += `   标签: ${step.chips.join(', ')}\n`
      }
    })
    md += '\n'
  }
  return md || data.raw_final_answer || '暂无答案'
}
function formatToFriendlyMarkdown(data) {
  // 如果有 report_content 或 full_report_content，直接返回 Markdown 内容
  if (data.report_content) {
    return data.report_content
  }
  if (data.full_report_content) {
    return data.full_report_content
  }
  if (data.brief_report_content) {
    return data.brief_report_content
  }
  
  let md = '拜访安排详情\n\n'
  
  // 基础字段映射
  const fieldMap = {
    action: '操作',
    report_id: '报告ID',
    version: '版本',
    visit_time: '拜访时间',
    visit_location: '拜访地点',
    person: '拜访人',
    report_send_time: '报告提交时间',
    remark: '备注',
    report_title: '报告标题',
    updated_at: '更新时间',
    created_at: '创建时间',
    generation_status: '生成状态',
    pending: '待处理',
  }
  
  // 基础字段
  const baseFields = ['action', 'report_id', 'version', 'visit_time', 'visit_location', 'person', 'report_send_time', 'remark', 'created_at', 'updated_at']
  baseFields.forEach(key => {
    if (data[key] !== undefined) {
      md += `**${fieldMap[key] || key}**: ${data[key]}\n`
    }
  })
  
  // 处理 generation_status
  if (data.generation_status) {
    const statusMap = { preparing: '准备中', generating: '生成中', completed: '已完成', failed: '失败' }
    md += `**生成状态**: ${statusMap[data.generation_status] || data.generation_status}\n`
  }
  
  // 处理 sections
  if (data.sections && data.sections.length > 0) {
    md += '\n**报告详情**\n'
    data.sections.forEach((section, index) => {
      md += `\n##### ${section.numeral || index + 1}. ${section.title || section.heading}\n`
      if (section.body) {
        md += `${section.body}\n`
      }
      if (section.bullets && section.bullets.length > 0) {
        section.bullets.forEach(bullet => {
          md += `- ${bullet}\n`
        })
      }
    })
  }
  
  // 处理 brief_sections
  if (data.brief_sections && data.brief_sections.length > 0) {
    md += '\n**简略报告**\n'
    data.brief_sections.forEach((section, index) => {
      md += `\n##### ${section.numeral || index + 1}. ${section.title || section.heading}\n`
      if (section.body) {
        md += `${section.body}\n`
      }
      if (section.bullets && section.bullets.length > 0) {
        section.bullets.forEach(bullet => {
          md += `- ${bullet}\n`
        })
      }
    })
  }
  
  return md
}

// 确认拜访安排
function tryParseAssistantPayload(content) {
  if (typeof content !== 'string') {
    return null
  }

  const trimmed = content.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function isRuleQaPayload(data) {
  return !!data
    && typeof data === 'object'
    && !Array.isArray(data)
    && (
      data.type === 'rule_qa_response'
      || typeof data.answer_text === 'string'
      || Array.isArray(data.reasoning_steps)
      || typeof data.raw_final_answer === 'string'
    )
}

function isVisitAssistantPayload(data) {
  return !!data
    && typeof data === 'object'
    && !Array.isArray(data)
    && (
      typeof data.report_content === 'string'
      || typeof data.full_report_content === 'string'
      || typeof data.brief_report_content === 'string'
      || Array.isArray(data.brief_sections)
      || (Array.isArray(data.sections) && !isRuleQaPayload(data))
      || [
        'action',
        'report_id',
        'report_title',
        'visit_time',
        'visit_location',
        'person',
        'report_send_time',
        'remark',
        'generation_status',
        'pending'
      ].some((key) => data[key] !== undefined)
    )
}

function shouldShowVisitActions(data) {
  return isVisitAssistantPayload(data)
    && !data.report_content
    && !data.full_report_content
    && !data.brief_report_content
}

function formatConversationMessage(message) {
  const normalized = {
    role: message?.role || '',
    content: typeof message?.content === 'string' ? message.content : String(message?.content ?? ''),
    ...(message?.model ? { model: message.model } : {})
  }

  if (normalized.role !== 'assistant') {
    return normalized
  }

  const payload = tryParseAssistantPayload(normalized.content)
  if (!payload) {
    return normalized
  }

  if (message?.agent_name === 'visit_assistant_agent' || isVisitAssistantPayload(payload)) {
    return {
      ...normalized,
      content: formatToFriendlyMarkdown(payload),
      model: shouldShowVisitActions(payload) ? modelOptions[1].label : (normalized.model || ''),
      rawPayload: payload
    }
  }

  if (message?.agent_name === 'rule_qa_agent' || isRuleQaPayload(payload)) {
    return {
      ...normalized,
      content: formatRuleQaResponse(payload),
      model: normalized.model || defaultModelLabel,
      rawPayload: payload
    }
  }

  return normalized
}

function normalizeConversationMessages(source) {
  if (!Array.isArray(source)) {
    return []
  }

  return source.map((item) => formatConversationMessage(item))
}

function inferConversationModel(source, fallbackModel = '') {
  if (source.some((item) => item?.role === 'assistant' && item?.model === modelOptions[1].label)) {
    return modelOptions[1].label
  }

  if (source.some((item) => item?.role === 'assistant' && item?.model === defaultModelLabel)) {
    return defaultModelLabel
  }

  return fallbackModel || defaultModelLabel
}

function bindThreadToModel(threadId, modelLabel) {
  if (!threadId) {
    return
  }

  if (modelLabel === modelOptions[1].label) {
    visitThreadId.value = threadId
    ruleThreadId.value = ''
    return
  }

  ruleThreadId.value = threadId
  visitThreadId.value = ''
}

function syncVisitTaskPayloadFromMessages(source) {
  const latestVisitMessage = [...source]
    .reverse()
    .find((item) => item?.model === modelOptions[1].label && item?.rawPayload)

  visitTaskPayload.value = latestVisitMessage?.rawPayload || []
}

async function handleConfirm(message) {
  loading.value = true
  const assistantMessage = { role: 'assistant', content: '', model: '' }
  messages.value.push(assistantMessage)
  const taskPayload = message?.rawPayload || visitTaskPayload.value || {}
  visitTaskPayload.value = taskPayload
  console.log('确认拜访安排:', message)
  const stream = VisitApi.startStream({
    threadId: ensureVisitThreadId(),
    runId: genRunId(),
    parentRunId: "",
    state: { 
      agent: "visit_assistant_agent",
      action: "confirm",
      task_payload: taskPayload,
      report_variant: 'full',
    },
    messages: [{ id: "m1", role: "user", content: '确认' }],
    tools: [],
    context: [],
    forwardedProps: {},
    additionalProp1: {}
  })
  // 后端 confirm 可能发 1~2 条独立 text message（JSON 主报告 + 可选的定时任务警告），
  // 必须按 messageId 分组，否则拼起来 JSON.parse 会失败。
  const messageBuckets = new Map() // messageId -> delta 累积字符串
  const messageOrder = []          // 保留到达顺序
  for await (const eventData of stream) {
    if (eventData.type === 'TEXT_MESSAGE_CONTENT' && eventData.delta) {
      const mid = eventData.messageId || '__default__'
      if (!messageBuckets.has(mid)) {
        messageBuckets.set(mid, '')
        messageOrder.push(mid)
      }
      messageBuckets.set(mid, messageBuckets.get(mid) + eventData.delta)
    }
  }

  // 第一条 = 主报告 JSON；后续（如存在）= 定时任务警告或其他附加消息
  const [mainId, ...extraIds] = messageOrder
  const mainContent = mainId ? messageBuckets.get(mainId) : ''
  try {
    const data = JSON.parse(mainContent)
    assistantMessage.content = formatToFriendlyMarkdown(data)
    assistantMessage.rawPayload = data
  } catch (e) {
    assistantMessage.content = mainContent
  }

  // 把额外消息（警告）作为独立气泡追加显示，方便用户看到"为什么没生成定时任务"
  for (const extraId of extraIds) {
    const warnText = messageBuckets.get(extraId)
    if (warnText && warnText.trim()) {
      messages.value.push({ role: 'assistant', content: warnText, model: '' })
    }
  }

  loadTaskJobs()
  loading.value = false
  await scrollMessagesToBottom()
}
// 取消拜访安排
async function handleCancel(message) {
  // TODO: 调用取消接口或删除消息
  console.log('取消拜访安排:', message)
  // window.alert('取消功能待实现')
}

/* ==================== 推送消息轮询 (push polling) ==================== */
const PUSH_POLL_MS = 5000
const PUSH_SEEN_KEY = 'aibank_push_seen'
const pushQueue = ref([])
const pushActiveMsg = ref(null)
const pushShownIds = ref(new Set(JSON.parse(localStorage.getItem(PUSH_SEEN_KEY) || '[]')))
let pushPollTimer = null

function persistPushSeen() {
  try {
    localStorage.setItem(PUSH_SEEN_KEY, JSON.stringify([...pushShownIds.value].slice(-200)))
  } catch {}
}

const pushBadgeCount = computed(() => pushQueue.value.length)

async function pollPushMessages() {
  if (!session.token) return
  try {
    const rows = await PushMessagesApi.listPushMessages({ unread_only: true, limit: 20 })
    const list = Array.isArray(rows) ? rows : []
    const fresh = list.filter(m => !pushShownIds.value.has(m.id)).reverse()
    if (!fresh.length) return
    pushQueue.value.push(...fresh)
    if (!pushActiveMsg.value) showNextPushToast()
  } catch { /* 轮询失败静默 */ }
}

function showNextPushToast() {
  closePushToast(false)
  const msg = pushQueue.value.shift()
  if (!msg) return
  pushActiveMsg.value = msg
  pushShownIds.value.add(msg.id)
  persistPushSeen()
}

function closePushToast(requeue) {
  if (requeue && pushActiveMsg.value) {
    pushQueue.value.unshift(pushActiveMsg.value)
  }
  pushActiveMsg.value = null
}

async function acknowledgePush(id) {
  try { await PushMessagesApi.markPushMessageRead(id) } catch {}
  pushActiveMsg.value = null
  if (pushQueue.value.length) showNextPushToast()
}

async function markAllPushRead() {
  try { await PushMessagesApi.markAllPushMessagesRead() } catch (e) {
    console.warn('一键已读失败', e)
    return
  }
  if (pushActiveMsg.value) pushShownIds.value.add(pushActiveMsg.value.id)
  pushQueue.value.forEach(m => pushShownIds.value.add(m.id))
  persistPushSeen()
  pushQueue.value = []
  pushActiveMsg.value = null
}

function startPushPolling() {
  if (pushPollTimer) clearInterval(pushPollTimer)
  pollPushMessages()
  pushPollTimer = setInterval(pollPushMessages, PUSH_POLL_MS)
}

function stopPushPolling() {
  if (pushPollTimer) { clearInterval(pushPollTimer); pushPollTimer = null }
}

/* ==================== 报告生成进度轮询 (gen polling) ==================== */
const GEN_POLL_MS = 3000
const genJobs = ref([])
const genDismissed = ref(new Set())
let genPollTimer = null

async function pollReportJobs() {
  if (!session.token) return
  try {
    const resp = await ReportsApi.listReportJobs()
    const jobs = (resp.jobs || []).filter(j => !genDismissed.value.has(j.report_id))
    genJobs.value = jobs
    // 有新完成的任务 → 自动刷新报告列表
    if (jobs.some(j => j.status === 'done')) loadReports()
  } catch { /* 静默 */ }
}

function dismissGenJob(reportId) {
  genDismissed.value.add(reportId)
  genJobs.value = genJobs.value.filter(j => j.report_id !== reportId)
}

function startGenPolling() {
  if (genPollTimer) clearInterval(genPollTimer)
  pollReportJobs()
  genPollTimer = setInterval(pollReportJobs, GEN_POLL_MS)
}

function stopGenPolling() {
  if (genPollTimer) { clearInterval(genPollTimer); genPollTimer = null }
}

// 挂载 / 卸载轮询
onMounted(() => {
  startPushPolling()
  startGenPolling()
})
onBeforeUnmount(() => {
  stopPushPolling()
  stopGenPolling()
})
</script>

<template>
  <div class="chat-layout">
    <aside class="chat-sidebar glass-card">
      <button class="pill-button new-chat-button" @click="startFreshConversation">
        + 新建对话
      </button>

      <!-- ============ 报告生成进度 ============ -->
      <section v-if="genJobs.length" class="side-section gen-section">
        <div class="section-head">
          <div class="section-head-main">
            <span class="side-label">生成进度</span>
          </div>
        </div>
        <div class="gen-list">
          <div
            v-for="job in genJobs"
            :key="job.report_id"
            class="gen-card"
            :class="{
              done: job.status === 'done',
              error: job.status === 'error'
            }"
          >
            <div class="gen-icon">
              <span v-if="job.status === 'done'">✅</span>
              <span v-else-if="job.status === 'error'">❌</span>
              <div v-else class="gen-spinner"></div>
            </div>
            <div class="gen-info">
              <div class="gen-title">#{{ job.report_id }} {{ job.company || '' }}</div>
              <div class="gen-meta">
                {{ job.action || '' }}
                {{ job.status === 'running' ? ' 进行中' : job.status === 'done' ? ' 已完成' : job.status === 'error' ? ' 失败' : '' }}
                · {{ job.elapsed != null ? `${job.elapsed}s` : '...' }}
              </div>
            </div>
            <button
              v-if="job.status !== 'running'"
              class="gen-dismiss"
              @click="dismissGenJob(job.report_id)"
            >关闭</button>
          </div>
        </div>
      </section>

      <section class="side-section">
        <div class="section-head">
          <div class="section-head-main">
            <span class="side-label">最近会话</span>
          </div>
          <button
            v-if="recentSessionList.length > 3"
            type="button"
            class="toggle-button"
            @click="showAllSessions = !showAllSessions"
          >
            {{ showAllSessions ? '收起' : '打开' }}
          </button>
        </div>

        <div v-if="recentSessionList.length" class="topic-list">
          <button
            v-for="item in visibleRecentSessions"
            :key="item.id"
            class="topic-chip"
            :class="{ active: item.active }"
            @click="switchSession(item)"
          >
            <div class="topic-title-row">
              <strong :title="item.content">{{ item.content }}</strong>
              <span v-if="item.active" class="active-badge">当前</span>
            </div>
          </button>
        </div>

        <div v-else class="topic-empty">
          开始提问后，这里会显示最近会话；当前会话会高亮显示。
        </div>
      </section>

      <section class="side-section">
        <div class="section-head">
          <div class="section-head-main">
            <span class="side-label">待办事项</span>
            <button type="button" class="head-action-button" @click="importTask">
              导入
            </button>
          </div>
          <button
            type="button"
            class="toggle-button"
            @click="showAllTasks = !showAllTasks"
          >
            {{ showAllTasks ? '收起' : `展开${taskJobs.length ? `（${taskJobs.length}）` : ''}` }}
          </button>
        </div>

        <div v-if="showAllTasks && taskJobs.length" class="task-list">
          <article v-for="task in visibleTaskJobs" :key="task.id" class="task-card">
            <div class="task-card-body">
              <!-- 顶部 pill 行：状态 + 类型 + #ID + 标题 -->
              <div class="task-head">
                <span class="task-pill" :class="taskStatusVariant(task.status)">
                  {{ getTaskStatusText(task.status) }}
                </span>
                <span v-if="task.task_type" class="task-pill task-pill--type">
                  {{ taskTypeLabel(task.task_type) }}
                </span>
                <strong class="task-title">
                  <span class="task-id">#{{ task.id }}</span>
                  {{ task.title || task.company_name || '未命名任务' }}
                </strong>
              </div>

              <!-- 元信息：公司 / 拜访时间 / 触发时间 / 报告编号 -->
              <div class="task-meta-grid">
                <span v-if="task.company_name">
                  <em>公司：</em>{{ task.company_name }}
                </span>
                <span v-if="task.visit_time">
                  <em>拜访：</em>{{ task.visit_time }}
                </span>
                <span v-if="task.trigger_time">
                  <em>触发：</em>{{ task.trigger_time }}
                </span>
                <span v-if="task.prepared_report_id">
                  <em>报告编号：</em>{{ task.prepared_report_id }}
                </span>
                <span v-if="task.last_error" class="task-meta-error">
                  <em>错误：</em>{{ task.last_error }}
                </span>
              </div>

              <!-- 操作按钮：查看报告 / 修改 / 删除 / 修改记录 / 导出 -->
              <div class="task-actions">
                <button type="button" class="tiny-button primary" @click.stop="viewTaskReport(task)">
                  查看报告
                </button>
                <button type="button" class="tiny-button warn" @click.stop="editTask(task)">
                  修改
                </button>
                <button type="button" class="tiny-button danger" @click.stop="deleteTask(task)">
                  删除
                </button>
                <button type="button" class="tiny-button" @click.stop="openTaskRevisions(task)">
                  修改记录
                </button>
                <button type="button" class="tiny-button" @click.stop="exportTask(task)">
                  导出
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-else-if="showAllTasks" class="topic-empty">暂无定时任务。</div>
      </section>

      <!-- ============ 访前报告列表 ============ -->
      <section class="side-section">
        <div class="section-head">
          <div class="section-head-main">
            <span class="side-label">访前报告</span>
            <button type="button" class="head-action-button" @click="loadReports" :disabled="reportLoading">
              {{ reportLoading ? '加载中...' : '刷新' }}
            </button>
          </div>
          <button
            type="button"
            class="toggle-button"
            @click="showAllReports = !showAllReports"
          >
            {{ showAllReports ? '收起' : `展开${reportList.length ? `（${reportList.length}）` : ''}` }}
          </button>
        </div>

        <div v-if="showAllReports" class="report-filter-row">
          <input
            v-model="reportCompanyFilter"
            type="text"
            placeholder="按客户名过滤..."
            @keyup.enter="loadReports"
          />
        </div>

        <div v-if="showAllReports && reportList.length" class="task-list">
          <article v-for="report in visibleReports" :key="report.id" class="task-card">
            <div class="task-card-body">
              <div class="task-head">
                <strong class="task-title">
                  <span class="task-id">#{{ report.id }}</span>
                  {{ report.company_name || report.visit_location || '未命名报告' }}
                </strong>
                <span class="task-pill task-pill--type">v{{ report.version || 1 }}</span>
              </div>

              <div class="task-meta-grid">
                <span v-if="report.visit_time"><em>拜访：</em>{{ report.visit_time }}</span>
                <span v-if="report.report_send_time"><em>推送：</em>{{ report.report_send_time }}</span>
                <span v-if="report.updated_at"><em>更新：</em>{{ report.updated_at }}</span>
              </div>

              <div class="task-actions">
                <button type="button" class="tiny-button primary" @click.stop="openReportDetail(report)">
                  详情
                </button>
                <button type="button" class="tiny-button" @click.stop="openReportHistory(report)">
                  历史
                </button>
                <button type="button" class="tiny-button" @click.stop="downloadReportFile(report, 'both')">
                  下载
                </button>
                <button type="button" class="tiny-button warn" @click.stop="useReportForRegenerate(report)">
                  改写
                </button>
                <button type="button" class="tiny-button" @click.stop="openPostVisitUpload(report)">
                  访后纪要
                </button>
                <button type="button" class="tiny-button danger" @click.stop="removeReport(report)">
                  删除
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-else-if="showAllReports" class="topic-empty">
          {{ reportLoading ? '加载中...' : '暂无报告。生成的访前报告会出现在这里。' }}
        </div>
      </section>

      <!-- ============ 访后纪要列表 ============ -->
      <section class="side-section">
        <div class="section-head">
          <div class="section-head-main">
            <span class="side-label">访后纪要</span>
            <button
              type="button"
              class="head-action-button"
              :disabled="postSummaryLoading"
              @click="loadPostSummaries"
            >
              {{ postSummaryLoading ? '加载中...' : '刷新' }}
            </button>
          </div>
          <button
            type="button"
            class="toggle-button"
            @click="showAllPostSummaries = !showAllPostSummaries"
          >
            {{
              showAllPostSummaries
                ? '收起'
                : `展开${postSummaryList.length ? `（${postSummaryList.length}）` : ''}`
            }}
          </button>
        </div>

        <div v-if="showAllPostSummaries && postSummaryList.length" class="task-list">
          <article
            v-for="row in visiblePostSummaries"
            :key="row.report_id || row.id"
            class="task-card"
          >
            <div class="task-card-body">
              <div class="task-head">
                <strong class="task-title">
                  📋 {{ row.company_name || row.visit_location || '-' }}
                </strong>
                <span class="task-pill task-pill--muted">原报告 #{{ row.report_id }}</span>
                <span class="task-pill task-pill--type">v{{ row.version || 1 }}</span>
              </div>

              <div class="task-meta-grid">
                <span v-if="row.visit_time"><em>拜访：</em>{{ row.visit_time }}</span>
                <span v-if="row.created_at"><em>生成：</em>{{ row.created_at }}</span>
              </div>

              <p v-if="postSummaryShort(row)" class="post-summary-snippet">
                {{ postSummaryShort(row) }}
              </p>

              <div v-if="row.highlights_list && row.highlights_list.length" class="post-summary-block">
                <strong>关键要点</strong>
                <ul>
                  <li v-for="(h, i) in row.highlights_list.slice(0, 3)" :key="i">{{ h }}</li>
                </ul>
              </div>

              <div v-if="row.todos && row.todos.length" class="post-summary-block">
                <strong>跟进待办</strong>
                <ol>
                  <li v-for="(t, i) in row.todos.slice(0, 3)" :key="i">{{ t }}</li>
                </ol>
              </div>

              <p v-if="row.next_visit_time" class="post-summary-next">
                📅 下次会面：{{ row.next_visit_time }}
                <span v-if="row.next_visit_location"> · {{ row.next_visit_location }}</span>
              </p>

              <div class="task-actions">
                <button type="button" class="tiny-button primary" @click.stop="openPostSummaryDetail(row)">
                  展开详情
                </button>
                <button type="button" class="tiny-button" @click.stop="viewPostSummaryReport(row)">
                  查看报告
                </button>
                <button type="button" class="tiny-button" @click.stop="downloadPostSummary(row)">
                  下载 .docx
                </button>
                <button type="button" class="tiny-button" @click.stop="openPostSummaryVersions(row)">
                  版本历史
                </button>
                <button type="button" class="tiny-button warn" @click.stop="reuploadPostSummary(row)">
                  重新上传
                </button>
                <button type="button" class="tiny-button danger" @click.stop="removePostSummary(row)">
                  删除
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-else-if="showAllPostSummaries" class="topic-empty">
          {{
            postSummaryLoading
              ? '加载中...'
              : '暂无访后纪要。在「访前报告」中点击「访后纪要」即可上传拜访概要并自动生成。'
          }}
        </div>
      </section>

      <!-- ============ 待办列表 ============ -->
      <section class="side-section">
        <div class="section-head">
          <div class="section-head-main">
            <span class="side-label">待办</span>
            <button
              type="button"
              class="head-action-button"
              :disabled="todoLoading"
              @click="loadTodos"
            >
              {{ todoLoading ? '加载中...' : '刷新' }}
            </button>
          </div>
          <button
            type="button"
            class="toggle-button"
            @click="showAllTodos = !showAllTodos"
          >
            {{
              showAllTodos
                ? '收起'
                : `展开${todoList.length ? `（${todoList.length}）` : ''}`
            }}
          </button>
        </div>

        <div v-if="showAllTodos" class="todo-filter-row">
          <input
            v-model="todoCompanyFilter"
            type="text"
            placeholder="按公司过滤（可选）"
            @keyup.enter="loadTodos"
          />
          <select v-model="todoStatusFilter" class="todo-status-select" @change="loadTodos">
            <option v-for="opt in TODO_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div v-if="showAllTodos && todoList.length" class="task-list">
          <article v-for="row in visibleTodos" :key="row.id" class="task-card">
            <div class="task-card-body">
              <div class="task-head">
                <strong class="task-title">
                  <span class="task-id">#{{ row.id }}</span>
                  {{ row.content || row.title || '' }}
                </strong>
              </div>
              <div class="task-meta-grid">
                <span v-if="row.company_name"><em>公司：</em>{{ row.company_name }}</span>
                <span><em>状态：</em>{{ row.status || '' }}</span>
                <span v-if="row.created_at">{{ row.created_at }}</span>
              </div>
            </div>
          </article>
        </div>

        <div v-else-if="showAllTodos" class="topic-empty">
          {{ todoLoading ? '加载中...' : '无待办' }}
        </div>
      </section>
    </aside>

    <section class="chat-main glass-card">
      <div class="chat-hero">
        <div>
          <span class="hero-label">{{ selectedModelLabel }}</span>
          <h4>今天想让模型帮你完成什么？</h4>
        </div>

        <div class="prompt-grid">
          <button
            v-for="item in promptCards"
            :key="item"
            class="prompt-card"
            @click="sendMessage(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div ref="messagePanelRef" class="message-panel">
        <article
          v-for="(item, index) in messages"
          :key="index"
          class="message-item"
          :class="item.role"
        >
          <div class="message-avatar">
            {{ item.role === 'assistant' ? 'AI' : '我' }}
          </div>
          <div class="message-bubble">
            <span class="message-role">
              {{ item.role === 'assistant' ? '智能助理' : session.user?.nickname || '当前用户' }}
            </span>
            <p>{{ item.content }}</p>
            <div v-if="item.role === 'assistant' && item.model === '访客辅助'" style="margin-top: 12px;">
              <button
                style="padding:6px 16px; background:#1677ff; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:12px;"
                @click="handleConfirm(item)"
              >确认</button>
              <button
                style="padding:6px 16px; margin-left:10px; border:1px solid #e5e6eb; border-radius:8px; background:#fff; cursor:pointer; font-size:12px;"
                @click="handleCancel(item)"
              >取消</button>
            </div>
          </div>
        </article>

        <article v-if="loading" class="message-item assistant">
          <div class="message-avatar">AI</div>
          <div class="message-bubble">
            <span class="message-role">智能助理</span>
            <p>正在整理回复...</p>
          </div>
        </article>
      </div>

      <form class="composer glass-card" @submit.prevent="sendMessage()">
        <textarea
          v-model="inputValue"
          placeholder="输入你的问题，尽量补充背景、目标和限制条件。"
          @keydown="handleComposerKeydown"
        />

        <div class="composer-actions">
          <div class="composer-left">
            <div ref="modelMenuRef" class="model-picker-wrap">
              <button type="button" class="model-trigger" @click="toggleModelMenu">
                <span class="model-trigger-label">选择模型</span>
                <strong>{{ selectedModel }}</strong>
                <span class="model-trigger-arrow" :class="{ open: modelMenuVisible }">⌄</span>
              </button>

              <div v-if="modelMenuVisible" class="model-menu">
                <button
                  v-for="item in modelOptions"
                  :key="item.label"
                  type="button"
                  class="model-option"
                  :class="{ active: selectedModel === item.label }"
                  @click="selectModel(item.label)"
                >
                  <div class="model-option-copy">
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.description }}</span>
                  </div>
                  <em v-if="selectedModel === item.label">当前</em>
                </button>
              </div>
            </div>

            <span>按 `Enter` 发送，`Shift + Enter` 换行</span>
          </div>

          <button class="pill-button" :disabled="loading">
            {{ loading ? '生成中...' : '发送问题' }}
          </button>
        </div>
      </form>
    </section>

    <!-- ========== 修改任务弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="taskEditDialog"
        class="task-modal-mask"
        @click.self="closeTaskEditor"
      >
        <div class="task-modal glass-card">
          <header class="task-modal-head">
            <h3>修改任务 <span class="task-id">#{{ taskEditingId }}</span></h3>
            <button type="button" class="tiny-button" @click="closeTaskEditor">关闭</button>
          </header>

          <div class="task-modal-body">
            <label class="task-field">
              <span>公司名称</span>
              <input v-model="taskEditForm.company_name" type="text" />
            </label>
            <label class="task-field">
              <span>标题</span>
              <input v-model="taskEditForm.title" type="text" />
            </label>
            <label class="task-field">
              <span>拜访时间 (visit_time)</span>
              <input v-model="taskEditForm.visit_time" type="datetime-local" step="60" />
            </label>
            <label class="task-field">
              <span>推送时间 (trigger_time，须早于拜访时间)</span>
              <input v-model="taskEditForm.trigger_time" type="datetime-local" step="60" />
            </label>
            <label class="task-field full">
              <span>修改描述（可选）</span>
              <textarea
                v-model="taskEditForm.description"
                rows="3"
                placeholder="例如：备注改为第二季度回访"
              ></textarea>
            </label>
            <label class="task-field full task-field-inline">
              <input v-model="taskEditForm.dry_run" type="checkbox" />
              <span>仅预览（dry_run），不实际写入</span>
            </label>
            <p class="task-modal-hint">
              修改后会重新生成新报告，旧报告会归档保留，可在报告查询面板查看历史版本。
            </p>
          </div>

          <footer class="task-modal-foot">
            <button type="button" class="tiny-button" @click="closeTaskEditor">取消</button>
            <button
              type="button"
              class="tiny-button primary"
              :disabled="taskEditSubmitting"
              @click="submitTaskEdit"
            >
              {{ taskEditSubmitting ? '提交中...' : '提交' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- ========== 访后纪要详情弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="postSummaryDetailDialog"
        class="task-modal-mask"
        @click.self="closePostSummaryDetail"
      >
        <div class="task-modal task-modal--wide glass-card">
          <header class="task-modal-head">
            <h3>
              访后纪要 · 原报告
              <span class="task-id">#{{ postSummaryDetail?.report_id }}</span>
              <span v-if="postSummaryDetail?.version" class="task-pill task-pill--type">
                v{{ postSummaryDetail.version }}
              </span>
            </h3>
            <button type="button" class="tiny-button" @click="closePostSummaryDetail">关闭</button>
          </header>

          <div v-if="postSummaryDetailLoading" class="task-revisions-empty">加载中...</div>

          <template v-else-if="postSummaryDetail">
            <div class="report-detail-meta">
              <span>客户：<strong>{{ postSummaryDetail.company_name || postSummaryDetail.visit_location || '-' }}</strong></span>
              <span>拜访：<strong>{{ postSummaryDetail.visit_time || '-' }}</strong></span>
              <span>生成：<strong>{{ postSummaryDetail.created_at || '-' }}</strong></span>
            </div>

            <!-- 三个 Tab -->
            <div class="pv-tab-bar">
              <button
                type="button"
                class="pv-tab-btn"
                :class="{ active: postSummaryDetailTab === 'summary' }"
                @click="postSummaryDetailTab = 'summary'"
              >纪要内容</button>
              <button
                type="button"
                class="pv-tab-btn"
                :class="{ active: postSummaryDetailTab === 'raw' }"
                @click="postSummaryDetailTab = 'raw'"
              >原始访客报告</button>
              <button
                type="button"
                class="pv-tab-btn"
                :class="{ active: postSummaryDetailTab === 'rewrite' }"
                @click="postSummaryDetailTab = 'rewrite'"
              >补充重写</button>
            </div>

            <!-- Tab: 纪要内容 -->
            <div v-show="postSummaryDetailTab === 'summary'" class="report-detail-body">
              <h4 class="post-summary-h">摘要</h4>
              <pre>{{ postSummaryDetail.summary_content || '（无）' }}</pre>

              <template v-if="postSummaryDetail.highlights_list && postSummaryDetail.highlights_list.length">
                <h4 class="post-summary-h">关键要点</h4>
                <ul class="post-summary-detail-list">
                  <li v-for="(h, i) in postSummaryDetail.highlights_list" :key="'h'+i">{{ h }}</li>
                </ul>
              </template>

              <template v-if="postSummaryDetail.todos && postSummaryDetail.todos.length">
                <h4 class="post-summary-h">跟进待办</h4>
                <ol class="post-summary-detail-list">
                  <li v-for="(t, i) in postSummaryDetail.todos" :key="'t'+i">{{ t }}</li>
                </ol>
              </template>

              <template v-if="postSummaryDetail.next_visit_time || postSummaryDetail.next_visit_location">
                <h4 class="post-summary-h">下次会面</h4>
                <p>
                  📅 {{ postSummaryDetail.next_visit_time || '（未定）' }}
                  <span v-if="postSummaryDetail.next_visit_location"> · {{ postSummaryDetail.next_visit_location }}</span>
                </p>
              </template>
            </div>

            <!-- Tab: 原始访客报告 -->
            <div v-show="postSummaryDetailTab === 'raw'" class="report-detail-body">
              <h4 class="post-summary-h">客户经理上传的原始访客过程报告</h4>
              <pre v-if="postSummaryDetail.raw_text">{{ postSummaryDetail.raw_text }}</pre>
              <div v-else class="task-revisions-empty">暂无原始内容（可能上传时未保存原文）</div>
            </div>

            <!-- Tab: 补充重写 -->
            <div v-show="postSummaryDetailTab === 'rewrite'" class="report-detail-body">
              <h4 class="post-summary-h">补充内容重写纪要</h4>
              <p class="task-modal-hint" style="margin-bottom:10px">
                输入补充说明（如遗漏要点、修正信息、额外备注等），系统将结合原始文件内容和补充说明重新生成纪要。
              </p>
              <textarea
                v-model="pvRewriteSupplement"
                rows="6"
                class="pv-rewrite-textarea"
                placeholder="例如：补充一下，陈总还提到了他们Q3有一笔大额到期的理财需要续做，金额约500万…"
              ></textarea>
              <div
                v-if="pvRewriteStatus === 'loading'"
                class="pv-rewrite-status pv-rewrite-status--loading"
              >⏳ 正在重新生成纪要，请稍候…</div>
              <div
                v-if="pvRewriteStatus === 'error'"
                class="pv-rewrite-status pv-rewrite-status--error"
              >❌ {{ pvRewriteError }}</div>
              <div style="margin-top:8px">
                <button
                  type="button"
                  class="tiny-button primary"
                  :disabled="pvRewriteSubmitting"
                  @click="submitPostVisitRewrite"
                >{{ pvRewriteSubmitting ? '重写中...' : '重新生成纪要' }}</button>
              </div>
            </div>
          </template>

          <footer class="task-modal-foot">
            <button
              v-if="postSummaryDetail"
              type="button"
              class="tiny-button"
              @click="viewPostSummaryReport(postSummaryDetail); closePostSummaryDetail()"
            >查看报告</button>
            <button
              v-if="postSummaryDetail"
              type="button"
              class="tiny-button primary"
              @click="downloadPostSummary(postSummaryDetail)"
            >下载 .docx</button>
            <button
              v-if="postSummaryDetail"
              type="button"
              class="tiny-button"
              @click="closePostSummaryDetail(); openPostSummaryVersions(postSummaryDetail)"
            >版本历史</button>
            <button type="button" class="tiny-button" @click="closePostSummaryDetail">关闭</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- ========== 访后纪要版本历史弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="postSummaryVersionsDialog"
        class="task-modal-mask"
        @click.self="closePostSummaryVersions"
      >
        <div class="task-modal glass-card">
          <header class="task-modal-head">
            <h3>
              访后纪要版本历史 · 原报告
              <span class="task-id">#{{ postSummaryVersionsReportId }}</span>
              <span class="task-revisions-count">（{{ postSummaryVersions.length }}）</span>
            </h3>
            <button type="button" class="tiny-button" @click="closePostSummaryVersions">关闭</button>
          </header>

          <div class="task-modal-body">
            <div v-if="postSummaryVersionsLoading" class="task-revisions-empty">加载中...</div>
            <div v-else-if="!postSummaryVersions.length" class="task-revisions-empty">无版本记录。</div>
            <ul v-else class="task-revisions-list">
              <li
                v-for="(v, idx) in postSummaryVersions"
                :key="v.id || v.version || idx"
                class="task-revision"
              >
                <div class="task-revision-head">
                  <strong>v{{ v.version || idx + 1 }}</strong>
                  <span v-if="v.created_at || v.updated_at" class="task-revision-time">
                    {{ v.created_at || v.updated_at }}
                  </span>
                </div>
                <p v-if="v.supplement" class="task-revision-desc">补充：{{ v.supplement }}</p>
                <p v-if="v.next_visit_time" class="task-revision-desc">
                  下次会面：{{ v.next_visit_time }}
                  <span v-if="v.next_visit_location"> · {{ v.next_visit_location }}</span>
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ========== 报告详情弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="reportDetailDialog"
        class="task-modal-mask"
        @click.self="closeReportDetail"
      >
        <div class="task-modal task-modal--wide glass-card">
          <header class="task-modal-head">
            <h3>
              报告
              <span class="task-id">#{{ reportDetail?.report_id || reportDetail?.id }}</span>
              <span v-if="reportDetail?.version" class="task-pill task-pill--type">v{{ reportDetail.version }}</span>
            </h3>
            <button type="button" class="tiny-button" @click="closeReportDetail">关闭</button>
          </header>

          <div v-if="reportDetailLoading" class="task-revisions-empty">加载中...</div>
          <template v-else-if="reportDetail">
            <div class="report-detail-meta">
              <span>客户：<strong>{{ reportDetail.payload?.visit_location || reportDetail.visit_location || '-' }}</strong></span>
              <span>拜访：<strong>{{ reportDetail.payload?.visit_time || reportDetail.visit_time || '-' }}</strong></span>
              <span>推送：<strong>{{ reportDetail.payload?.report_send_time || reportDetail.report_send_time || '-' }}</strong></span>
              <span>更新：<strong>{{ reportDetail.updated_at || '-' }}</strong></span>
            </div>

            <!-- Tab 栏 -->
            <div class="pv-tab-bar">
              <button type="button" class="pv-tab-btn" :class="{ active: reportDetailTab === 'cards' }" @click="reportDetailTab = 'cards'">
                分节卡片 ({{ reportSections.length }})
              </button>
              <button type="button" class="pv-tab-btn" :class="{ active: reportDetailTab === 'brief' }" @click="reportDetailTab = 'brief'">
                精简版 ({{ reportBriefContent.length }}字)
              </button>
              <button type="button" class="pv-tab-btn" :class="{ active: reportDetailTab === 'full' }" @click="reportDetailTab = 'full'">
                完整版 ({{ reportFullContent.length }}字)
              </button>
              <button type="button" class="pv-tab-btn" :class="{ active: reportDetailTab === 'json' }" @click="reportDetailTab = 'json'">
                结构化
              </button>
              <button type="button" class="pv-tab-btn" :class="{ active: reportDetailTab === 'rewrite' }" @click="reportDetailTab = 'rewrite'">
                补充改写
              </button>
            </div>

            <!-- Tab: 分节卡片 -->
            <div v-show="reportDetailTab === 'cards'" class="report-detail-body">
              <div v-if="reportSections.length" class="rd-cards">
                <div v-for="(sec, idx) in reportSections" :key="idx" class="rd-card">
                  <h6>
                    <span class="rd-idx">{{ sec.numeral || sec.index || idx + 1 }}</span>
                    {{ sec.title || sec.heading || '章节' }}
                  </h6>
                  <ul v-if="sec.bullets && sec.bullets.length" class="rd-bullets">
                    <li v-for="(b, bi) in sec.bullets" :key="bi">{{ b }}</li>
                  </ul>
                  <div v-else class="rd-body">{{ (sec.body || '').trim() || '（本节无内容）' }}</div>
                </div>
              </div>
              <div v-else class="rd-cards-empty">（暂无可拆分的章节结构，可切换到「完整版」查看原文）</div>
            </div>

            <!-- Tab: 精简版 -->
            <div v-show="reportDetailTab === 'brief'" class="report-detail-body">
              <pre class="rd-pre">{{ reportBriefContent }}</pre>
            </div>

            <!-- Tab: 完整版 -->
            <div v-show="reportDetailTab === 'full'" class="report-detail-body">
              <pre class="rd-pre">{{ reportFullContent }}</pre>
            </div>

            <!-- Tab: 结构化 JSON -->
            <div v-show="reportDetailTab === 'json'" class="report-detail-body">
              <pre class="rd-pre rd-json">{{ reportStructuredJson }}</pre>
            </div>

            <!-- Tab: 补充改写 -->
            <div v-show="reportDetailTab === 'rewrite'" class="report-detail-body">
              <h4 class="post-summary-h">改写报告</h4>
              <p class="task-modal-hint" style="margin-bottom:10px">
                输入改写要求（如调整重点、补充信息、修改措辞等），系统将基于当前报告内容重新生成新版本。
              </p>
              <textarea
                v-model="reportRewriteSupplement"
                rows="6"
                class="pv-rewrite-textarea"
                placeholder="例如：请补充对方资产配置偏好，并把风险提示部分写得更详细一些…"
              ></textarea>
              <div
                v-if="reportRewriteStatus === 'loading'"
                class="pv-rewrite-status pv-rewrite-status--loading"
              >⏳ 正在改写报告，请稍候…</div>
              <div
                v-if="reportRewriteStatus === 'error'"
                class="pv-rewrite-status pv-rewrite-status--error"
              >❌ {{ reportRewriteError }}</div>
              <div style="margin-top:8px">
                <button
                  type="button"
                  class="tiny-button primary"
                  :disabled="reportRewriteSubmitting"
                  @click="submitReportRewrite"
                >{{ reportRewriteSubmitting ? '改写中...' : '重新生成报告' }}</button>
              </div>
            </div>
          </template>

          <footer class="task-modal-foot">
            <button v-if="reportDetail" type="button" class="tiny-button" @click="copyReportText('brief')">复制精简版</button>
            <button v-if="reportDetail" type="button" class="tiny-button" @click="copyReportText('full')">复制完整版</button>
            <button v-if="reportDetail" type="button" class="tiny-button primary" @click="downloadReportFile(reportDetail, 'brief')">⬇ 精简版 .docx</button>
            <button v-if="reportDetail" type="button" class="tiny-button primary" @click="downloadReportFile(reportDetail, 'full')">⬇ 完整版 .docx</button>
            <button v-if="reportDetail" type="button" class="tiny-button primary" @click="downloadReportFile(reportDetail, 'both')">⬇ 双版本 .docx</button>
            <button v-if="reportDetail" type="button" class="tiny-button warn" @click="reportDetailTab = 'rewrite'">改写此报告</button>
            <button type="button" class="tiny-button" @click="closeReportDetail">关闭</button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- ========== 报告版本历史弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="reportHistoryDialog"
        class="task-modal-mask"
        @click.self="closeReportHistory"
      >
        <div class="task-modal glass-card">
          <header class="task-modal-head">
            <h3>
              报告 <span class="task-id">#{{ reportHistoryReportId }}</span> 版本历史
              <span class="task-revisions-count">（{{ reportHistoryLogs.length }}）</span>
            </h3>
            <button type="button" class="tiny-button" @click="closeReportHistory">关闭</button>
          </header>

          <div class="task-modal-body">
            <div v-if="reportHistoryLoading" class="task-revisions-empty">加载中...</div>
            <div v-else-if="!reportHistoryLogs.length" class="task-revisions-empty">暂无版本记录。</div>
            <ul v-else class="task-revisions-list">
              <li v-for="(log, idx) in reportHistoryLogs" :key="log.id || log.version || idx" class="task-revision">
                <div class="task-revision-head">
                  <strong>
                    {{ log.version != null ? `v${log.version}` : `#${log.id || idx + 1}` }}
                  </strong>
                  <span v-if="log.action" class="task-pill task-pill--muted">{{ log.action }}</span>
                  <span v-if="log.created_at || log.updated_at" class="task-revision-time">
                    {{ log.created_at || log.updated_at }}
                  </span>
                </div>
                <p v-if="log.description || log.summary || log.note" class="task-revision-desc">
                  {{ log.description || log.summary || log.note }}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ========== 访后纪要上传弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="postVisitDialog"
        class="task-modal-mask"
        @click.self="closePostVisitUpload"
      >
        <div class="task-modal glass-card">
          <header class="task-modal-head">
            <h3>
              访后纪要 · 报告
              <span class="task-id">#{{ postVisitReportId }}</span>
              <span v-if="postVisitCompany" class="task-pill task-pill--muted">{{ postVisitCompany }}</span>
            </h3>
            <button type="button" class="tiny-button" @click="closePostVisitUpload">关闭</button>
          </header>

          <div class="task-modal-body">
            <label class="task-field full">
              <span>拜访过程概要文件 (.docx / .md / .txt) *</span>
              <input type="file" accept=".docx,.md,.txt" @change="onPostVisitFileChange" />
              <small v-if="postVisitFile" class="task-modal-hint">已选择：{{ postVisitFile.name }}</small>
            </label>
            <label class="task-field full">
              <span>补充说明（可选）</span>
              <textarea
                v-model="postVisitSupplement"
                rows="4"
                placeholder="补充未在文件中的关键信息，如客户态度、新发现的需求等"
              ></textarea>
            </label>
            <p class="task-modal-hint">
              后端会调用 LLM 自动从文件中提炼访后要点、待办、下次拜访建议，并生成 .docx 纪要。
            </p>
          </div>

          <footer class="task-modal-foot">
            <button type="button" class="tiny-button" @click="closePostVisitUpload">取消</button>
            <button
              type="button"
              class="tiny-button primary"
              :disabled="postVisitSubmitting"
              @click="submitPostVisitUpload"
            >
              {{ postVisitSubmitting ? '生成中...' : '生成访后纪要' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- ========== 修改记录弹窗 ========== -->
    <Teleport to="body">
      <div
        v-if="taskRevisionsDialog"
        class="task-modal-mask"
        @click.self="closeTaskRevisions"
      >
        <div class="task-modal glass-card">
          <header class="task-modal-head">
            <h3>
              任务 <span class="task-id">#{{ taskRevisionsTaskId }}</span> 修改记录
              <span class="task-revisions-count">（{{ taskRevisions.length }}）</span>
            </h3>
            <button type="button" class="tiny-button" @click="closeTaskRevisions">关闭</button>
          </header>

          <div class="task-modal-body">
            <div v-if="taskRevisionsLoading" class="task-revisions-empty">加载中...</div>
            <div v-else-if="!taskRevisions.length" class="task-revisions-empty">暂无修改记录。</div>
            <ul v-else class="task-revisions-list">
              <li v-for="log in taskRevisions" :key="log.id" class="task-revision">
                <div class="task-revision-head">
                  <strong>#{{ log.id }}</strong>
                  <span v-if="log.status" class="task-pill task-pill--muted">{{ log.status }}</span>
                  <span v-if="log.created_at" class="task-revision-time">{{ log.created_at }}</span>
                </div>
                <p v-if="log.description" class="task-revision-desc">{{ log.description }}</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ============ 推送铃铛 ============ -->
    <button
      v-if="pushBadgeCount > 0"
      class="push-bell"
      title="查看推送通知"
      @click="showNextPushToast"
    >
      🔔<span class="pb-dot">{{ pushBadgeCount > 99 ? '99+' : pushBadgeCount }}</span>
    </button>

    <!-- ============ 推送 Toast 弹窗 ============ -->
    <Teleport to="body">
      <div v-if="pushActiveMsg" class="push-toast-mask" @click.self="closePushToast(true)">
        <div class="push-toast" role="dialog" aria-modal="true">
          <div class="push-toast-head">
            <div class="pt-title">🔔 定时任务推送 <span class="pt-count">#{{ pushActiveMsg.id }}</span></div>
            <span v-if="pushQueue.length" class="pt-count">后续还有 {{ pushQueue.length }} 条</span>
          </div>
          <div class="push-toast-meta">
            <span>客户：<strong>{{ pushActiveMsg.company_name || '—' }}</strong></span>
            <span>时间：{{ pushActiveMsg.created_at || '' }}</span>
          </div>
          <div class="push-toast-body">{{ pushActiveMsg.content || '' }}</div>
          <div class="push-toast-foot">
            <button v-if="pushQueue.length" @click="showNextPushToast">下一条 →</button>
            <button @click="closePushToast(true)">稍后再看</button>
            <button class="primary" @click="acknowledgePush(pushActiveMsg.id)">标记已读</button>
            <button @click="markAllPushRead">全部已读</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.chat-layout {
  display: grid;
  /* 加宽侧栏，给"待办事项"卡片留更多展示空间（状态/类型 pill + 4 列元信息 + 5 个按钮） */
  grid-template-columns: clamp(18rem, 28vw, 24rem) minmax(0, 1fr);
  gap: clamp(0.875rem, 0.5rem + 1vw, 1.25rem);
  align-items: stretch;
  min-height: calc(100dvh - 10.5rem);
}

.chat-sidebar,
.chat-main {
  border-radius: calc(30px * var(--ui-scale));
  padding: clamp(1rem, 0.6rem + 1vw, 1.25rem);
  min-height: 0;
}

.chat-sidebar {
  display: flex;
  flex-direction: column;
  gap: calc(18px * var(--ui-scale));
  height: 100%;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(249, 241, 230, 0.92), rgba(255, 255, 255, 0.84));
}

.new-chat-button {
  width: 100%;
}

.side-section {
  display: flex;
  flex-direction: column;
  gap: calc(12px * var(--ui-scale));
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12px * var(--ui-scale));
}

.section-head-main {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--ui-scale));
  min-width: 0;
  flex-wrap: wrap;
}

.side-label {
  font-size: calc(18px * var(--ui-scale));
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.2;
}

.head-action-button {
  border: 1px solid rgba(27, 37, 54, 0.08);
  border-radius: 999px;
  padding: calc(6px * var(--ui-scale)) calc(12px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.84);
  color: var(--brand-alt);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.toggle-button {
  border: 1px solid rgba(27, 37, 54, 0.08);
  padding: calc(6px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  color: var(--text-main);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 600;
}

.capability-card,
.task-card {
  border-radius: calc(22px * var(--ui-scale));
  padding: calc(18px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid var(--line);
}

.capability-card strong {
  display: block;
  margin-bottom: calc(10px * var(--ui-scale));
}

.topic-empty,
.capability-card li,
.task-meta {
  color: var(--text-muted);
  line-height: 1.7;
}

.topic-list,
.task-list {
  display: flex;
  flex-direction: column;
  gap: calc(10px * var(--ui-scale));
}

.topic-chip {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.74);
  color: var(--text-main);
  border-radius: calc(18px * var(--ui-scale));
  padding: calc(14px * var(--ui-scale));
  text-align: left;
}

.topic-chip.active {
  background: linear-gradient(135deg, rgba(237, 124, 71, 0.18), rgba(47, 131, 116, 0.16));
  border-color: rgba(237, 124, 71, 0.28);
  box-shadow: 0 14px 28px rgba(47, 131, 116, 0.12);
}

.topic-title-row,
.task-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(10px * var(--ui-scale));
}

.topic-title-row strong,
.task-head strong {
  font-size: calc(14px * var(--ui-scale));
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-badge,
.task-status {
  padding: calc(4px * var(--ui-scale)) calc(8px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.18);
  color: var(--brand-alt);
  font-size: calc(11px * var(--ui-scale));
  font-weight: 700;
  white-space: nowrap;
}


.task-meta {
  margin: calc(8px * var(--ui-scale)) 0 0;
}

.task-actions {
  display: flex;
  gap: calc(8px * var(--ui-scale));
  flex-wrap: wrap;
  margin-top: calc(14px * var(--ui-scale));
}

/* ================ 待办事项 · 卡片增强样式 ================ */
.task-head {
  flex-wrap: wrap;
  row-gap: calc(6px * var(--ui-scale));
}

.task-title {
  flex: 1 1 100%;
  min-width: 0;
  font-size: calc(14px * var(--ui-scale));
  display: inline-flex;
  align-items: baseline;
  gap: calc(6px * var(--ui-scale));
}

.task-id {
  color: var(--text-muted);
  font-weight: 600;
  font-size: calc(12px * var(--ui-scale));
}

.task-pill {
  padding: calc(3px * var(--ui-scale)) calc(8px * var(--ui-scale));
  border-radius: 999px;
  font-size: calc(11px * var(--ui-scale));
  font-weight: 700;
  white-space: nowrap;
  background: rgba(47, 131, 116, 0.18);
  color: var(--brand-alt);
}

.task-pill--ok      { background: rgba(40, 160, 90, 0.16);  color: #1f7a4c; }
.task-pill--info    { background: rgba(64, 130, 220, 0.16); color: #1d4fa3; }
.task-pill--danger  { background: rgba(207, 76, 76, 0.16);  color: var(--danger, #b9322f); }
.task-pill--muted   { background: rgba(27, 37, 54, 0.10);   color: var(--text-muted); }
.task-pill--pending { background: rgba(245, 158, 11, 0.16); color: #b15a00; }
.task-pill--type    { background: rgba(122, 96, 199, 0.14); color: #5b3da3; }

.task-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: calc(4px * var(--ui-scale)) calc(12px * var(--ui-scale));
  margin: calc(10px * var(--ui-scale)) 0 0;
  font-size: calc(12px * var(--ui-scale));
  color: var(--text-muted);
  line-height: 1.6;
}

.task-meta-grid em {
  font-style: normal;
  color: var(--text-main);
  margin-right: 2px;
}

.task-meta-error {
  grid-column: 1 / -1;
  color: var(--danger, #b9322f);
}

/* tiny-button 局部加多两种 variant；primary/warn 样式只在本组件生效 */
.tiny-button.primary {
  background: rgba(47, 131, 116, 0.18);
  color: var(--brand-alt);
}

.tiny-button.warn {
  background: rgba(245, 158, 11, 0.18);
  color: #b15a00;
}

.tiny-button[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ================ 待办事项 · 弹窗 ================ */
.task-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.task-modal {
  width: min(560px, 100%);
  max-height: 86vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 24px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
}

.task-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.task-modal-head h3 {
  margin: 0;
  font-size: 16px;
}

.task-revisions-count {
  color: var(--text-muted);
  font-weight: normal;
  font-size: 13px;
}

.task-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.task-field > span {
  color: var(--text-muted);
}

.task-field input,
.task-field textarea {
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(27, 37, 54, 0.12);
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  color: var(--text-main);
  box-sizing: border-box;
}

.task-field textarea {
  resize: vertical;
  min-height: 70px;
}

.task-field-inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.task-field-inline > span {
  color: var(--text-main);
}

.task-modal-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}

.task-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.task-revisions-empty {
  padding: 16px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.task-revisions-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-revision {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(27, 37, 54, 0.04);
}

.task-revision-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.task-revision-time {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 12px;
}

.task-revision-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-main);
  line-height: 1.6;
}

/* ================ 访前报告 · 列表 + 详情弹窗 ================ */
.report-filter-row {
  margin: calc(8px * var(--ui-scale)) 0 calc(2px * var(--ui-scale));
}

.report-filter-row input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(27, 37, 54, 0.10);
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  color: var(--text-main);
  box-sizing: border-box;
}

.todo-filter-row {
  display: flex;
  gap: 6px;
  margin: calc(8px * var(--ui-scale)) 0 calc(2px * var(--ui-scale));
}

.todo-filter-row input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(27, 37, 54, 0.10);
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  color: var(--text-main);
  box-sizing: border-box;
  font-size: calc(12px * var(--ui-scale));
}

.todo-status-select {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(27, 37, 54, 0.10);
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  color: var(--text-main);
  font-size: calc(12px * var(--ui-scale));
  cursor: pointer;
}

.task-modal--wide {
  width: min(820px, 100%);
}

.report-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.report-detail-meta strong {
  color: var(--text-main);
  font-weight: 600;
}

.report-detail-body {
  max-height: 56vh;
  overflow-y: auto;
  padding: 12px 14px;
  background: rgba(27, 37, 54, 0.04);
  border-radius: 12px;
}

.report-detail-body pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font: inherit;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-main);
}

/* ================ 访后纪要 · 卡片 + 详情弹窗 ================ */
.post-summary-snippet {
  margin: calc(8px * var(--ui-scale)) 0 0;
  font-size: calc(12px * var(--ui-scale));
  line-height: 1.7;
  color: var(--text-main);
}

.post-summary-block {
  margin-top: calc(6px * var(--ui-scale));
  font-size: calc(12px * var(--ui-scale));
  color: var(--text-muted);
  line-height: 1.6;
}

.post-summary-block strong {
  display: block;
  font-size: calc(11px * var(--ui-scale));
  color: var(--text-main);
  margin-bottom: 2px;
}

.post-summary-block ul,
.post-summary-block ol {
  margin: 2px 0 0;
  padding-left: calc(18px * var(--ui-scale));
}

.post-summary-next {
  margin: calc(6px * var(--ui-scale)) 0 0;
  font-size: calc(12px * var(--ui-scale));
  color: #16a34a;
}

/* 详情弹窗内的二级标题 */
.post-summary-h {
  margin: 14px 0 6px;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 600;
}

.post-summary-h:first-child {
  margin-top: 0;
}

.post-summary-detail-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-main);
}

/* ---- 访后纪要详情 · Tab 栏 + 补充重写 ---- */
.pv-tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 2px solid rgba(27, 37, 54, 0.10);
}

.pv-tab-btn {
  padding: 8px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}

.pv-tab-btn.active {
  color: var(--brand-alt, #2563eb);
  border-bottom-color: var(--brand-alt, #2563eb);
}

.pv-rewrite-textarea {
  width: 100%;
  font-size: 13px;
  border: 1px solid rgba(27, 37, 54, 0.12);
  border-radius: 6px;
  padding: 10px;
  resize: vertical;
  font: inherit;
  color: var(--text-main);
  box-sizing: border-box;
}

.pv-rewrite-status {
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.pv-rewrite-status--loading {
  background: rgba(64, 130, 220, 0.12);
  color: #1e40af;
}

.pv-rewrite-status--error {
  background: rgba(207, 76, 76, 0.12);
  color: #b91c1c;
}

.capability-card ul {
  padding-left: calc(18px * var(--ui-scale));
  margin: 0;
}

.chat-main {
  display: flex;
  flex-direction: column;
  gap: calc(18px * var(--ui-scale));
  height: 100%;
  overflow-y: auto;
  background:
    radial-gradient(circle at top right, rgba(255, 225, 194, 0.56), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 254, 0.88));
}

.chat-hero {
  display: grid;
  gap: calc(16px * var(--ui-scale));
  flex-shrink: 0;
}

.hero-label {
  display: inline-flex;
  padding: calc(8px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.12);
  color: var(--brand-alt);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
}

.chat-hero h2 {
  margin: calc(16px * var(--ui-scale)) 0 calc(10px * var(--ui-scale));
  font-size: calc(clamp(24px, 2.6vw, 38px) * var(--ui-scale));
}

.chat-hero p {
  margin: 0;
  max-width: 760px;
  color: var(--text-muted);
  line-height: 1.7;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: calc(12px * var(--ui-scale));
}

.prompt-card {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.74);
  border-radius: calc(22px * var(--ui-scale));
  padding: calc(18px * var(--ui-scale));
  text-align: left;
  color: var(--text-main);
  min-height: calc(92px * var(--ui-scale));
}

.message-panel {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: calc(4px * var(--ui-scale));
  display: flex;
  flex-direction: column;
  gap: calc(18px * var(--ui-scale));
}

.message-item {
  display: flex;
  gap: calc(12px * var(--ui-scale));
  align-items: flex-start;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: calc(42px * var(--ui-scale));
  height: calc(42px * var(--ui-scale));
  border-radius: calc(16px * var(--ui-scale));
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #2f8374, #6eb6ab);
  flex-shrink: 0;
}

.message-item.user .message-avatar {
  background: linear-gradient(135deg, #ed7c47, #f2ab7d);
}

.message-bubble {
  max-width: min(46rem, calc(100% - 3.375rem));
  border-radius: calc(24px * var(--ui-scale));
  padding: calc(18px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid var(--line);
}

.message-item.user .message-bubble {
  background: rgba(255, 239, 228, 0.88);
}

.message-role {
  display: block;
  font-size: calc(12px * var(--ui-scale));
  color: var(--text-muted);
  margin-bottom: calc(8px * var(--ui-scale));
}

.message-bubble p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.8;
}

.composer {
  border-radius: calc(26px * var(--ui-scale));
  padding: calc(14px * var(--ui-scale)) calc(16px * var(--ui-scale));
  flex-shrink: 0;
}

.composer textarea {
  width: 100%;
  border: none;
  min-height: calc(64px * var(--ui-scale));
  max-height: calc(140px * var(--ui-scale));
  resize: vertical;
  background: transparent;
  outline: none;
  color: var(--text-main);
  line-height: 1.6;
}

.composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: calc(16px * var(--ui-scale));
  margin-top: calc(12px * var(--ui-scale));
}

.composer-left {
  display: flex;
  align-items: center;
  gap: calc(14px * var(--ui-scale));
  flex-wrap: wrap;
}

.model-picker-wrap {
  position: relative;
}

.model-trigger {
  display: inline-flex;
  align-items: center;
  gap: calc(10px * var(--ui-scale));
  padding: calc(10px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--text-main);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.model-trigger-label {
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
}

.model-trigger strong {
  font-size: calc(13px * var(--ui-scale));
}

.model-trigger-arrow {
  color: var(--text-muted);
  font-size: calc(16px * var(--ui-scale));
  transition: transform 0.18s ease;
}

.model-trigger-arrow.open {
  transform: rotate(180deg);
}

.model-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + calc(10px * var(--ui-scale)));
  width: min(18rem, calc(100vw - 3rem));
  padding: calc(10px * var(--ui-scale));
  border-radius: calc(22px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 36px rgba(27, 37, 54, 0.12);
  z-index: 20;
}

.model-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(14px * var(--ui-scale));
  padding: calc(12px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border: 1px solid transparent;
  border-radius: calc(18px * var(--ui-scale));
  background: transparent;
  color: var(--text-main);
  text-align: left;
}

.model-option + .model-option {
  margin-top: calc(8px * var(--ui-scale));
}

.model-option.active {
  background: linear-gradient(135deg, rgba(237, 124, 71, 0.14), rgba(47, 131, 116, 0.12));
  border-color: rgba(237, 124, 71, 0.18);
}

.model-option-copy strong {
  display: block;
  font-size: calc(14px * var(--ui-scale));
}

.model-option-copy span {
  display: block;
  margin-top: calc(6px * var(--ui-scale));
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
  line-height: 1.5;
}

.model-option em {
  font-style: normal;
  padding: calc(4px * var(--ui-scale)) calc(8px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.16);
  color: var(--brand-alt);
  font-size: calc(11px * var(--ui-scale));
  font-weight: 700;
  white-space: nowrap;
}

.composer-actions span {
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
}

@media (max-width: 1280px) {
  .chat-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .chat-main {
    height: calc(100dvh - 9rem);
  }
}

@media (max-width: 900px) {
  .section-head {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .topic-title-row strong,
  .task-head strong {
    white-space: normal;
  }
}

@media (max-width: 640px) {
  .chat-sidebar,
  .chat-main {
    padding: 1rem;
    border-radius: calc(24px * var(--ui-scale));
  }

  .chat-main {
    height: calc(100dvh - 7.5rem);
  }

  .composer-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .composer-left {
    width: 100%;
  }

  .model-picker-wrap,
  .model-trigger,
  .model-menu {
    width: 100%;
  }
}

/* ==================== 推送铃铛 ==================== */
.push-bell {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #1d4ed8;
  color: #fff;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(29, 78, 216, 0.35);
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.push-bell .pb-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

/* ==================== 推送 Toast ==================== */
.push-toast-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: pushFadeIn 0.2s;
}

@keyframes pushFadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes pushPopIn { from { transform: translateY(20px) scale(0.96); opacity: 0 } to { transform: none; opacity: 1 } }

.push-toast {
  background: #fff;
  border-radius: 12px;
  max-width: 640px;
  width: 92%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.35);
  overflow: hidden;
  animation: pushPopIn 0.25s;
}

.push-toast-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(90deg, #1d4ed8, #4338ca);
  color: #fff;
}

.push-toast-head .pt-title {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.push-toast-head .pt-count {
  background: rgba(255, 255, 255, 0.22);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
}

.push-toast-meta {
  display: flex;
  gap: 12px;
  padding: 8px 18px;
  font-size: 11px;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.push-toast-body {
  flex: 1;
  overflow: auto;
  padding: 14px 18px;
  font-size: 13px;
  line-height: 1.7;
  color: #0f172a;
  white-space: pre-wrap;
  background: #fff;
}

.push-toast-foot {
  display: flex;
  gap: 8px;
  padding: 10px 18px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  justify-content: flex-end;
}

.push-toast-foot button {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #c7d2fe;
  background: #fff;
  color: #3730a3;
  cursor: pointer;
  font-size: 12px;
}

.push-toast-foot button.primary {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
}

.push-toast-foot button:hover {
  filter: brightness(1.05);
}

/* ==================== 报告生成进度卡片 ==================== */
.gen-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gen-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  font-size: 12px;
}

.gen-card .gen-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}

.gen-card .gen-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #1d4ed8;
  border-radius: 50%;
  animation: genSpin 0.8s linear infinite;
}

@keyframes genSpin { to { transform: rotate(360deg) } }

.gen-card .gen-info {
  flex: 1;
  min-width: 0;
}

.gen-card .gen-title {
  font-weight: 600;
  color: #0f172a;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gen-card .gen-meta {
  color: #64748b;
  font-size: 10px;
}

.gen-card.done {
  border-color: #86efac;
  background: #f0fdf4;
}

.gen-card.error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.gen-dismiss {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
}

.gen-dismiss:hover {
  background: #f1f5f9;
}

/* ==================== 报告详情 · 分节卡片 ==================== */
.rd-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.rd-cards-empty {
  color: #64748b;
  font-size: 13px;
  padding: 16px 0;
  text-align: center;
}

.rd-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rd-card h6 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rd-idx {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #1d4ed8;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 0 4px;
  flex-shrink: 0;
}

.rd-bullets {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.6;
  color: #334155;
}

.rd-bullets li {
  margin-bottom: 2px;
}

.rd-body {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.rd-pre {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  color: #0f172a;
}

.rd-json {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 12px;
  color: #334155;
}

.task-modal-foot {
  flex-wrap: wrap;
}

.tiny-button.warn {
  background: #f59e0b;
  color: #fff;
  border-color: #f59e0b;
}

.tiny-button.warn:hover {
  background: #d97706;
}
</style>

