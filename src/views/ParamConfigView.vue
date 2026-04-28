<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import AppSelect from '../components/AppSelect.vue'
import { formatDateTime } from '../utils/format'

const PRESET_PARAM_TYPES = [
  { label: '生成参数', value: 'generation' },
  { label: 'Prompt 参数', value: 'prompt' },
  { label: '检索参数', value: 'retrieval' },
  { label: '工具参数', value: 'tool' },
  { label: '安全参数', value: 'guardrail' }
]

const rows = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)

const filters = reactive({
  keyword: '',
  paramType: ''
})

const form = reactive(createEmptyForm())

const filterParamTypeOptions = computed(() => {
  const options = [{ label: '全部类型', value: '' }]
  const seen = new Set([''])

  PRESET_PARAM_TYPES.forEach((item) => {
    if (!seen.has(item.value)) {
      seen.add(item.value)
      options.push(item)
    }
  })

  rows.value.forEach((item) => {
    const value = String(item.paramType || '').trim()
    if (value && !seen.has(value)) {
      seen.add(value)
      options.push({
        label: resolveParamTypeText(value),
        value
      })
    }
  })

  if (filters.paramType && !seen.has(filters.paramType)) {
    options.push({
      label: resolveParamTypeText(filters.paramType),
      value: filters.paramType
    })
  }

  return options
})

onMounted(() => {
  loadData()
})

function createEmptyForm() {
  return {
    paramType: 'generation',
    name: '',
    code: '',
    paramValue: ''
  }
}

function resetForm() {
  Object.assign(form, createEmptyForm())
  editingId.value = null
}

function closeDialog() {
  dialogVisible.value = false
  resetForm()
}

function resetFilters() {
  filters.keyword = ''
  filters.paramType = ''
  loadData()
}

function resolveParamTypeText(value) {
  return PRESET_PARAM_TYPES.find((item) => item.value === value)?.label || value || '--'
}

async function loadData() {
  loading.value = true
  try {
    const query = new URLSearchParams()
    if (filters.keyword.trim()) {
      query.set('keyword', filters.keyword.trim())
    }
    if (filters.paramType) {
      query.set('paramType', filters.paramType)
    }
    const suffix = query.toString() ? `?${query.toString()}` : ''
    rows.value = await api.get(`/api/param-configs${suffix}`)
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
  editingId.value = row.id
  Object.assign(form, {
    paramType: row.paramType || '',
    name: row.name || '',
    code: row.code || '',
    paramValue: row.paramValue || ''
  })
  dialogVisible.value = true
}

function setParamType(value) {
  form.paramType = value
}

function validateForm() {
  if (!form.paramType.trim()) {
    window.alert('请输入参数类型')
    return false
  }
  if (!form.name.trim()) {
    window.alert('请输入参数名称')
    return false
  }
  if (!form.code.trim()) {
    window.alert('请输入参数编码')
    return false
  }
  if (!form.paramValue.trim()) {
    window.alert('请输入参数值')
    return false
  }
  return true
}

async function submitForm() {
  if (!validateForm()) {
    return
  }

  const payload = {
    paramType: form.paramType.trim(),
    name: form.name.trim(),
    code: form.code.trim(),
    paramValue: form.paramValue.trim()
  }

  submitting.value = true
  try {
    if (editingId.value) {
      await api.put(`/api/param-configs/${editingId.value}`, payload)
    } else {
      await api.post('/api/param-configs', payload)
    }
    closeDialog()
    await loadData()
  } catch (error) {
    window.alert(error.message)
  } finally {
    submitting.value = false
  }
}

async function removeRow(row) {
  if (!window.confirm(`确认删除参数“${row.name}”吗？`)) {
    return
  }

  try {
    await api.delete(`/api/param-configs/${row.id}`)
    await loadData()
  } catch (error) {
    window.alert(error.message)
  }
}
</script>

<template>
  <div class="admin-scroll-page">
    <section class="data-panel glass-card admin-scroll-panel">
      <div class="toolbar">
        <input v-model="filters.keyword" placeholder="搜索参数名称 / 编码 / 类型" />
        <AppSelect
          v-model="filters.paramType"
          :options="filterParamTypeOptions"
          placeholder="全部类型"
        />
        <button class="pill-button secondary" @click="loadData">查询</button>
        <button class="pill-button ghost" @click="resetFilters">重置</button>
        <span class="toolbar-spacer"></span>
        <button class="pill-button" @click="openCreate">新增参数</button>
      </div>

      <div v-if="loading" class="empty-state panel-empty-state">数据加载中...</div>

      <div v-else-if="rows.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>参数名称</th>
              <th>参数编码</th>
              <th>参数类型</th>
              <th>参数值</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ row.name }}</td>
              <td>
                <code class="param-code">{{ row.code }}</code>
              </td>
              <td>
                <span class="param-type-tag">
                  {{ resolveParamTypeText(row.paramType) }}
                </span>
              </td>
              <td>
                <div class="param-value-preview" :title="row.paramValue">
                  {{ row.paramValue }}
                </div>
              </td>
              <td>{{ formatDateTime(row.updatedAt || row.createdAt) }}</td>
              <td>
                <div class="action-group">
                  <button class="tiny-button" @click="openEdit(row)">编辑</button>
                  <button class="tiny-button danger" @click="removeRow(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state panel-empty-state">暂无参数配置数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="closeDialog">
        <div class="modal-panel glass-card">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">{{ editingId ? '编辑参数' : '新增参数' }}</h3>
              <p class="modal-subtext">
                支持配置模型生成参数、Prompt 片段、检索阈值等内容，参数值可填写纯文本或 JSON。
              </p>
            </div>
            <button class="pill-button ghost" @click="closeDialog">关闭</button>
          </div>

          <div class="form-grid">
            <div class="field full">
              <span>参数类型</span>
              <div class="param-type-body">
                <input
                  v-model="form.paramType"
                  placeholder="例如 generation / prompt / retrieval"
                />
                <div class="type-chip-row">
                  <button
                    v-for="item in PRESET_PARAM_TYPES"
                    :key="item.value"
                    type="button"
                    class="type-chip"
                    :class="{ active: form.paramType === item.value }"
                    @click="setParamType(item.value)"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </div>

            <label class="field">
              <span>参数名称</span>
              <input v-model="form.name" placeholder="例如 Temperature" />
            </label>

            <label class="field">
              <span>参数编码</span>
              <input v-model="form.code" placeholder="例如 TEMPERATURE" />
            </label>

            <label class="field full">
              <span>参数值</span>
              <textarea
                v-model="form.paramValue"
                placeholder='支持文本或 JSON，例如 {"temperature":0.7,"top_p":0.9}'
              ></textarea>
            </label>
          </div>

          <div class="modal-actions">
            <button class="pill-button ghost" @click="closeDialog">取消</button>
            <button class="pill-button" :disabled="submitting" @click="submitForm">
              {{ submitting ? '提交中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.param-code {
  display: inline-flex;
  align-items: center;
  padding: calc(6px * var(--ui-scale)) calc(10px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(27, 37, 54, 0.06);
  color: var(--text-main);
  font-family: Consolas, 'Courier New', monospace;
  font-size: calc(12px * var(--ui-scale));
  word-break: break-all;
}

.param-type-tag {
  display: inline-flex;
  align-items: center;
  padding: calc(5px * var(--ui-scale)) calc(10px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.12);
  color: var(--brand-alt);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 600;
}

.param-value-preview {
  min-width: 16rem;
  max-width: 32rem;
  padding: calc(10px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: calc(14px * var(--ui-scale));
  background: rgba(27, 37, 54, 0.05);
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
  font-family: Consolas, 'Courier New', monospace;
  font-size: calc(12px * var(--ui-scale));
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.param-type-body {
  display: grid;
  gap: calc(12px * var(--ui-scale));
}

.type-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: calc(10px * var(--ui-scale));
}

.type-chip {
  border: 1px solid rgba(27, 37, 54, 0.08);
  border-radius: 999px;
  padding: calc(8px * var(--ui-scale)) calc(12px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.88);
  color: var(--text-main);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.type-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(47, 131, 116, 0.22);
  box-shadow: 0 10px 20px rgba(47, 131, 116, 0.08);
}

.type-chip.active {
  border-color: rgba(47, 131, 116, 0.28);
  background: linear-gradient(135deg, rgba(47, 131, 116, 0.14), rgba(237, 124, 71, 0.12));
  color: #1f5e53;
  font-weight: 600;
}

@media (max-width: 960px) {
  .param-value-preview {
    min-width: 12rem;
    max-width: 100%;
  }
}
</style>
