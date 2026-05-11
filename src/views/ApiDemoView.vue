<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api/http'
import AppSelect from '../components/AppSelect.vue'
import deepseekLogo from '../assets/providers/deepseek-logo.svg'
import ollamaLogo from '../assets/providers/ollama-logo.png'
import openaiSymbol from '../assets/providers/openai-symbol.svg'
import qianfanLogo from '../assets/providers/qianfan-logo.png'
import qwenLogo from '../assets/providers/qwen-logo.png'
import zhipuLogo from '../assets/providers/zhipu-logo.svg'

const PROFILE = {
  deepseek: { name: 'DeepSeek', accent: '#4f6dff', surface: 'rgba(79, 109, 255, 0.18)', logo: deepseekLogo },
  ollama: { name: 'Ollama', accent: '#20242f', surface: 'rgba(32, 36, 47, 0.16)', logo: ollamaLogo },
  openai: { name: 'OpenAI', accent: '#111111', surface: 'rgba(17, 17, 17, 0.12)', logo: openaiSymbol },
  tongyi: { name: '通义千问', accent: '#5a54ff', surface: 'rgba(90, 84, 255, 0.2)', logo: qwenLogo },
  qianfan: { name: '千帆大模型', accent: '#2688ff', surface: 'rgba(38, 136, 255, 0.18)', logo: qianfanLogo },
  zhipu: { name: '智谱 AI', accent: '#2f8374', surface: 'rgba(47, 131, 116, 0.18)', logo: zhipuLogo }
}

const models = ref([])
const selectedId = ref(null)
const loading = ref(true)
const inputText = ref('')
const responseText = ref('')
const requestUrl = ref('')
const testLoading = ref(false)

const modelOptions = computed(() =>
  models.value.map(m => ({ label: m.name, value: m.id }))
)

const current = computed(() => {
  if (!selectedId.value) return null
  return models.value.find(m => m.id === selectedId.value) || null
})

const profile = computed(() => PROFILE[current.value?.providerCode] || null)

const MOCK_ENDPOINTS = [
  { method: 'POST', path: '/v1/chat/completions', desc: '聊天补全' },
  { method: 'POST', path: '/v1/embeddings', desc: '向量嵌入' },
  { method: 'GET', path: '/v1/models', desc: '模型列表' }
]

function genId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
}

const isRuleModel = computed(() => {
  const name = current.value?.name || ''
  return name.includes('规则') || name.includes('答疑')
})

onMounted(async () => {
  try {
    const data = await api.get('/api/agent-modules')
    models.value = Array.isArray(data) ? data : []
    if (models.value.length) {
      selectedId.value = models.value[0].id
    }
  } catch (e) {
    window.alert(e.message)
  } finally {
    loading.value = false
  }
})

async function sendTest() {
  if (!inputText.value.trim() || !current.value) return
  testLoading.value = true
  responseText.value = ''
  let domain = current.value.apiDomain.replace(/\/+$/, '')
  try {
    if (isRuleModel.value) {
      requestUrl.value = domain + '/awp/rule-qa'
      const body = {
        modelId: current.value.id,
        endpoint: '/awp/rule-qa',
        threadId: genId('rule'),
        runId: genId('run'),
        parentRunId: '',
        variant: 'both',
        state: {
          action: 'query',
          agent: 'rule_qa_agent',
          nickname: '',
          postName: '',
          provider: '',
          sys_session_code: ''
        },
        messages: [{ id: 'm1', thread_id: '', role: 'user', content: inputText.value }],
        tools: [],
        context: [],
        forwardedProps: {},
        additionalProp1: {}
      }
      const res = await api.post('/api/agent-modules/chat', body)
      responseText.value = res?.answer || JSON.stringify(res, null, 2)
    } else {
      requestUrl.value = domain.match(/\/v\d+$/) ? domain + '/chat/completions' : domain + '/v1/chat/completions'
      const res = await api.post('/api/agent-modules/chat', {
        modelId: current.value.id,
        messages: [{ role: 'user', content: inputText.value }]
      })
      responseText.value = JSON.stringify(res, null, 2)
    }
  } catch (e) {
    responseText.value = `请求异常: ${e.message}`
  } finally {
    testLoading.value = false
  }
}

function copyApiDomain() {
  if (current.value?.apiDomain) {
    navigator.clipboard.writeText(current.value.apiDomain)
      .then(() => { window.alert('已复制 API 地址') })
      .catch(() => {})
  }
}
</script>

<template>
  <div class="admin-scroll-page demo-page">
    <section class="data-panel glass-card admin-scroll-panel">
      <div class="toolbar">
        <AppSelect v-model="selectedId" :options="modelOptions" placeholder="选择模型" />
        <span v-if="current" class="toolbar-hint">{{ current.providerName }} · {{ current.baseModel }}</span>
        <span class="toolbar-spacer"></span>
        <button class="pill-button ghost" @click="selectedId = models[0]?.id">默认</button>
      </div>

      <div v-if="loading" class="empty-state panel-empty-state">数据加载中...</div>

      <div v-else-if="!current" class="empty-state panel-empty-state">暂无模型数据。</div>

      <div v-else class="demo-layout panel-scroll-region">
        <!-- 左侧：接口描述 -->
        <div class="demo-left">
          <div class="info-card" :style="{ borderColor: profile?.accent + '44', '--accent': profile?.accent, '--surface': profile?.surface }">
            <div class="provider-hero" :style="{ background: `linear-gradient(135deg, ${profile?.surface}, transparent 65%)` }">
              <img v-if="profile?.logo" :src="profile.logo" class="provider-logo" :style="{ '--glow': profile?.accent + '33' }" />
              <div class="hero-info">
                <div class="hero-name">{{ current.providerName }}</div>
                <div class="hero-model">{{ current.baseModel }}</div>
              </div>
            </div>

            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">模型名称</span>
                <span class="detail-value">{{ current.name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">模型类型</span>
                <span class="detail-value">{{ current.moduleTypeName || current.moduleType }}</span>
              </div>
              <div class="detail-item full">
                <span class="detail-label">API 地址</span>
                <span class="detail-value mono">{{ current.apiDomain }}<button class="copy-btn" @click="copyApiDomain">复制</button></span>
              </div>
              <div v-if="current.remark" class="detail-item full">
                <span class="detail-label">备注</span>
                <span class="detail-value">{{ current.remark }}</span>
              </div>
            </div>
          </div>

          <div class="info-card">
            <h4 class="section-title">可用接口</h4>
            <table class="endpoint-table">
              <thead>
                <tr><th class="method-col">方法</th><th>接口路径</th><th>说明</th></tr>
              </thead>
              <tbody>
                <tr v-for="ep in MOCK_ENDPOINTS" :key="ep.path">
                  <td><span class="method-badge" :class="ep.method.toLowerCase()">{{ ep.method }}</span></td>
                  <td class="mono">{{ ep.path }}</td>
                  <td>{{ ep.desc }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 右侧：接口测试 -->
        <div class="demo-right">
          <div class="test-card">
            <h4 class="section-title">接口测试</h4>
            <div class="test-input-row">
              <textarea v-model="inputText" placeholder="输入测试消息..." rows="4"></textarea>
            </div>
            <button class="pill-button" :disabled="testLoading || !inputText.trim()" @click="sendTest">
              {{ testLoading ? '请求中...' : '发送请求' }}
            </button>
            <div v-if="requestUrl" class="request-url">POST {{ requestUrl }}</div>
          </div>
          <div v-if="responseText" class="response-card">
            <h4 class="section-title">响应结果</h4>
            <div class="response-scroll"><pre>{{ responseText }}</pre></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-scroll-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 98%;
}

.demo-page .data-panel {
  background: var(--bg-panel);
  backdrop-filter: none;
}

.demo-page .toolbar :deep(.app-select-trigger),
.demo-page .toolbar :deep(.app-select-value),
.demo-page .toolbar :deep(.app-select-option) { font-size: 14px; }
.demo-page .toolbar { font-size: 16px; }
.demo-page .toolbar-hint { font-size: 13px; color: var(--text-muted); margin-left: 0.75rem; }

/* layout */
.demo-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding: 0 0.75rem 1.5rem 0.75rem;
  min-height: 0;
}
.demo-left, .demo-right {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
}

/* card base */
.info-card, .test-card {
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 0.625rem;
  padding: 1rem;
}
.test-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 0.625rem;
  padding: 1rem;
}

/* provider hero */
.provider-hero {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin: -1rem -1rem 0.875rem -1rem;
  padding: 1rem;
  border-radius: 0.625rem 0.625rem 0 0;
  border-bottom: 1px solid var(--line);
}
.provider-logo {
  width: 2.25rem;
  height: 2.25rem;
  object-fit: contain;
  border-radius: 6px;
  filter: drop-shadow(0 0 6px var(--glow, transparent));
}
.hero-info { display: flex; flex-direction: column; gap: 0.1rem; }
.hero-name { font-size: 15px; font-weight: 700; color: var(--text-main); }
.hero-model { font-size: 12px; color: var(--text-muted); font-family: ui-monospace, monospace; }

/* detail grid */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 0.75rem;
}
.detail-item.full { grid-column: 1 / -1; }
.detail-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 0.1rem;
}
.detail-value {
  font-size: 14px;
  color: var(--text-main);
}
.detail-value.mono {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  word-break: break-all;
}

.copy-btn {
  margin-left: 0.5rem;
  padding: 0 0.4rem;
  font-size: 11px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  vertical-align: middle;
}
.copy-btn:hover {
  color: var(--text-main);
  border-color: var(--text-main);
}

/* section title */
.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--text-main);
}

/* endpoint table */
.endpoint-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.endpoint-table th {
  text-align: left;
  font-size: 13px;
  color: var(--text-muted);
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--line);
}
.endpoint-table td {
  padding: 0.4rem 0.5rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--line);
}
.endpoint-table td.mono { font-family: ui-monospace, monospace; font-size: 12px; }
.method-col { width: 4rem; }

.method-badge {
  display: inline-block;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}
.method-badge.post { background: rgba(34,197,94,0.15); color: #22c55e; }
.method-badge.get { background: rgba(59,130,246,0.15); color: #3b82f6; }

/* test card */
.test-input-row textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 0.375rem;
  padding: 0.5rem;
  font-size: 14px;
  color: var(--text-main);
  font-family: inherit;
}
.test-input-row textarea:focus {
  outline: none;
  border-color: var(--text-muted);
}

.request-url {
  font-size: 11px;
  color: var(--text-muted);
  font-family: ui-monospace, monospace;
  word-break: break-all;
  padding: 0.25rem 0;
}

.response-card {
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 0.625rem;
  padding: 0.75rem;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.response-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.response-scroll pre {
  margin: 0;
  font-size: 13px;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: ui-monospace, monospace;
}

.response-card {
  background: var(--bg-panel);
  border: 1px solid var(--line);
  border-radius: 0.625rem;
  padding: 0.75rem;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.response-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.response-scroll pre {
  margin: 0;
  font-size: 13px;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: ui-monospace, monospace;
}
</style>
