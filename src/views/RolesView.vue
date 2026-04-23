<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import { formatDateTime } from '../utils/format'

const rows = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)

const filters = reactive({
  keyword: '',
  status: ''
})

const form = reactive(createEmptyForm())

const summary = computed(() => ({
  total: rows.value.length,
  active: rows.value.filter((item) => item.status === 1).length,
  inactive: rows.value.filter((item) => item.status === 0).length
}))

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
    remark: row.remark || ''
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

async function removeRow(row) {
  if (!window.confirm(`确认删除角色「${row.name}」吗？`)) {
    return
  }
  try {
    await api.delete(`/api/roles/${row.id}`)
    await loadData()
  } catch (error) {
    window.alert(error.message)
  }
}
</script>

<template>
  <div>
    <div class="stats-grid">
      <article class="stats-card">
        <span>角色总数</span>
        <strong>{{ summary.total }}</strong>
      </article>
      <article class="stats-card">
        <span>启用角色</span>
        <strong>{{ summary.active }}</strong>
      </article>
      <article class="stats-card">
        <span>停用角色</span>
        <strong>{{ summary.inactive }}</strong>
      </article>
    </div>

    <section class="data-panel glass-card">
      <div class="toolbar">
        <input v-model="filters.keyword" placeholder="搜索角色名称 / 编码" />
        <select v-model="filters.status">
          <option value="">全部状态</option>
          <option value="1">启用</option>
          <option value="0">停用</option>
        </select>
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

      <div v-if="loading" class="empty-state">数据加载中...</div>

      <div v-else-if="rows.length" class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>角色名称</th>
              <th>角色编码</th>
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
                  <button class="tiny-button danger" @click="removeRow(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">暂无角色数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card">
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
              <select v-model.number="form.status">
                <option :value="1">启用</option>
                <option :value="0">停用</option>
              </select>
            </label>
            <label class="field full">
              <span>备注</span>
              <textarea v-model="form.remark" placeholder="补充角色说明"></textarea>
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
