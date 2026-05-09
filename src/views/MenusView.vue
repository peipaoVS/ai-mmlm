<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api } from '../api/http'
import AppSelect from '../components/AppSelect.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { formatDateTime } from '../utils/format'

const ROOT_PATH_PREFIX = '/nav/'
const SECTION_ORDER = {
  ai: 0,
  knowledge: 1,
  logs: 2,
  permission: 3
}

const rows = ref([])
const roleOptions = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const deleteDialogVisible = ref(false)
const deleting = ref(false)
const pendingDeleteRow = ref(null)
const expandedRowKeys = ref([])

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
  return row ? `确认删除菜单「${row.name}」吗？` : ''
})

const treeRows = computed(() => buildMenuTree(rows.value))
const flatTreeRows = computed(() => flattenVisibleTree(treeRows.value, new Set(expandedRowKeys.value)))

const parentNameMap = computed(() => {
  const map = new Map()
  rows.value.forEach((item) => {
    map.set(String(item.id), item.name)
  })
  return map
})

const parentMenuOptions = computed(() => {
  const currentId = editingId.value == null ? null : String(editingId.value)
  const excludedIds = new Set()

  if (currentId) {
    excludedIds.add(currentId)
    collectDescendantIds(currentId).forEach((id) => excludedIds.add(id))
  }

  const candidates = rows.value.filter((item) => {
    return Number.isFinite(Number(item?.id)) && !excludedIds.has(String(item.id))
  })

  return [
    { label: '顶级', value: '' },
    ...flattenTree(buildMenuTree(candidates)).map((item) => ({
      label: renderParentOptionLabel(item),
      value: String(item.id)
    }))
  ]
})

watch(
  () => form.parentId,
  (value) => {
    const parentId = normalizeParentId(value)
    if (parentId == null) {
      if (!editingId.value) {
        form.section = 'permission'
      }
      return
    }

    const parentRow = rows.value.find((item) => String(item.id) === String(parentId))
    if (parentRow?.section) {
      form.section = parentRow.section
    }
  }
)

onMounted(() => {
  loadAll()
})

function createEmptyForm() {
  return {
    name: '',
    code: '',
    section: 'permission',
    path: '',
    parentId: '',
    sortOrder: 1,
    status: 1,
    remark: '',
    roleIds: []
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

function getSectionRank(value) {
  return SECTION_ORDER[String(value || '').trim()] ?? Number.MAX_SAFE_INTEGER
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

function normalizeParentId(value) {
  if (value === '' || value == null) {
    return null
  }

  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

function compareMenuItem(left, right) {
  const sectionDiff = getSectionRank(left?.section) - getSectionRank(right?.section)
  if (sectionDiff !== 0) {
    return sectionDiff
  }

  const sortDiff = Number(left?.sortOrder ?? 0) - Number(right?.sortOrder ?? 0)
  if (sortDiff !== 0) {
    return sortDiff
  }

  const pathDiff = String(left?.path || '').localeCompare(String(right?.path || ''))
  if (pathDiff !== 0) {
    return pathDiff
  }

  const nameDiff = String(left?.name || '').localeCompare(String(right?.name || ''))
  if (nameDiff !== 0) {
    return nameDiff
  }

  return String(left?.id || '').localeCompare(String(right?.id || ''))
}

function buildMenuTree(list) {
  const items = Array.isArray(list) ? list.map((item) => ({ ...item, children: [] })) : []
  const map = new Map(items.map((item) => [String(item.id), item]))
  const roots = []

  items.forEach((item) => {
    const parentKey = item.parentId == null ? '' : String(item.parentId)
    if (parentKey && map.has(parentKey)) {
      map.get(parentKey).children.push(item)
      return
    }

    roots.push(item)
  })

  const sortNodes = (nodes, level = 0) =>
    nodes
      .slice()
      .sort(compareMenuItem)
      .map((item) => ({
        ...item,
        level,
        children: sortNodes(item.children || [], level + 1)
      }))

  return sortNodes(roots)
}

function flattenTree(nodes) {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children || [])])
}

function flattenVisibleTree(nodes, expandedKeys) {
  return nodes.flatMap((node) => {
    const children = expandedKeys.has(String(node.id))
      ? flattenVisibleTree(node.children || [], expandedKeys)
      : []
    return [node, ...children]
  })
}

function collectDescendantIds(targetId) {
  const childrenByParent = new Map()

  rows.value.forEach((item) => {
    if (item.parentId == null) {
      return
    }

    const parentKey = String(item.parentId)
    if (!childrenByParent.has(parentKey)) {
      childrenByParent.set(parentKey, [])
    }
    childrenByParent.get(parentKey).push(String(item.id))
  })

  const result = new Set()
  const stack = [...(childrenByParent.get(String(targetId)) || [])]

  while (stack.length) {
    const currentId = stack.pop()
    if (!currentId || result.has(currentId)) {
      continue
    }

    result.add(currentId)
    ;(childrenByParent.get(currentId) || []).forEach((childId) => stack.push(childId))
  }

  return result
}

function renderParentOptionLabel(item) {
  return `${'-- '.repeat(item.level || 0)}${item.name}`
}

function hasChildMenus(row) {
  return Array.isArray(row?.children) && row.children.length > 0
}

function isRowExpanded(row) {
  return expandedRowKeys.value.includes(String(row?.id))
}

function toggleRow(row) {
  if (!hasChildMenus(row)) {
    return
  }

  const key = String(row.id)
  if (isRowExpanded(row)) {
    expandedRowKeys.value = expandedRowKeys.value.filter((item) => item !== key)
    return
  }

  expandedRowKeys.value = [...expandedRowKeys.value, key]
}

function getParentName(row) {
  if (row.parentId == null) {
    return '顶级'
  }

  return parentNameMap.value.get(String(row.parentId)) || '--'
}

function treeIndentStyle(row) {
  return {
    paddingLeft: `${12 + (row.level || 0) * 20}px`
  }
}

function openCreate(parentRow = null) {
  resetForm()

  if (parentRow) {
    form.section = parentRow.section
    form.parentId = String(parentRow.id)
  }

  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    code: row.code,
    section: row.section,
    path: row.path || '',
    parentId: row.parentId == null ? '' : String(row.parentId),
    sortOrder: row.sortOrder,
    status: row.status,
    remark: row.remark || '',
    roleIds: [...(row.roleIds || [])]
  })
  dialogVisible.value = true
}

function buildTopLevelPath(section, code) {
  const normalizedCode = String(code || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${ROOT_PATH_PREFIX}${section}/${normalizedCode || 'menu'}`
}

function buildMenuPath(payload) {
  if (payload.parentId == null) {
    return buildTopLevelPath(payload.section, payload.code)
  }

  return payload.path
}

function buildMenuSavePayload() {
  const parentId = normalizeParentId(form.parentId)
  const parentRow = parentId == null
    ? null
    : rows.value.find((item) => String(item.id) === String(parentId))
  const section = String(parentRow?.section || form.section || 'permission').trim()

  return {
    name: String(form.name || '').trim(),
    code: String(form.code || '').trim(),
    section,
    path: buildMenuPath({
      parentId,
      section,
      code: String(form.code || '').trim(),
      path: String(form.path || '').trim()
    }),
    parentId: parentId == null ? null : Number(parentId),
    parentMenuId: parentId == null ? null : Number(parentId),
    sortOrder: Number(form.sortOrder) || 1,
    status: Number(form.status) === 0 ? 0 : 1,
    remark: String(form.remark || '').trim(),
    roleIds: [...form.roleIds]
  }
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

    rows.value = Array.isArray(menus) ? menus : []
    expandedRowKeys.value = []
    roleOptions.value = Array.isArray(roles) ? roles : []
  } catch (error) {
    window.alert(error.message)
  } finally {
    loading.value = false
  }
}

async function submitForm() {
  submitting.value = true

  try {
    const payload = buildMenuSavePayload()

    if (editingId.value) {
      await api.put(`/api/menus/${editingId.value}`, payload)
    } else {
      await api.post('/api/menus', payload)
    }

    closeDialog()
    await loadAll()
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
    await api.delete(`/api/menus/${row.id}`)
    closeRemoveDialog()
    await loadAll()
  } catch (error) {
    window.alert(error.message)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="admin-scroll-page menus-page admin-tree-table-page">
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
        <button class="pill-button" @click="openCreate()">新增</button>
      </div>

      <div v-if="loading" class="empty-state panel-empty-state">数据加载中...</div>

      <div v-else-if="flatTreeRows.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>菜单名称</th>
              <th>菜单编码</th>
              <th>上级菜单</th>
              <th>可见角色</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in flatTreeRows" :key="row.id">
              <td :title="row.name">
                <div class="menu-name-cell" :style="treeIndentStyle(row)">
                  <button
                    v-if="hasChildMenus(row)"
                    type="button"
                    class="tree-toggle-button"
                    :class="{ expanded: isRowExpanded(row) }"
                    @click.stop="toggleRow(row)"
                  >
                    <span class="tree-toggle-arrow" aria-hidden="true"></span>
                  </button>
                  <span v-else class="tree-toggle-spacer" aria-hidden="true"></span>
                  <span class="menu-name-text">{{ row.name }}</span>
                </div>
              </td>
              <td :title="row.code">{{ row.code }}</td>
              <td>{{ getParentName(row) }}</td>
              <td :title="row.roleNames?.join(' / ') || '--'">
                {{ row.roleNames?.length ? row.roleNames.join(' / ') : '--' }}
              </td>
              <td>{{ row.status === 1 ? '启用' : '停用' }}</td>
              <td>{{ formatDateTime(row.createdAt) }}</td>
              <td>
                <div class="action-group">
                  <button class="tiny-button" @click="openCreate(row)">新增下级</button>
                  <button class="tiny-button" @click="openEdit(row)">编辑</button>
                  <button class="tiny-button danger" @click="openRemoveDialog(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state panel-empty-state">暂无菜单数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="closeDialog">
        <div class="modal-panel glass-card permission-editor-modal">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">{{ editingId ? '编辑菜单' : '新增菜单' }}</h3>
              <p class="modal-subtext">菜单支持树结构管理，顶级菜单会显示在左侧系统导航一级位置。</p>
            </div>
            <button class="pill-button ghost" @click="closeDialog">关闭</button>
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
              <span>上级菜单</span>
              <AppSelect v-model="form.parentId" :options="parentMenuOptions" placeholder="顶级" />
            </div>
            <label class="field">
              <span>路由路径</span>
              <input
                v-model="form.path"
                :disabled="normalizeParentId(form.parentId) == null"
                :placeholder="normalizeParentId(form.parentId) == null ? '顶级菜单自动生成目录路径' : '例如 /users'"
              />
            </label>
            <label class="field">
              <span>排序值</span>
              <input v-model="form.sortOrder" type="number" min="1" placeholder="例如 1" />
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
            <button class="pill-button ghost" @click="closeDialog">取消</button>
            <button class="pill-button" :disabled="submitting" @click="submitForm">
              {{ submitting ? '提交中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      v-model="deleteDialogVisible"
      title="删除菜单"
      :message="deleteMessage"
      :loading="deleting"
      @cancel="closeRemoveDialog"
      @confirm="confirmRemove"
    />
  </div>
</template>

<style scoped>
.menus-page .data-table th:nth-child(4),
.menus-page .data-table td:nth-child(4) {
  max-width: 13rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menus-page .data-table th:nth-child(5),
.menus-page .data-table td:nth-child(5) {
  text-align: center;
}

.menus-page .data-table th:nth-child(6),
.menus-page .data-table td:nth-child(6),
.menus-page .data-table td:nth-child(6) span,
.menus-page .data-table td:nth-child(6) div {
  text-align: center;
}

.menus-page .data-table th:nth-child(7),
.menus-page .data-table td:nth-child(7),
.menus-page .data-table td:nth-child(7) span,
.menus-page .data-table td:nth-child(7) div {
  text-align: center;
}

.role-picker {
  display: grid;
  gap: 0.625rem;
}

.role-option-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.role-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.875rem;
  padding: 0.625rem 1rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 1rem;
  background: rgba(2, 6, 23, 0.34);
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
  border-color: rgba(34, 211, 238, 0.22);
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.16), rgba(122, 221, 193, 0.12));
  color: #dffcff;
  box-shadow:
    0 12px 24px rgba(34, 211, 238, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.field-hint {
  color: var(--text-muted);
  line-height: 1.7;
}

:global(html[data-theme='light']) .role-option {
  border-color: rgba(27, 37, 54, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 249, 253, 0.88)),
    rgba(255, 255, 255, 0.82);
  color: #1b2536;
  box-shadow:
    0 10px 22px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

:global(html[data-theme='light']) .role-option:hover {
  border-color: rgba(237, 124, 71, 0.18);
  box-shadow: 0 10px 20px rgba(29, 35, 52, 0.08);
}

:global(html[data-theme='light']) .role-option.active {
  border-color: rgba(237, 124, 71, 0.16);
  background: linear-gradient(135deg, rgba(255, 243, 234, 0.96), rgba(241, 248, 246, 0.94));
  color: #1b2536;
}
</style>


