<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import AppSelect from '../components/AppSelect.vue'
import { formatDateTime } from '../utils/format'

const rows = ref([])
const roleOptions = ref([])
const postOptions = ref([])
const companyOptions = ref([])
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

const roleSelectOptions = computed(() =>
  roleOptions.value.map((item) => ({
    label: item.name,
    value: item.id
  }))
)

const postSelectOptions = computed(() =>
  postOptions.value.map((item) => ({
    label: item.name,
    value: item.id
  }))
)

const companySelectOptions = computed(() =>
  companyOptions.value.map((item) => ({
    label: item.name,
    value: item.id
  }))
)

const selectedRoleId = computed({
  get: () => form.roleIds[0] ?? '',
  set: (value) => {
    form.roleIds = value === '' ? [] : [value]
  }
})

const selectedPostId = computed({
  get: () => form.postIds[0] ?? '',
  set: (value) => {
    form.postIds = value === '' ? [] : [value]
  }
})

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
    username: '',
    nickname: '',
    password: '',
    phone: '',
    email: '',
    avatar: '',
    companyId: '',
    status: 1,
    remark: '',
    roleIds: [],
    postIds: []
  }
}

function resetForm() {
  Object.assign(form, createEmptyForm())
  editingId.value = null
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

    const [users, roles, posts, companies] = await Promise.all([
      api.get(`/api/users${suffix}`),
      api.get('/api/roles'),
      api.get('/api/posts'),
      api.get('/api/companies')
    ])

    rows.value = users
    roleOptions.value = roles
    postOptions.value = posts
    companyOptions.value = companies
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
    username: row.username,
    nickname: row.nickname,
    password: '',
    phone: row.phone || '',
    email: row.email || '',
    avatar: row.avatar || '',
    companyId: row.companyId ?? '',
    status: row.status,
    remark: row.remark || '',
    roleIds: row.roleIds?.length ? [row.roleIds[0]] : [],
    postIds: row.postIds?.length ? [row.postIds[0]] : []
  })
  dialogVisible.value = true
}

async function submitForm() {
  submitting.value = true
  try {
    const payload = {
      ...form,
      companyId: form.companyId === '' ? null : form.companyId,
      roleIds: [...form.roleIds],
      postIds: [...form.postIds]
    }

    if (editingId.value) {
      await api.put(`/api/users/${editingId.value}`, payload)
    } else {
      await api.post('/api/users', payload)
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
  if (!window.confirm(`确认删除用户「${row.nickname}」吗？`)) {
    return
  }

  try {
    await api.delete(`/api/users/${row.id}`)
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
        <span>用户总数</span>
        <strong>{{ summary.total }}</strong>
      </article>
      <article class="stats-card">
        <span>启用用户</span>
        <strong>{{ summary.active }}</strong>
      </article>
      <article class="stats-card">
        <span>停用用户</span>
        <strong>{{ summary.inactive }}</strong>
      </article>
    </div>

    <section class="data-panel glass-card admin-scroll-panel">
      <div class="toolbar">
        <input v-model="filters.keyword" placeholder="搜索用户名 / 姓名 / 手机 / 邮箱" />
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
              <th>用户名</th>
              <th>姓名</th>
              <th>联系方式</th>
              <th>角色</th>
              <th>岗位</th>
              <th>所属公司</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ row.username }}</td>
              <td>{{ row.nickname }}</td>
              <td>
                <div>{{ row.phone || '--' }}</div>
                <div class="table-subtext">{{ row.email || '--' }}</div>
              </td>
              <td>
                <div class="tag-list">
                  <span v-for="name in row.roleNames" :key="name" class="tag">
                    {{ name }}
                  </span>
                  <span v-if="!row.roleNames?.length">--</span>
                </div>
              </td>
              <td>
                <div class="tag-list">
                  <span v-for="name in row.postNames" :key="name" class="tag">
                    {{ name }}
                  </span>
                  <span v-if="!row.postNames?.length">--</span>
                </div>
              </td>
              <td>{{ row.companyName || '--' }}</td>
              <td>
                <span class="status-tag" :class="row.status === 1 ? 'active' : 'inactive'">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </span>
              </td>
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

      <div v-else class="empty-state panel-empty-state">暂无用户数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">{{ editingId ? '编辑用户' : '新增用户' }}</h3>
              <p class="modal-subtext">
                {{ editingId ? '更新基础资料、公司归属与角色岗位绑定。' : '创建新用户，密码留空时默认使用 admin123。' }}
              </p>
            </div>
            <button class="pill-button ghost" @click="dialogVisible = false">关闭</button>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>用户名</span>
              <input v-model="form.username" placeholder="请输入用户名" />
            </label>
            <label class="field">
              <span>姓名</span>
              <input v-model="form.nickname" placeholder="请输入姓名" />
            </label>
            <label class="field">
              <span>密码</span>
              <input
                v-model="form.password"
                type="password"
                :placeholder="editingId ? '留空则不修改密码' : '留空默认 admin123'"
              />
            </label>
            <label class="field">
              <span>状态</span>
              <AppSelect v-model="form.status" :options="statusOptions" placeholder="请选择状态" />
            </label>
            <label class="field">
              <span>手机号</span>
              <input v-model="form.phone" placeholder="请输入手机号" />
            </label>
            <label class="field">
              <span>邮箱</span>
              <input v-model="form.email" placeholder="请输入邮箱" />
            </label>
            <label class="field full">
              <span>头像地址</span>
              <input v-model="form.avatar" placeholder="可选，填写头像 URL" />
            </label>
            <div class="field full">
              <span>所属公司</span>
              <AppSelect
                v-model="form.companyId"
                :options="companySelectOptions"
                placeholder="请选择所属公司"
              />
            </div>
            <div class="field full">
              <span>角色</span>
              <AppSelect
                v-model="selectedRoleId"
                :options="roleSelectOptions"
                placeholder="请选择角色"
              />
            </div>
            <div class="field full">
              <span>岗位</span>
              <AppSelect
                v-model="selectedPostId"
                :options="postSelectOptions"
                placeholder="请选择岗位"
              />
            </div>
            <label class="field full">
              <span>备注</span>
              <textarea v-model="form.remark" placeholder="补充说明"></textarea>
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
