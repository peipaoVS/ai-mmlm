<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import AppSelect from '../components/AppSelect.vue'
import { formatDateTime } from '../utils/format'

const rows = ref([])
const roleOptions = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)

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

const sectionOptions = [
  { label: 'AI配置', value: 'ai' },
  { label: 'AI知识库', value: 'knowledge' },
  { label: '日志', value: 'logs' },
  { label: '权限配置', value: 'permission' }
]

const summary = computed(() => ({
  total: rows.value.length,
  active: rows.value.filter((item) => item.status === 1).length,
  inactive: rows.value.filter((item) => item.status === 0).length
}))

onMounted(() => {
  loadAll()
})

function createEmptyForm() {
  return {
    name: '',
    code: '',
    section: 'permission',
    path: '',
    sortOrder: 10,
    status: 1,
    remark: '',
    roleIds: []
  }
}

function resetForm() {
  Object.assign(form, createEmptyForm())
  editingId.value = null
}

function sectionLabel(value) {
  return sectionOptions.find((item) => item.value === value)?.label || value
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
    if (filters.keyword) {
      query.set('keyword', filters.keyword)
    }
    if (filters.status !== '') {
      query.set('status', filters.status)
    }
    const suffix = query.toString() ? `?${query.toString()}` : ''

    const [menus, roles] = await Promise.all([
      api.get(`/api/menus${suffix}`),
      api.get('/api/roles')
    ])

    rows.value = menus
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
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    code: row.code,
    section: row.section,
    path: row.path,
    sortOrder: row.sortOrder,
    status: row.status,
    remark: row.remark || '',
    roleIds: [...(row.roleIds || [])]
  })
  dialogVisible.value = true
}

async function submitForm() {
  submitting.value = true
  try {
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder) || 0,
      roleIds: [...form.roleIds]
    }

    if (editingId.value) {
      await api.put(`/api/menus/${editingId.value}`, payload)
    } else {
      await api.post('/api/menus', payload)
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
  if (!window.confirm(`确认删除菜单「${row.name}」吗？`)) {
    return
  }
  try {
    await api.delete(`/api/menus/${row.id}`)
    await loadAll()
  } catch (error) {
    window.alert(error.message)
  }
}
</script>

<template>
  <div class="admin-scroll-page">
    <div class="stats-grid">
      <article class="stats-card">
        <span>菜单总数</span>
        <strong>{{ summary.total }}</strong>
      </article>
      <article class="stats-card">
        <span>启用菜单</span>
        <strong>{{ summary.active }}</strong>
      </article>
      <article class="stats-card">
        <span>停用菜单</span>
        <strong>{{ summary.inactive }}</strong>
      </article>
    </div>

    <section class="data-panel glass-card admin-scroll-panel">
      <div class="toolbar">
        <input v-model="filters.keyword" placeholder="搜索菜单名称 / 编码 / 路径" />
        <AppSelect v-model="filters.status" :options="filterStatusOptions" placeholder="全部状态" />
        <button class="pill-button secondary" @click="loadAll">查询</button>
        <button
          class="pill-button ghost"
          @click="
            filters.keyword = '';
            filters.status = '';
            loadAll();
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
              <th>菜单名称</th>
              <th>菜单编码</th>
              <th>所属栏目</th>
              <th>路由路径</th>
              <th>可见角色</th>
              <th>状态</th>
              <th>排序</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ row.name }}</td>
              <td>{{ row.code }}</td>
              <td>
                <span class="tag section-tag">{{ sectionLabel(row.section) }}</span>
              </td>
              <td>{{ row.path }}</td>
              <td>
                <div class="tag-list">
                  <span v-for="name in row.roleNames" :key="name" class="tag">
                    {{ name }}
                  </span>
                  <span v-if="!row.roleNames?.length">--</span>
                </div>
              </td>
              <td>
                <span class="status-tag" :class="row.status === 1 ? 'active' : 'inactive'">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </span>
              </td>
              <td>{{ row.sortOrder }}</td>
              <td>{{ formatDateTime(row.createdAt) }}</td>
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

      <div v-else class="empty-state panel-empty-state">暂无菜单数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">{{ editingId ? '编辑菜单' : '新增菜单' }}</h3>
              <p class="modal-subtext">为菜单配置所属栏目和可见角色，顶部导航会按当前登录用户实时过滤。</p>
            </div>
            <button class="pill-button ghost" @click="dialogVisible = false">关闭</button>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>菜单名称</span>
              <input v-model="form.name" placeholder="请输入菜单名称" />
            </label>
            <label class="field">
              <span>菜单编码</span>
              <input v-model="form.code" placeholder="例如 USER_MANAGE" />
            </label>
            <div class="field">
              <span>所属栏目</span>
              <AppSelect v-model="form.section" :options="sectionOptions" placeholder="请选择栏目" />
            </div>
            <label class="field">
              <span>路由路径</span>
              <input v-model="form.path" placeholder="例如 /users" />
            </label>
            <label class="field">
              <span>排序值</span>
              <input v-model="form.sortOrder" type="number" min="0" placeholder="例如 10" />
            </label>
            <div class="field">
              <span>状态</span>
              <AppSelect v-model="form.status" :options="statusOptions" placeholder="请选择状态" />
            </div>
            <div class="field full">
              <span>可见角色</span>
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
                <div v-else class="field-hint">暂无角色数据，请先在角色管理中新增角色。</div>
              </div>
            </div>
            <label class="field full">
              <span>备注</span>
              <textarea v-model="form.remark" placeholder="补充菜单说明"></textarea>
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
  </div>
</template>

<style scoped>
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
  cursor: pointer;
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

.section-tag {
  background: rgba(237, 124, 71, 0.12);
  color: var(--brand-dark);
}
</style>
