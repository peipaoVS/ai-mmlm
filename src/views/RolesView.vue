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

const deleteMessage = computed(() => {
  const row = pendingDeleteRow.value
  return row ? `确认删除角色「${row.name}」吗？` : ''
})

onMounted(() => {
  loadData()
  loadMenuOptions()
})

const menuOptions = ref([])

async function loadMenuOptions() {
  try {
    const menus = await api.get('/api/menus')
    const paths = Array.isArray(menus)
      ? menus.filter((m) => m.path).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      : []
    menuOptions.value = [
      { label: '未设置', value: '' },
      ...paths.map((m) => ({ label: m.name, value: m.path }))
    ]
  } catch (e) {
    menuOptions.value = [{ label: '未设置', value: '' }]
  }
}

function createEmptyForm() {
  return {
    name: '',
    code: '',
    status: 1,
    remark: '',
    defaultPath: ''
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
    rows.value = await api.get(`/api/roles${suffix}`)
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
    remark: row.remark || '',
    defaultPath: row.defaultPath || ''
  })
  dialogVisible.value = true
}

async function submitForm() {
  submitting.value = true
  try {
    if (editingId.value) {
      await api.put(`/api/roles/${editingId.value}`, form)
    } else {
      await api.post('/api/roles', form)
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
    await api.delete(`/api/roles/${row.id}`)
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
  <div class="admin-scroll-page roles-page">
    <section class="data-panel glass-card admin-scroll-panel">
      <div class="toolbar">
        <input v-model="filters.keyword" placeholder="搜索角色名称 / 编码" />
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
              <th>角色名称</th>
              <th>角色编码</th>
              <th>状态</th>
              <th>备注</th>
              <th>默认跳转</th>
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
              <td>{{ row.defaultPath ? menuOptions.find(o => o.value === row.defaultPath)?.label || row.defaultPath : '--' }}</td>
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

      <div v-else class="empty-state panel-empty-state">暂无角色数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card permission-editor-modal">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">{{ editingId ? '编辑角色' : '新增角色' }}</h3>
              <p class="modal-subtext">
                角色编码建议使用全大写英文，便于后续扩展权限。
              </p>
            </div>
            <button class="pill-button ghost" @click="dialogVisible = false">关闭</button>
          </div>

          <div class="form-grid">
            <div class="form-scroll-area">
              <label class="field">
                <span>角色名称</span>
                <input v-model="form.name" placeholder="请输入角色名称" />
              </label>
              <label class="field">
                <span>角色编码</span>
                <input v-model="form.code" placeholder="例如 ADMIN" />
              </label>
              <label class="field">
                <span>状态</span>
                <AppSelect v-model="form.status" :options="statusOptions" placeholder="请选择状态" />
              </label>
              <label class="field full">
                <span>备注</span>
                <textarea v-model="form.remark" placeholder="补充角色说明"></textarea>
              </label>
            </div>
            <label class="field full">
              <span>默认跳转</span>
              <AppSelect v-model="form.defaultPath" :options="menuOptions" placeholder="登录后跳转的页面" />
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
      title="删除角色"
      :message="deleteMessage"
      :loading="deleting"
      @cancel="closeRemoveDialog"
      @confirm="confirmRemove"
    />
  </div>
</template>

<style scoped>
.roles-page .modal-header h3 {
  font-size: 16px;
}

.roles-page .toolbar {
  font-size: 16px;
}

.roles-page .data-table th,
.roles-page .field > span {
  font-size: 16px;
}

.roles-page .data-table th {
  text-align: left;
}

.roles-page .modal-subtext,
.roles-page .pill-button,
.roles-page .tiny-button,
.roles-page .toolbar input,
.roles-page .field input,
.roles-page .field textarea {
  font-size: 14px;
}

.roles-page :deep(.app-select-trigger),
.roles-page :deep(.app-select-value),
.roles-page :deep(.app-select-option) {
  font-size: 14px;
}

.roles-page .data-table td,
.roles-page .data-table td span {
  color: var(--text-muted);
  text-align: left;
  vertical-align: middle;
}

.roles-page .data-table th:nth-child(3),
.roles-page .data-table th:nth-child(5),
.roles-page .data-table th:nth-child(6),
.roles-page .data-table th:nth-child(7),
.roles-page .data-table td:nth-child(3),
.roles-page .data-table td:nth-child(5),
.roles-page .data-table td:nth-child(6),
.roles-page .data-table td:nth-child(7),
.roles-page .data-table td:nth-child(3) span,
.roles-page .data-table td:nth-child(5) span,
.roles-page .data-table td:nth-child(6) span,
.roles-page .data-table td:nth-child(7) span {
  text-align: center;
}

.roles-page .status-tag,
.roles-page .status-tag.active,
.roles-page .status-tag.inactive {
  display: inline;
  padding: 0;
  border-radius: 0;
  background: none;
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
}

.roles-page .action-group {
  justify-content: center;
}

.roles-page :global(.modal-panel.permission-editor-modal) {
  overflow: visible;
}

.roles-page .form-scroll-area {
  grid-column: 1 / -1;
  max-height: calc(100dvh - 16rem);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.roles-page .action-group .tiny-button {
  font-size: inherit;
}
</style>
