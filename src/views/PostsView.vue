<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import AppSelect from '../components/AppSelect.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { formatDateTime } from '../utils/format'

const rows = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const deleteDialogVisible = ref(false)
const deleting = ref(false)
const pendingDeleteRow = ref(null)

const filters = reactive({
  keyword: '',
  status: ''
})

const form = reactive(createEmptyForm())

const filterStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '启用', value: '1' },
  { label: '停用', value: '0' }
]

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 }
]

const summary = computed(() => ({
  total: rows.value.length,
  active: rows.value.filter((item) => item.status === 1).length,
  inactive: rows.value.filter((item) => item.status === 0).length
}))

const deleteMessage = computed(() => {
  const row = pendingDeleteRow.value
  return row ? `确认删除岗位「${row.name}」吗？` : ''
})

onMounted(() => {
  loadData()
})

function createEmptyForm() {
  return {
    name: '',
    code: '',
    status: 1,
    remark: ''
  }
}

function resetForm() {
  Object.assign(form, createEmptyForm())
  editingId.value = null
}

async function loadData() {
  loading.value = true
  try {
    const query = new URLSearchParams()
    if (filters.keyword) {
      query.set('keyword', filters.keyword)
    }
    if (filters.status !== '') {
      query.set('status', filters.status)
    }
    const suffix = query.toString() ? `?${query.toString()}` : ''
    rows.value = await api.get(`/api/posts${suffix}`)
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
    name: row.name,
    code: row.code,
    status: row.status,
    remark: row.remark || ''
  })
  dialogVisible.value = true
}

async function submitForm() {
  submitting.value = true
  try {
    if (editingId.value) {
      await api.put(`/api/posts/${editingId.value}`, form)
    } else {
      await api.post('/api/posts', form)
    }
    dialogVisible.value = false
    resetForm()
    await loadData()
  } catch (error) {
    window.alert(error.message)
  } finally {
    submitting.value = false
  }
}

function openRemoveDialog(row) {
  pendingDeleteRow.value = row
  deleteDialogVisible.value = true
}

function closeRemoveDialog() {
  deleteDialogVisible.value = false
  pendingDeleteRow.value = null
}

async function confirmRemove() {
  const row = pendingDeleteRow.value
  if (!row) {
    return
  }

  deleting.value = true
  try {
    await api.delete(`/api/posts/${row.id}`)
    closeRemoveDialog()
    await loadData()
  } catch (error) {
    window.alert(error.message)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="admin-scroll-page">
    <div class="stats-grid">
      <article class="stats-card">
        <span>岗位总数</span>
        <strong>{{ summary.total }}</strong>
      </article>
      <article class="stats-card">
        <span>启用岗位</span>
        <strong>{{ summary.active }}</strong>
      </article>
      <article class="stats-card">
        <span>停用岗位</span>
        <strong>{{ summary.inactive }}</strong>
      </article>
    </div>

    <section class="data-panel glass-card admin-scroll-panel">
      <div class="toolbar">
        <input v-model="filters.keyword" placeholder="搜索岗位名称 / 编码" />
        <AppSelect v-model="filters.status" :options="filterStatusOptions" placeholder="全部状态" />
        <button class="pill-button secondary" @click="loadData">查询</button>
        <button
          class="pill-button ghost"
          @click="
            filters.keyword = '';
            filters.status = '';
            loadData();
          "
        >
          重置
        </button>
        <span class="toolbar-spacer"></span>
        <button class="pill-button" @click="openCreate">新增</button>
      </div>

      <div v-if="loading" class="empty-state panel-empty-state">数据加载中...</div>

      <div v-else-if="rows.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>岗位名称</th>
              <th>岗位编码</th>
              <th>状态</th>
              <th>备注</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ row.name }}</td>
              <td>{{ row.code }}</td>
              <td>
                <span class="status-tag" :class="row.status === 1 ? 'active' : 'inactive'">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </span>
              </td>
              <td>{{ row.remark || '--' }}</td>
              <td>{{ formatDateTime(row.createdAt) }}</td>
              <td>
                <div class="action-group">
                  <button class="tiny-button" @click="openEdit(row)">编辑</button>
                  <button class="tiny-button danger" @click="openRemoveDialog(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state panel-empty-state">暂无岗位数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">{{ editingId ? '编辑岗位' : '新增岗位' }}</h3>
              <p class="modal-subtext">
                岗位编码建议简洁明确，便于后续和组织架构同步。
              </p>
            </div>
            <button class="pill-button ghost" @click="dialogVisible = false">关闭</button>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>岗位名称</span>
              <input v-model="form.name" placeholder="请输入岗位名称" />
            </label>
            <label class="field">
              <span>岗位编码</span>
              <input v-model="form.code" placeholder="例如 PM" />
            </label>
            <label class="field">
              <span>状态</span>
              <AppSelect v-model="form.status" :options="statusOptions" placeholder="请选择状态" />
            </label>
            <label class="field full">
              <span>备注</span>
              <textarea v-model="form.remark" placeholder="补充岗位说明"></textarea>
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

    <ConfirmDialog
      v-model="deleteDialogVisible"
      title="删除岗位"
      :message="deleteMessage"
      :loading="deleting"
      @cancel="closeRemoveDialog"
      @confirm="confirmRemove"
    />
  </div>
</template>
