<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSelect from '../components/AppSelect.vue'
import { formatDateTime } from '../utils/format'

const route = useRoute()

const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const rows = ref([])

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

const mockStore = {
  products: [
    {
      id: 101,
      name: '标准产品库',
      code: 'PROD_001',
      status: 1,
      remark: '产品知识占位数据，后续可替换为真实接口返回。',
      createdAt: '2026-04-23T09:30:00',
      updatedAt: '2026-04-23T09:30:00'
    },
    {
      id: 102,
      name: '重点产品清单',
      code: 'PROD_002',
      status: 0,
      remark: '用于演示产品库页面的预留管理结构。',
      createdAt: '2026-04-23T10:00:00',
      updatedAt: '2026-04-23T10:00:00'
    }
  ],
  portraits: [
    {
      id: 201,
      name: '重点企业画像',
      code: 'PROFILE_001',
      status: 1,
      remark: '企业画像占位数据，后续接入企业标签与画像接口。',
      createdAt: '2026-04-23T09:20:00',
      updatedAt: '2026-04-23T09:20:00'
    },
    {
      id: 202,
      name: '存量客户画像',
      code: 'PROFILE_002',
      status: 1,
      remark: '用于展示画像管理页的编辑和查询能力。',
      createdAt: '2026-04-23T11:10:00',
      updatedAt: '2026-04-23T11:10:00'
    }
  ],
  trends: [
    {
      id: 301,
      name: '行业月度观察',
      code: 'TREND_001',
      status: 1,
      remark: '行业动态占位数据，后续可接资讯抓取与研报接口。',
      createdAt: '2026-04-23T08:45:00',
      updatedAt: '2026-04-23T08:45:00'
    },
    {
      id: 302,
      name: '重点行业快讯',
      code: 'TREND_002',
      status: 0,
      remark: '用于模拟行业动态页面的管理结构。',
      createdAt: '2026-04-23T12:00:00',
      updatedAt: '2026-04-23T12:00:00'
    }
  ]
}

const currentMeta = computed(() => ({
  title: route.meta.title || '知识库',
  entityName: route.meta.entityName || '条目',
  nameLabel: route.meta.nameLabel || '名称',
  codeLabel: route.meta.codeLabel || '编码',
  searchPlaceholder: route.meta.searchPlaceholder || '搜索名称 / 编码',
  codePlaceholder: route.meta.codePlaceholder || '请输入编码',
  remarkPlaceholder: route.meta.remarkPlaceholder || '补充说明'
}))

function currentKey() {
  return route.meta.kbKey || 'products'
}

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
    const source = [...(mockStore[currentKey()] || [])]
    const keyword = filters.keyword.trim().toLowerCase()

    const filtered = source.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword)
      const matchesStatus =
        filters.status === '' || String(item.status) === String(filters.status)
      return matchesKeyword && matchesStatus
    })

    rows.value = filtered.sort((a, b) => b.id - a.id)
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
    const store = mockStore[currentKey()]
    const now = new Date().toISOString()

    if (editingId.value) {
      const target = store.find((item) => item.id === editingId.value)
      if (target) {
        target.name = form.name
        target.code = form.code
        target.status = form.status
        target.remark = form.remark
        target.updatedAt = now
      }
    } else {
      store.unshift({
        id: Date.now(),
        name: form.name,
        code: form.code,
        status: form.status,
        remark: form.remark,
        createdAt: now,
        updatedAt: now
      })
    }

    dialogVisible.value = false
    resetForm()
    await loadData()
  } finally {
    submitting.value = false
  }
}

async function removeRow(row) {
  if (!window.confirm(`确认删除${currentMeta.value.entityName}「${row.name}」吗？`)) {
    return
  }

  const store = mockStore[currentKey()]
  const index = store.findIndex((item) => item.id === row.id)
  if (index >= 0) {
    store.splice(index, 1)
  }

  await loadData()
}

watch(
  () => route.meta.kbKey,
  async () => {
    filters.keyword = ''
    filters.status = ''
    dialogVisible.value = false
    resetForm()
    await loadData()
  },
  { immediate: true }
)
</script>

<template>
  <section class="data-panel glass-card">
    <div class="toolbar">
      <input v-model="filters.keyword" :placeholder="currentMeta.searchPlaceholder" />
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

    <div v-if="loading" class="empty-state">数据加载中...</div>

    <div v-else-if="rows.length" class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ currentMeta.nameLabel }}</th>
            <th>{{ currentMeta.codeLabel }}</th>
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

    <div v-else class="empty-state">暂无{{ currentMeta.title }}数据。</div>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">
                {{ editingId ? `编辑${currentMeta.entityName}` : `新增${currentMeta.entityName}` }}
              </h3>
              <p class="modal-subtext">当前为预留接口页面，后续替换真实接口后前端结构无需重写。</p>
            </div>
            <button class="pill-button ghost" @click="dialogVisible = false">关闭</button>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>{{ currentMeta.nameLabel }}</span>
              <input v-model="form.name" :placeholder="`请输入${currentMeta.nameLabel}`" />
            </label>
            <label class="field">
              <span>{{ currentMeta.codeLabel }}</span>
              <input v-model="form.code" :placeholder="currentMeta.codePlaceholder" />
            </label>
            <label class="field">
              <span>状态</span>
              <AppSelect v-model="form.status" :options="statusOptions" placeholder="请选择状态" />
            </label>
            <label class="field full">
              <span>备注</span>
              <textarea v-model="form.remark" :placeholder="currentMeta.remarkPlaceholder"></textarea>
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
  </section>
</template>
