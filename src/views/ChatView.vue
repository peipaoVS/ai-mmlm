<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api/http'
import { useSession } from '../stores/session'
import { API_PATHS } from '../config/aiApi';

const session = useSession()
const loading = ref(false)
const inputValue = ref('')
const conversationTitle = ref('新会话')
const messages = ref([])
const recentSessions = ref([])
const taskJobs = ref([
  {
    id: 1,
    name: '测试访客提醒任务',
    cronExpression: '0 0/30 * * * ?',
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
const activeSessionId = ref('')
const showAllSessions = ref(false)
const showAllTasks = ref(false)
const modelMenuVisible = ref(false)
const modelMenuRef = ref(null)

const modelOptions = [
  {
    label: '规则答疑',
    description: '适合制度、流程、规范类问题'
  },
  {
    label: '访客辅助',
    description: '适合访客接待、咨询与引导场景'
  }
]

const selectedModel = ref(modelOptions[0].label)

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

onMounted(() => {
  startFreshConversation()
  startFreshConver()
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
      model: selectedModel.value,
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

  messages.value.push({
    role: 'user',
    content
  })
  syncActiveSession(sessionId)

  inputValue.value = ''
  loading.value = true

  try {
    console.log('sendMessage', selectedModel.value)
    // 先添加一个空的助手消息，用于流式填充
    const assistantMessage = { role: 'assistant', content: '' }
    messages.value.push(assistantMessage)
    if(selectedModel.value ==='规则答疑') {
      const stream = api.stream(API_PATHS.SESSION.WEB_STREAM, {
        threadId: "thread_001",
        runId: "run_abc123",
        parentRunId: "",
        variant: 'both',
        state: {
          branch: "南京分行",
          agent: "visit_assistant_agent",
          action: "parse",
          task_payload: {},
        },
        messages: [{ id: "m1", role: "user", content: content }],
        tools: [],
        context: [],
        forwardedProps: {},
        additionalProp1: {}
      })

      for await (const eventData of stream) {
        // 处理不同类型的 SSE 事件
        if (eventData.type === 'TEXT_MESSAGE_CONTENT' && eventData.delta) {
          assistantMessage.content += eventData.delta
        }
      }
    } else {
      // 模拟一个简单的助手回复，实际使用时替换为真实接口
      await new Promise((resolve) => setTimeout(resolve, 1500))
      assistantMessage.content = `这是模型 "${selectedModel.value}" 的模拟回复：你刚才说的是 "${content}"。后续替换成真实接口后，这里会返回模型的实际回答。`
    }
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: `请求失败：${error.message}`
    })
  } finally {
    syncActiveSession(sessionId)
    loading.value = false
  }
}

function startFreshConversation() {
  activeSessionId.value = ''
  conversationTitle.value = '新会话'
  selectedModel.value = modelOptions[0].label
  messages.value = [
    {
      role: 'assistant',
      content: `你好，${session.user?.nickname || session.user?.username || '管理员'}。我是当前系统里的大模型问答占位页。你后续只需要把后端 mock 接口替换成真实模型接口即可。`
    }
  ]
  inputValue.value = ''
}

function switchSession(item) {
  activeSessionId.value = item.id
  conversationTitle.value = item.title
  selectedModel.value = item.model || modelOptions[0].label
  messages.value = cloneMessages(item.messages)
}

function syncActiveSession(sessionId) {
  recentSessions.value = sortSessions(
    recentSessions.value.map((item) =>
      item.id === sessionId
        ? {
            ...item,
            model: selectedModel.value,
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
  modelMenuVisible.value = false
}

function handleDocumentClick(event) {
  if (modelMenuRef.value && !modelMenuRef.value.contains(event.target)) {
    modelMenuVisible.value = false
  }
}

function editTask(task) {
  window.alert(`编辑功能占位：${task.name}`)
}

function deleteTask(task) {
  window.alert(`删除功能占位：${task.name}`)
}

function exportTask(task) {
  window.alert(`导出功能占位：${task.name}`)
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
          <span class="side-label">最近会话</span>
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
          <span class="side-label">定时任务</span>
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
            <div class="task-head">
              <strong>{{ task.name }}</strong>
              <span class="task-status">{{ task.status }}</span>
            </div>
            <p class="task-meta">{{ task.cronExpression }}</p>
            <p class="task-meta">{{ task.remark || '接口占位任务' }}</p>
            <div class="task-actions">
              <button type="button" class="tiny-button" @click="editTask(task)">编辑</button>
              <button type="button" class="tiny-button danger" @click="deleteTask(task)">删除</button>
              <button type="button" class="tiny-button" @click="exportTask(task)">导出</button>
            </div>
          </article>
        </div>

        <div v-else class="topic-empty">暂无定时任务。</div>
      </section>
    </aside>

    <section class="chat-main glass-card">
      <div class="chat-hero">
        <div>
          <span class="hero-label">LLM Workspace</span>
          <h2>今天想让模型帮你完成什么？</h2>
          <p>
            页面结构已经为多轮对话预留好。现在返回的是 mock 内容，后端替换接口之后前端无需重写。
          </p>
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

      <div class="message-panel">
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
          placeholder="输入你的问题，当前会调用后端 mock 接口。后续对接真实大模型时，继续走这个入口即可。"
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
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
}

.chat-sidebar,
.chat-main {
  border-radius: 30px;
  padding: 20px;
}

.chat-sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  background:
    linear-gradient(180deg, rgba(249, 241, 230, 0.92), rgba(255, 255, 255, 0.84));
}

.new-chat-button {
  width: 100%;
}

.side-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.side-label {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.toggle-button {
  border: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(29, 35, 52, 0.08);
  color: var(--text-main);
  font-size: 12px;
}

.capability-card,
.task-card {
  border-radius: 22px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid var(--line);
}

.capability-card strong {
  display: block;
  margin-bottom: 10px;
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
  gap: 10px;
}

.topic-chip {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.74);
  color: var(--text-main);
  border-radius: 18px;
  padding: 14px;
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
  gap: 10px;
}

.topic-title-row strong,
.task-head strong {
  font-size: 14px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-badge,
.task-status {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.18);
  color: var(--brand-alt);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}


.task-meta {
  margin: 8px 0 0;
}

.task-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.capability-card ul {
  padding-left: 18px;
  margin: 0;
}

.chat-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: calc(100vh - 160px);
  background:
    radial-gradient(circle at top right, rgba(255, 225, 194, 0.56), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 254, 0.88));
}

.chat-hero {
  display: grid;
  gap: 16px;
}

.hero-label {
  display: inline-flex;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.12);
  color: var(--brand-alt);
  font-size: 12px;
  font-weight: 700;
}

.chat-hero h2 {
  margin: 16px 0 10px;
  font-size: clamp(24px, 2.6vw, 38px);
}

.chat-hero p {
  margin: 0;
  max-width: 760px;
  color: var(--text-muted);
  line-height: 1.7;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.prompt-card {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.74);
  border-radius: 22px;
  padding: 18px;
  text-align: left;
  color: var(--text-main);
  min-height: 92px;
}

.message-panel {
  flex: 1;
  overflow: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 42px;
  height: 42px;
  border-radius: 16px;
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
  max-width: min(760px, calc(100% - 54px));
  border-radius: 24px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid var(--line);
}

.message-item.user .message-bubble {
  background: rgba(255, 239, 228, 0.88);
}

.message-role {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.message-bubble p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.8;
}

.composer {
  border-radius: 26px;
  padding: 14px 16px;
}

.composer textarea {
  width: 100%;
  border: none;
  min-height: 64px;
  max-height: 140px;
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
  gap: 16px;
  margin-top: 12px;
}

.composer-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.model-picker-wrap {
  position: relative;
}

.model-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(27, 37, 54, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--text-main);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.model-trigger-label {
  color: var(--text-muted);
  font-size: 12px;
}

.model-trigger strong {
  font-size: 13px;
}

.model-trigger-arrow {
  color: var(--text-muted);
  font-size: 16px;
  transition: transform 0.18s ease;
}

.model-trigger-arrow.open {
  transform: rotate(180deg);
}

.model-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 10px);
  width: 280px;
  padding: 10px;
  border-radius: 22px;
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
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 18px;
  background: transparent;
  color: var(--text-main);
  text-align: left;
}

.model-option + .model-option {
  margin-top: 8px;
}

.model-option.active {
  background: linear-gradient(135deg, rgba(237, 124, 71, 0.14), rgba(47, 131, 116, 0.12));
  border-color: rgba(237, 124, 71, 0.18);
}

.model-option-copy strong {
  display: block;
  font-size: 14px;
}

.model-option-copy span {
  display: block;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.model-option em {
  font-style: normal;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.16);
  color: var(--brand-alt);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.composer-actions span {
  color: var(--text-muted);
  font-size: 12px;
}

@media (max-width: 1080px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }

  .chat-main {
    min-height: auto;
  }
}

@media (max-width: 640px) {
  .chat-sidebar,
  .chat-main {
    padding: 16px;
    border-radius: 24px;
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
