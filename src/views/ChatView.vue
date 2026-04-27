<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api/http'
import { useSession, getToken } from '../stores/session'
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
    const response = await api.get(API_PATHS.SESSION.LIST)
    recentSessions.value = response.messages.filter(item => item.role === 'user')
  } finally {
    loading.value = false
  }
}
// 待办事项接口
async function loadTaskJobs() {
  loading.value = true
  try {
    const response = await api.get(API_PATHS.SESSION.REDETAIL)
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

const selectedModelLabel = computed(() => selectedModel.value || defaultModelLabel)

onMounted(() => {
  startFreshConversation()
  startFreshConver()
  loadTaskJobs()
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
      const stream = api.stream(API_PATHS.SESSION.RULE_QA, {
        threadId: ensureRuleThreadId(),
          runId: genRunId(),
          parentRunId: "",
          variant: 'both',
          state: {
            branch: session.user?.postNames[0] || '南京分行',
            action: "query",
            agent: 'visit_assistant_agent',
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
        // 收集 TEXT_MESSAGE_CONTENT 的内容
        if (eventData.type === 'TEXT_MESSAGE_CONTENT' && eventData.delta) {
          jsonContent += eventData.delta
        }
      }

      // 尝试解析 JSON 并格式化为 Markdown
      try {
        const data = JSON.parse(jsonContent)
        if (data.type === 'rule_qa_response') {
          assistantMessage.content = formatRuleQaResponse(data)
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
      const stream = api.stream(API_PATHS.SESSION.WEB_STREAM, {
        threadId: ensureVisitThreadId(),
        runId: genRunId(),
        parentRunId: "",
        variant: 'both',
        state: {
          branch: session.user?.postNames[0] || "南京分行",
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
  console.log('切换会话:', item)
  thread.value = item.thread_id
  const response = await api.get(API_PATHS.SESSION.LIST + "?thread_id=" + item.thread_id)
  console.log('获取会话详情接口返回的数据:', response)


  activeSessionId.value = item.id
  conversationTitle.value = item.title
  selectedModel.value = item.model || defaultModelLabel
  modelMenuVisible.value = false
  messages.value = cloneMessages(response.messages || [])
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
    content: item.content
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

function editTask(task) {
  const newTitle = window.prompt('请输入新的任务标题', task.title)
  if (newTitle && newTitle.trim() !== task.title) {
    updateTask({ ...task, title: newTitle.trim() })
  }
}
async function yopfnsjnf(task) {
  const assistantMessage = { role: 'assistant', content: '正在查询报告...', model: '' }
  messages.value.push(assistantMessage)
  await scrollMessagesToBottom()
  
  try {
    const response = await api.get(API_PATHS.SESSION.QUERYREPORTS + task.id)
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

async function updateTask(task) {
  try {
    await api.post(`${API_PATHS.SESSION.ASSISYANT}${task.id}/revise`, {
      task_id: task.id,
      title: task.title,
      dry_run: false,
      regenerate_report: true,
      before: {},
      after: {},
      parsed_patch: {},
      deleted_old_report: {},
      revision_log_id: 21
    })
    window.alert('更新成功')
    loadTaskJobs()
  } catch (error) {
    window.alert('更新失败：' + error.message)
  }
}

async function deleteTask(task) {
  try {
    await api.delete(`${API_PATHS.SESSION.DELETE}${task.id}`)
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
  const strtop = '/download?variant=full&include_meta=true&version=1';
  const token = getToken()
  try {
    const response = await fetch(`${API_PATHS.SESSION.DOWNIOAD}${task.id}${strtop}`, {
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
async function handleConfirm(message) {
  loading.value = true
  const assistantMessage = { role: 'assistant', content: '', model: '' }
  messages.value.push(assistantMessage)
  console.log('确认拜访安排:', message)
  const stream = api.stream(API_PATHS.SESSION.WEB_STREAM, {
    threadId: ensureVisitThreadId(),
    runId: genRunId(),
    parentRunId: "",
    state: { 
      agent: "visit_assistant_agent",
      action: "confirm",
      task_payload: visitTaskPayload .value,
      report_variant: 'full',
    },
    messages: [{ id: "m1", role: "user", content: '确认' }],
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
    assistantMessage.content = formatToFriendlyMarkdown(data)
  } catch (e) {
    // 如果不是 JSON，直接显示原始内容
    assistantMessage.content = jsonContent
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
</script>

<template>
  <div class="chat-layout">
    <aside class="chat-sidebar glass-card">
      <button class="pill-button new-chat-button" @click="startFreshConversation">
        + 新建对话
      </button>

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
            v-if="taskJobs.length > 2"
            type="button"
            class="toggle-button"
            @click="showAllTasks = !showAllTasks"
          >
            {{ showAllTasks ? '收起' : '打开' }}
          </button>
        </div>

        <div v-if="taskJobs.length" class="task-list">
          <article v-for="task in visibleTaskJobs" :key="task.id" class="task-card">
            <div @click="yopfnsjnf(task)">
              <div class="task-head">
                <strong>{{ task.title }}</strong>
                <span class="task-status">{{ getTaskStatusText(task.status) }}</span>
              </div>
              <p class="task-meta">{{ task.visit_time }}</p>
              <!-- <p class="task-meta">{{ task.remark || '接口占位任务' }}</p> -->
              <div class="task-actions">
                <button type="button" class="tiny-button" @click="editTask(task)">编辑</button>
                <button type="button" class="tiny-button danger" @click="deleteTask(task)">删除</button>
                <button type="button" class="tiny-button" @click="exportTask(task)">导出</button>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="topic-empty">暂无定时任务。</div>
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
  </div>
</template>

<style scoped>
.chat-layout {
  display: grid;
  grid-template-columns: clamp(16rem, 24vw, 20rem) minmax(0, 1fr);
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
</style>
