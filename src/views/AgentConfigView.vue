<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import AppSelect from '../components/AppSelect.vue'
import deepseekLogo from '../assets/providers/deepseek-logo.svg'
import ollamaLogo from '../assets/providers/ollama-logo.png'
import openaiSymbol from '../assets/providers/openai-symbol.svg'
import qianfanLogo from '../assets/providers/qianfan-logo.png'
import qwenBackground from '../assets/providers/qwen-background.webp'
import qwenLogo from '../assets/providers/qwen-logo.png'
import zhipuBackground from '../assets/providers/zhipu-background.png'
import zhipuLogo from '../assets/providers/zhipu-logo.svg'

const MODULE_TYPE_OPTIONS = [
  { label: '语言模型', value: 'language' },
  { label: '向量模型', value: 'embedding' }
]

const FILTER_MODULE_TYPE_OPTIONS = [{ label: '全部类型', value: '' }, ...MODULE_TYPE_OPTIONS]

const PROVIDER_TYPE_OPTIONS = [
  { label: '全部类型', value: '' },
  { label: '语言模型', value: 'language' },
  { label: '向量模型', value: 'embedding' }
]

const PROVIDERS = [
  {
    code: 'deepseek',
    name: 'DeepSeek',
    badge: 'DS',
    defaultDomain: 'https://api.deepseek.com',
    types: ['language'],
    accent: '#4f6dff',
    surfaceStart: 'rgba(79, 109, 255, 0.18)',
    surfaceEnd: 'rgba(79, 109, 255, 0.03)',
    iconGlow: 'rgba(79, 109, 255, 0.2)',
    icon: deepseekLogo,
    background: deepseekLogo,
    backgroundSize: '70%',
    backgroundPosition: 'right -1rem bottom -1.2rem'
  },
  {
    code: 'ollama',
    name: 'Ollama',
    badge: 'OL',
    defaultDomain: 'http://127.0.0.1:11434',
    types: ['language', 'embedding'],
    accent: '#20242f',
    surfaceStart: 'rgba(32, 36, 47, 0.16)',
    surfaceEnd: 'rgba(32, 36, 47, 0.03)',
    iconGlow: 'rgba(32, 36, 47, 0.14)',
    icon: ollamaLogo,
    background: ollamaLogo,
    backgroundSize: '58%',
    backgroundPosition: 'right -0.4rem bottom -1rem'
  },
  {
    code: 'openai',
    name: 'OpenAI',
    badge: 'OA',
    defaultDomain: 'https://api.openai.com/v1',
    types: ['language', 'embedding'],
    accent: '#111111',
    surfaceStart: 'rgba(17, 17, 17, 0.12)',
    surfaceEnd: 'rgba(17, 17, 17, 0.02)',
    iconGlow: 'rgba(17, 17, 17, 0.12)',
    icon: openaiSymbol,
    background: openaiSymbol,
    backgroundSize: '44%',
    backgroundPosition: 'right 1.25rem bottom 1rem'
  },
  {
    code: 'tongyi',
    name: '通义千问',
    badge: 'TY',
    defaultDomain: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    types: ['language', 'embedding'],
    accent: '#5a54ff',
    surfaceStart: 'rgba(90, 84, 255, 0.2)',
    surfaceEnd: 'rgba(90, 84, 255, 0.04)',
    iconGlow: 'rgba(90, 84, 255, 0.18)',
    icon: qwenLogo,
    background: qwenBackground,
    backgroundSize: '150%',
    backgroundPosition: 'center center'
  },
  {
    code: 'qianfan',
    name: '千帆大模型',
    badge: 'QF',
    defaultDomain: 'https://qianfan.baidubce.com/v2',
    types: ['language', 'embedding'],
    accent: '#2688ff',
    surfaceStart: 'rgba(38, 136, 255, 0.18)',
    surfaceEnd: 'rgba(38, 136, 255, 0.04)',
    iconGlow: 'rgba(38, 136, 255, 0.18)',
    icon: qianfanLogo,
    background: qianfanLogo,
    backgroundSize: '74%',
    backgroundPosition: 'right 0.25rem bottom 1.1rem'
  },
  {
    code: 'zhipu',
    name: '智谱 AI',
    badge: 'ZP',
    defaultDomain: 'https://open.bigmodel.cn/api/paas/v4',
    types: ['language', 'embedding'],
    accent: '#2f8374',
    surfaceStart: 'rgba(47, 131, 116, 0.18)',
    surfaceEnd: 'rgba(47, 131, 116, 0.03)',
    iconGlow: 'rgba(47, 131, 116, 0.16)',
    icon: zhipuLogo,
    background: zhipuBackground,
    backgroundSize: 'cover',
    backgroundPosition: 'center center'
  }
]

const rows = ref([])
const roleOptions = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const providerDialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const showApiKey = ref(false)
const providerFilter = ref('')

const filters = reactive({
  keyword: '',
  moduleType: ''
})

const form = reactive(createEmptyForm())

const providerMap = Object.fromEntries(PROVIDERS.map((provider) => [provider.code, provider]))

const selectedProvider = computed(() => resolveProvider(form.providerCode))

const availableModuleTypeOptions = computed(() => {
  if (!selectedProvider.value) {
    return MODULE_TYPE_OPTIONS
  }
  return MODULE_TYPE_OPTIONS.filter((option) => selectedProvider.value.types.includes(option.value))
})

const filteredProviders = computed(() => {
  if (!providerFilter.value) {
    return PROVIDERS
  }
  return PROVIDERS.filter((provider) => provider.types.includes(providerFilter.value))
})

onMounted(() => {
  loadAll()
})

function createEmptyForm() {
  return {
    name: '',
    providerCode: '',
    moduleType: 'language',
    baseModel: '',
    apiDomain: '',
    apiKey: '',
    remark: '',
    roleIds: []
  }
}

function resetForm() {
  Object.assign(form, createEmptyForm())
  editingId.value = null
  showApiKey.value = false
  providerDialogVisible.value = false
  providerFilter.value = ''
}

function resetFilters() {
  filters.keyword = ''
  filters.moduleType = ''
  loadAll()
}

function resolveProvider(code) {
  return providerMap[code] || null
}

function providerStyle(code) {
  const provider = resolveProvider(code)
  return {
    '--provider-accent': provider?.accent || '#2f8374',
    '--provider-surface-start': provider?.surfaceStart || 'rgba(47, 131, 116, 0.16)',
    '--provider-surface-end': provider?.surfaceEnd || 'rgba(47, 131, 116, 0.03)',
    '--provider-icon-glow': provider?.iconGlow || 'rgba(47, 131, 116, 0.16)',
    '--provider-art': provider?.background ? `url("${provider.background}")` : 'none',
    '--provider-art-size': provider?.backgroundSize || '60%',
    '--provider-art-position': provider?.backgroundPosition || 'right -0.75rem bottom -0.75rem'
  }
}

function moduleTypeLabel(value) {
  return MODULE_TYPE_OPTIONS.find((item) => item.value === value)?.label || value
}

function providerNameText(row) {
  return row.providerName || resolveProvider(row.providerCode)?.name || '--'
}

function roleText(row) {
  return row.roleNames?.length ? row.roleNames.join('、') : '未绑定角色'
}

function hasRole(roleId) {
  return form.roleIds.includes(roleId)
}

function toggleRole(roleId) {
  if (hasRole(roleId)) {
    form.roleIds = form.roleIds.filter((id) => id !== roleId)
    return
  }
  form.roleIds = [...form.roleIds, roleId]
}

async function loadAll() {
  loading.value = true
  try {
    const query = new URLSearchParams()
    if (filters.keyword.trim()) {
      query.set('keyword', filters.keyword.trim())
    }
    if (filters.moduleType) {
      query.set('moduleType', filters.moduleType)
    }
    const suffix = query.toString() ? `?${query.toString()}` : ''

    const [modules, roles] = await Promise.all([
      api.get(`/api/agent-modules${suffix}`),
      api.get('/api/roles?status=1')
    ])

    rows.value = modules
    roleOptions.value = roles
  } catch (error) {
    window.alert(error.message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  resetForm()
  editingId.value = row.id
  Object.assign(form, {
    name: row.name || '',
    providerCode: row.providerCode || '',
    moduleType: row.moduleType || 'language',
    baseModel: row.baseModel || '',
    apiDomain: row.apiDomain || '',
    apiKey: row.apiKey || '',
    remark: row.remark || '',
    roleIds: [...(row.roleIds || [])]
  })
  dialogVisible.value = true
}

function openProviderPicker() {
  providerDialogVisible.value = true
}

function selectProvider(provider) {
  form.providerCode = provider.code
  if (!provider.types.includes(form.moduleType)) {
    form.moduleType = provider.types[0]
  }
  form.apiDomain = provider.defaultDomain
  providerDialogVisible.value = false
}

function validateForm() {
  if (!form.name.trim()) {
    window.alert('请输入模块名称')
    return false
  }
  if (!form.providerCode) {
    window.alert('请选择供应商')
    return false
  }
  if (!form.moduleType) {
    window.alert('请选择模块类型')
    return false
  }
  if (!form.baseModel.trim()) {
    window.alert('请输入基础模型')
    return false
  }
  if (!form.apiDomain.trim()) {
    window.alert('请输入 API 域名')
    return false
  }
  if (!form.apiKey.trim()) {
    window.alert('请输入 API Key')
    return false
  }
  if (!form.roleIds.length) {
    window.alert('请至少绑定一个角色')
    return false
  }
  return true
}

async function submitForm() {
  if (!validateForm()) {
    return
  }

  const payload = {
    name: form.name.trim(),
    providerCode: form.providerCode,
    moduleType: form.moduleType,
    baseModel: form.baseModel.trim(),
    apiDomain: form.apiDomain.trim(),
    apiKey: form.apiKey.trim(),
    remark: form.remark.trim(),
    roleIds: [...form.roleIds]
  }

  submitting.value = true
  try {
    if (editingId.value) {
      await api.put(`/api/agent-modules/${editingId.value}`, payload)
    } else {
      await api.post('/api/agent-modules', payload)
    }
    dialogVisible.value = false
    resetForm()
    await loadAll()
  } catch (error) {
    window.alert(error.message)
  } finally {
    submitting.value = false
  }
}

async function removeRow(row) {
  if (!window.confirm(`确认删除大模型“${row.name}”吗？`)) {
    return
  }
  try {
    await api.delete(`/api/agent-modules/${row.id}`)
    await loadAll()
  } catch (error) {
    window.alert(error.message)
  }
}
</script>

<template>
  <div>
    <section class="data-panel glass-card agent-panel">
      <!-- <div class="section-title">
        <div>
          <h2>智能体平台</h2>
          <p>按卡片展示大模型，每行 4 个模块，仅展示模型名称、供应商和绑定角色。</p>
        </div>
      </div> -->

      <div class="toolbar">
        <input v-model="filters.keyword" placeholder="搜索模块名称 / 供应商 / 角色" />
        <AppSelect
          v-model="filters.moduleType"
          :options="FILTER_MODULE_TYPE_OPTIONS"
          placeholder="全部类型"
        />
        <button class="pill-button secondary" @click="loadAll">查询</button>
        <button class="pill-button ghost" @click="resetFilters">重置</button>
        <span class="toolbar-spacer"></span>
        <button class="pill-button" @click="openCreate">添加大模型</button>
      </div>

      <div v-if="loading" class="empty-state">数据加载中...</div>

      <div v-else-if="rows.length" class="module-grid">
        <article
          v-for="row in rows"
          :key="row.id"
          class="module-card"
          :style="providerStyle(row.providerCode)"
        >
          <div class="module-card-top">
            <div class="module-provider-icon">
              <img
                v-if="resolveProvider(row.providerCode)?.icon"
                :src="resolveProvider(row.providerCode)?.icon"
                :alt="providerNameText(row)"
              />
              <span v-else>{{ resolveProvider(row.providerCode)?.badge || 'AI' }}</span>
            </div>

            <div class="module-card-actions">
              <button class="tiny-button" @click="openEdit(row)">编辑</button>
              <button class="tiny-button danger" @click="removeRow(row)">删除</button>
            </div>
          </div>

          <div class="module-card-body">
            <h3 class="module-name" :title="row.name">{{ row.name }}</h3>

            <div class="module-meta">
              <span class="module-meta-label">供应商</span>
              <strong class="module-meta-value module-ellipsis" :title="providerNameText(row)">
                {{ providerNameText(row) }}
              </strong>
            </div>

            <div class="module-meta">
              <span class="module-meta-label">角色</span>
              <strong class="module-meta-value module-role-text" :title="roleText(row)">
                {{ roleText(row) }}
              </strong>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">暂无大模型数据</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card agent-modal-panel">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">{{ editingId ? '编辑大模型' : '新增大模型' }}</h3>
              <p class="modal-subtext">
                每个大模型至少绑定一个角色，可以绑定单个角色，也可以绑定多个角色。
              </p>
            </div>
            <button class="pill-button ghost" @click="dialogVisible = false">关闭</button>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>模块名称</span>
              <input v-model="form.name" placeholder="请输入模块名称" />
            </label>

            <div class="field">
              <span>供应商</span>
              <button
                type="button"
                class="provider-trigger"
                :style="selectedProvider ? providerStyle(selectedProvider.code) : undefined"
                @click="openProviderPicker"
              >
                <span class="provider-trigger-main">
                  <span class="provider-trigger-icon">
                    <img
                      v-if="selectedProvider?.icon"
                      :src="selectedProvider.icon"
                      :alt="selectedProvider.name"
                    />
                    <span v-else>{{ selectedProvider?.badge || 'AI' }}</span>
                  </span>
                  <span :class="{ placeholder: !selectedProvider }">
                    {{ selectedProvider?.name || '请选择供应商' }}
                  </span>
                </span>
                <span class="provider-trigger-text">选择</span>
              </button>
            </div>

            <div class="field">
              <span>模块类型</span>
              <AppSelect
                v-model="form.moduleType"
                :options="availableModuleTypeOptions"
                placeholder="请选择模块类型"
              />
            </div>

            <label class="field">
              <span>基础模型</span>
              <input v-model="form.baseModel" placeholder="例如 deepseek-chat / text-embedding-3-small" />
            </label>

            <label class="field full">
              <span>API 域名</span>
              <input v-model="form.apiDomain" placeholder="请输入 API 域名" />
            </label>

            <div class="field full">
              <span>API Key</span>
              <div class="api-key-wrap">
                <input
                  v-model="form.apiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  placeholder="请输入 API Key"
                />
                <button type="button" class="tiny-button" @click="showApiKey = !showApiKey">
                  {{ showApiKey ? '隐藏' : '显示' }}
                </button>
              </div>
            </div>

            <div class="field full">
              <span>绑定角色</span>
              <div class="role-picker">
                <div v-if="roleOptions.length" class="role-option-grid">
                  <button
                    v-for="role in roleOptions"
                    :key="role.id"
                    type="button"
                    class="role-option"
                    :class="{ active: hasRole(role.id) }"
                    :aria-pressed="hasRole(role.id)"
                    @click="toggleRole(role.id)"
                  >
                    <span>{{ role.name }}</span>
                  </button>
                </div>
                <div v-else class="field-hint">暂无可绑定角色，请先在角色管理中创建角色。</div>
              </div>
            </div>

            <label class="field full">
              <span>备注</span>
              <textarea v-model="form.remark" placeholder="补充模块说明"></textarea>
            </label>
          </div>

          <div class="modal-actions">
            <button class="pill-button ghost" @click="dialogVisible = false">取消</button>
            <button class="pill-button" :disabled="submitting" @click="submitForm">
              {{ submitting ? '提交中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="providerDialogVisible"
        class="modal-mask"
        @click.self="providerDialogVisible = false"
      >
        <div class="modal-panel glass-card provider-modal-panel">
          <div class="modal-header provider-modal-header">
            <div>
              <h3 style="margin: 0">选择供应商</h3>
              <p class="modal-subtext">点选供应商后自动回填默认域名，并按类型过滤可选项。</p>
            </div>
            <div class="provider-filter">
              <AppSelect
                v-model="providerFilter"
                :options="PROVIDER_TYPE_OPTIONS"
                placeholder="全部类型"
              />
              <button class="pill-button ghost" @click="providerDialogVisible = false">关闭</button>
            </div>
          </div>

          <div class="provider-grid">
            <button
              v-for="provider in filteredProviders"
              :key="provider.code"
              type="button"
              class="provider-card"
              :class="{ active: provider.code === form.providerCode }"
              :style="providerStyle(provider.code)"
              @click="selectProvider(provider)"
            >
              <span class="provider-card-icon">
                <img v-if="provider.icon" :src="provider.icon" :alt="provider.name" />
                <span v-else>{{ provider.badge }}</span>
              </span>
              <div class="provider-card-copy">
                <strong>{{ provider.name }}</strong>
                <p>{{ provider.types.map(moduleTypeLabel).join(' / ') }}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.agent-panel {
  border-radius: var(--radius-xl);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: calc(18px * var(--ui-scale));
}

.module-card {
  --provider-accent: #2f8374;
  --provider-surface-start: rgba(47, 131, 116, 0.16);
  --provider-surface-end: rgba(47, 131, 116, 0.03);
  --provider-icon-glow: rgba(47, 131, 116, 0.16);
  --provider-art: none;
  --provider-art-size: 60%;
  --provider-art-position: right -0.75rem bottom -0.75rem;
  position: relative;
  min-width: 0;
  min-height: calc(236px * var(--ui-scale));
  display: flex;
  flex-direction: column;
  gap: calc(18px * var(--ui-scale));
  padding: calc(20px * var(--ui-scale));
  border-radius: calc(28px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 248, 254, 0.9)),
    linear-gradient(145deg, var(--provider-surface-start), var(--provider-surface-end));
  box-shadow:
    0 18px 38px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  overflow: hidden;
  isolation: isolate;
}

.module-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--provider-art);
  background-repeat: no-repeat;
  background-size: var(--provider-art-size);
  background-position: var(--provider-art-position);
  opacity: 0.12;
  pointer-events: none;
  z-index: 0;
}

.module-card::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.48), transparent 40%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent 55%);
  pointer-events: none;
  z-index: 0;
}

.module-card > * {
  position: relative;
  z-index: 1;
}

.module-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(12px * var(--ui-scale));
}

.module-provider-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(60px * var(--ui-scale));
  height: calc(60px * var(--ui-scale));
  padding: calc(10px * var(--ui-scale));
  border-radius: calc(20px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow:
    0 16px 30px var(--provider-icon-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.module-provider-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.module-provider-icon span {
  color: var(--provider-accent);
  font-size: calc(16px * var(--ui-scale));
  font-weight: 800;
  letter-spacing: 0.06em;
}

.module-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: calc(8px * var(--ui-scale));
  justify-content: flex-end;
}

.module-card-actions .tiny-button {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(27, 37, 54, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.module-card-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(14px * var(--ui-scale));
  flex: 1 1 auto;
}

.module-name {
  margin: 0;
  min-width: 0;
  font-size: calc(22px * var(--ui-scale));
  line-height: 1.3;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-meta {
  min-width: 0;
  padding: calc(14px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.06);
  background: rgba(255, 255, 255, 0.74);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 10px 22px rgba(29, 35, 52, 0.04);
}

.module-meta-label {
  display: block;
  margin-bottom: calc(8px * var(--ui-scale));
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
  letter-spacing: 0.04em;
}

.module-meta-value {
  display: block;
  min-width: 0;
  color: var(--text-main);
  font-size: calc(14px * var(--ui-scale));
  line-height: 1.55;
}

.module-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-role-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.agent-modal-panel {
  width: min(62rem, 100%);
}

.provider-trigger {
  width: 100%;
  min-height: calc(48px * var(--ui-scale));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(10px * var(--ui-scale));
  padding: calc(11px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.1);
  border-radius: calc(16px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-main);
  text-align: left;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.provider-trigger-main {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: calc(12px * var(--ui-scale));
}

.provider-trigger-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(42px * var(--ui-scale));
  height: calc(42px * var(--ui-scale));
  padding: calc(8px * var(--ui-scale));
  border-radius: calc(14px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(27, 37, 54, 0.08);
  box-shadow: 0 12px 24px var(--provider-icon-glow);
}

.provider-trigger-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.provider-trigger-icon span {
  color: var(--provider-accent);
  font-size: calc(13px * var(--ui-scale));
  font-weight: 800;
}

.provider-trigger .placeholder {
  color: var(--text-muted);
}

.provider-trigger-text {
  flex: 0 0 auto;
  color: var(--provider-accent);
  font-weight: 700;
}

.api-key-wrap {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--ui-scale));
}

.api-key-wrap input {
  flex: 1 1 auto;
}

.role-picker {
  display: grid;
  gap: calc(10px * var(--ui-scale));
}

.role-option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: calc(12px * var(--ui-scale));
}

.role-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: calc(46px * var(--ui-scale));
  padding: calc(10px * var(--ui-scale)) calc(16px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  border-radius: calc(16px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-main);
  font-weight: 600;
  line-height: 1.4;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    color 0.18s ease;
}

.role-option:hover {
  transform: translateY(-1px);
  border-color: rgba(47, 131, 116, 0.22);
  box-shadow: 0 12px 26px rgba(47, 131, 116, 0.08);
}

.role-option.active {
  border-color: rgba(47, 131, 116, 0.26);
  background: linear-gradient(135deg, rgba(47, 131, 116, 0.16), rgba(237, 124, 71, 0.14));
  color: #1f5e53;
  box-shadow:
    0 12px 24px rgba(47, 131, 116, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.field-hint {
  color: var(--text-muted);
  line-height: 1.7;
}

.provider-modal-panel {
  width: min(54rem, 100%);
}

.provider-modal-header {
  align-items: center;
}

.provider-filter {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--ui-scale));
  flex-wrap: wrap;
}

.provider-filter :deep(.app-select) {
  width: 12rem;
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(12px * var(--ui-scale));
}

.provider-card {
  --provider-accent: #2f8374;
  --provider-icon-glow: rgba(47, 131, 116, 0.16);
  --provider-art: none;
  --provider-art-size: 64%;
  --provider-art-position: right -0.75rem bottom -0.75rem;
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(14px * var(--ui-scale));
  min-height: calc(96px * var(--ui-scale));
  padding: calc(16px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  border-radius: calc(20px * var(--ui-scale));
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(247, 249, 253, 0.88)),
    linear-gradient(140deg, var(--provider-surface-start), var(--provider-surface-end));
  color: var(--text-main);
  text-align: left;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
  overflow: hidden;
  isolation: isolate;
}

.provider-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--provider-art);
  background-repeat: no-repeat;
  background-size: var(--provider-art-size);
  background-position: var(--provider-art-position);
  opacity: 0.08;
  pointer-events: none;
  z-index: 0;
}

.provider-card > * {
  position: relative;
  z-index: 1;
}

.provider-card:hover {
  transform: translateY(-2px);
  border-color: rgba(27, 37, 54, 0.14);
  box-shadow: 0 16px 30px rgba(29, 35, 52, 0.08);
}

.provider-card.active {
  border-color: var(--provider-accent);
  box-shadow:
    0 16px 30px rgba(29, 35, 52, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.72);
}

.provider-card-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(54px * var(--ui-scale));
  height: calc(54px * var(--ui-scale));
  padding: calc(10px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.84);
  box-shadow:
    0 14px 24px var(--provider-icon-glow),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.provider-card-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.provider-card-icon span {
  color: var(--provider-accent);
  font-weight: 800;
}

.provider-card-copy {
  min-width: 0;
}

.provider-card strong {
  display: block;
  font-size: calc(18px * var(--ui-scale));
}

.provider-card p {
  margin: calc(8px * var(--ui-scale)) 0 0;
  color: var(--text-muted);
}

@media (max-width: 1320px) {
  .module-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .provider-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .module-grid {
    grid-template-columns: 1fr;
  }

  .api-key-wrap {
    flex-direction: column;
    align-items: stretch;
  }

  .provider-filter {
    width: 100%;
  }

  .provider-filter :deep(.app-select) {
    width: 100%;
  }

  .provider-trigger {
    align-items: flex-start;
  }
}
</style>
