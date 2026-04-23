<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import { formatDateTime } from '../utils/format'

const rows = ref([])
const roleOptions = ref([])
const postOptions = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const roleMenuVisible = ref(false)
const postMenuVisible = ref(false)
const roleMenuRef = ref(null)
const postMenuRef = ref(null)

const filters = reactive({
  keyword: '',
  status: ''
})

const form = reactive(createEmptyForm())

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 }
]

const summary = computed(() => ({
  total: rows.value.length,
  active: rows.value.filter((item) => item.status === 1).length,
  inactive: rows.value.filter((item) => item.status === 0).length
}))

const selectedRoleSummary = computed(() =>
  summarizeSelection(form.roleIds, roleOptions.value, '请选择角色')
)

const selectedPostSummary = computed(() =>
  summarizeSelection(form.postIds, postOptions.value, '请选择岗位')
)

onMounted(() => {
  loadAll()
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

function createEmptyForm() {
  return {
    username: '',
    nickname: '',
    password: '',
    phone: '',
    email: '',
    avatar: '',
    status: 1,
    remark: '',
    roleIds: [],
    postIds: []
  }
}

function resetForm() {
  Object.assign(form, createEmptyForm())
  editingId.value = null
  closeMenus()
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

    const [users, roles, posts] = await Promise.all([
      api.get(`/api/users${suffix}`),
      api.get('/api/roles'),
      api.get('/api/posts')
    ])

    rows.value = users
    roleOptions.value = roles
    postOptions.value = posts
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
  closeMenus()
  editingId.value = row.id
  Object.assign(form, {
    username: row.username,
    nickname: row.nickname,
    password: '',
    phone: row.phone || '',
    email: row.email || '',
    avatar: row.avatar || '',
    status: row.status,
    remark: row.remark || '',
    roleIds: [...(row.roleIds || [])],
    postIds: [...(row.postIds || [])]
  })
  dialogVisible.value = true
}

async function submitForm() {
  submitting.value = true
  try {
    if (editingId.value) {
      await api.put(`/api/users/${editingId.value}`, form)
    } else {
      await api.post('/api/users', form)
    }
    dialogVisible.value = false
    closeMenus()
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

function summarizeSelection(ids, options, emptyLabel) {
  const names = options
    .filter((item) => ids.includes(item.id))
    .map((item) => item.name)

  if (!names.length) {
    return emptyLabel
  }

  if (names.length <= 2) {
    return names.join('、')
  }

  return `${names.slice(0, 2).join('、')} 等${names.length}项`
}

function toggleMenu(type) {
  if (type === 'role') {
    roleMenuVisible.value = !roleMenuVisible.value
    postMenuVisible.value = false
    return
  }

  postMenuVisible.value = !postMenuVisible.value
  roleMenuVisible.value = false
}

function closeMenus() {
  roleMenuVisible.value = false
  postMenuVisible.value = false
}

function handleDocumentClick(event) {
  if (roleMenuRef.value && !roleMenuRef.value.contains(event.target)) {
    roleMenuVisible.value = false
  }

  if (postMenuRef.value && !postMenuRef.value.contains(event.target)) {
    postMenuVisible.value = false
  }
}
</script>

<template>
  <div>
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

    <section class="data-panel glass-card">
      <div class="toolbar">
        <input v-model="filters.keyword" placeholder="搜索用户名 / 姓名 / 手机 / 邮箱" />
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option value="1">启用</option>
          <option value="0">停用</option>
        </select>
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

      <div v-if="loading" class="empty-state">数据加载中...</div>

      <div v-else-if="rows.length" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>姓名</th>
              <th>联系方式</th>
              <th>角色</th>
              <th>岗位</th>
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
              <td>
                <span
                  class="status-tag"
                  :class="row.status === 1 ? 'active' : 'inactive'"
                >
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

      <div v-else class="empty-state">暂无用户数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">{{ editingId ? '编辑用户' : '新增用户' }}</h3>
              <p class="modal-subtext">
                {{ editingId ? '更新基础资料与角色岗位绑定。' : '创建新用户，默认密码为空时使用 admin123。' }}
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
              <select v-model.number="form.status">
                <option :value="1">启用</option>
                <option :value="0">停用</option>
              </select>
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
              <span>角色</span>
              <div ref="roleMenuRef" class="dropdown-field">
                <button type="button" class="dropdown-trigger" @click="toggleMenu('role')">
                  <div class="dropdown-copy">
                    <strong>{{ selectedRoleSummary }}</strong>
                    <span>{{ form.roleIds.length ? `已选择 ${form.roleIds.length} 项` : '下拉选择角色' }}</span>
                  </div>
                  <span class="dropdown-arrow" :class="{ open: roleMenuVisible }">?</span>
                </button>

                <div v-if="roleMenuVisible" class="dropdown-menu">
                  <div v-if="roleOptions.length">
                    <label
                      v-for="item in roleOptions"
                      :key="item.id"
                      class="dropdown-option"
                    >
                      <input v-model="form.roleIds" type="checkbox" :value="item.id" />
                      <div class="dropdown-option-copy">
                        <strong>{{ item.name }}</strong>
                        <span>角色 ID：{{ item.id }}</span>
                      </div>
                    </label>
                  </div>
                  <div v-else class="dropdown-empty">暂无角色可选</div>
                </div>
              </div>
            </div>
            <div class="field full">
              <span>岗位</span>
              <div ref="postMenuRef" class="dropdown-field">
                <button type="button" class="dropdown-trigger" @click="toggleMenu('post')">
                  <div class="dropdown-copy">
                    <strong>{{ selectedPostSummary }}</strong>
                    <span>{{ form.postIds.length ? `已选择 ${form.postIds.length} 项` : '下拉选择岗位' }}</span>
                  </div>
                  <span class="dropdown-arrow" :class="{ open: postMenuVisible }">?</span>
                </button>

                <div v-if="postMenuVisible" class="dropdown-menu">
                  <div v-if="postOptions.length">
                    <label
                      v-for="item in postOptions"
                      :key="item.id"
                      class="dropdown-option"
                    >
                      <input v-model="form.postIds" type="checkbox" :value="item.id" />
                      <div class="dropdown-option-copy">
                        <strong>{{ item.name }}</strong>
                        <span>岗位 ID：{{ item.id }}</span>
                      </div>
                    </label>
                  </div>
                  <div v-else class="dropdown-empty">暂无岗位可选</div>
                </div>
              </div>
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

<style scoped>
.dropdown-field {
  position: relative;
  width: 100%;
}

.dropdown-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12px * var(--ui-scale));
  min-height: calc(48px * var(--ui-scale));
  padding: calc(10px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.1);
  border-radius: calc(16px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-main);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.dropdown-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(4px * var(--ui-scale));
  text-align: left;
}

.dropdown-copy strong {
  font-size: calc(14px * var(--ui-scale));
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-copy span {
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
}

.dropdown-arrow {
  color: var(--text-muted);
  font-size: calc(16px * var(--ui-scale));
  transition: transform 0.18s ease;
  flex-shrink: 0;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + calc(10px * var(--ui-scale)));
  left: 0;
  width: 100%;
  max-height: 260px;
  overflow: auto;
  padding: calc(10px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 36px rgba(27, 37, 54, 0.12);
  z-index: 30;
}

.dropdown-option {
  display: flex;
  align-items: flex-start;
  gap: calc(10px * var(--ui-scale));
  padding: calc(10px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: calc(14px * var(--ui-scale));
  border: 1px solid transparent;
  background: rgba(248, 250, 254, 0.88);
}

.dropdown-option + .dropdown-option {
  margin-top: calc(8px * var(--ui-scale));
}

.dropdown-option:hover {
  border-color: rgba(47, 131, 116, 0.22);
  background: rgba(255, 248, 243, 0.92);
}

.dropdown-option input {
  margin-top: calc(2px * var(--ui-scale));
  accent-color: var(--brand-alt);
}

.dropdown-option-copy strong {
  display: block;
  font-size: calc(14px * var(--ui-scale));
}

.dropdown-option-copy span {
  display: block;
  margin-top: calc(4px * var(--ui-scale));
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
}

.dropdown-empty {
  padding: calc(12px * var(--ui-scale));
  text-align: center;
  color: var(--text-muted);
}
</style>
