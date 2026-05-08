<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../api/http'
import AppSelect from '../components/AppSelect.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useSession } from '../stores/session'
import { formatDateTime } from '../utils/format'

const session = useSession()
const currentUserId = computed(() => String(session.user?.id ?? session.user?.userId ?? ''))

const treeData = ref([])
const loading = ref(false)
const expandedPostKeys = ref([])
const expandedUserKeys = ref([])

const filters = reactive({
  keyword: ''
})

const dialogVisible = ref(false)
const dialogMode = ref('generate')
const submitting = ref(false)
const editingPost = ref(null)
const editingUser = ref(null)
const editingCode = ref(null)

const form = reactive({
  userId: '',
  postId: null,
  remark: ''
})

const deleteDialogVisible = ref(false)
const deleting = ref(false)
const pendingDeleteCode = ref(null)

const transferUserOptions = computed(() => {
  const users = editingPost.value?.users || []
  return users
    .filter((user) => user.id !== editingPost.value?.leaderUserId)
    .map((user) => ({
      label: `${user.nickname || user.username} (${user.username})`,
      value: String(user.id)
    }))
})

const deleteMessage = computed(() => {
  const code = pendingDeleteCode.value
  return code ? `确认删除会话编码「${code.code}」吗？` : ''
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const query = new URLSearchParams()
    if (filters.keyword.trim()) {
      query.set('keyword', filters.keyword.trim())
    }
    const suffix = query.toString() ? `?${query.toString()}` : ''
    const data = await api.get(`/api/session-codes/post-tree${suffix}`)
    treeData.value = normalizeTreeData(Array.isArray(data) ? data : [])
    expandedUserKeys.value = []
    expandAllPosts()
  } catch (error) {
    console.error('加载会话转移数据失败:', error)
    treeData.value = []
  } finally {
    loading.value = false
  }
}

function expandAllPosts() {
  expandedPostKeys.value = treeData.value.map((post) => String(post.postId))
}

function normalizeTreeData(posts) {
  return posts.map((post) => ({
    ...post,
    displayUsers: buildDisplayUsers(post)
  }))
}

function buildDisplayUsers(post) {
  const actualUsers = Array.isArray(post?.users)
    ? post.users.map((user) => ({
        ...user,
        synthetic: false
      }))
    : []

  const userIds = new Set(actualUsers.map((user) => String(user.id)))

  ;(post?.sessionCodes || []).forEach((code) => {
    const ownerId = String(code.userId || '')
    if (!ownerId || userIds.has(ownerId)) {
      return
    }

    actualUsers.push({
      id: code.userId,
      username: code.userName || '',
      nickname: code.userNickname || code.userName || `用户 ${ownerId}`,
      phone: '',
      synthetic: true
    })
    userIds.add(ownerId)
  })

  return actualUsers
}

function resetFilters() {
  filters.keyword = ''
  loadData()
}

function togglePost(postId) {
  const key = String(postId)
  if (expandedPostKeys.value.includes(key)) {
    expandedPostKeys.value = expandedPostKeys.value.filter((item) => item !== key)
    return
  }
  expandedPostKeys.value = [...expandedPostKeys.value, key]
}

function isPostExpanded(postId) {
  return expandedPostKeys.value.includes(String(postId))
}

function toggleUser(postId, userId) {
  const key = buildUserKey(postId, userId)
  if (expandedUserKeys.value.includes(key)) {
    expandedUserKeys.value = expandedUserKeys.value.filter((item) => item !== key)
    return
  }
  expandedUserKeys.value = [...expandedUserKeys.value, key]
}

function isUserExpanded(postId, userId) {
  return expandedUserKeys.value.includes(buildUserKey(postId, userId))
}

function buildUserKey(postId, userId) {
  return `${postId}:${userId}`
}

function getLeaderName(post) {
  const users = post?.displayUsers || post?.users || []
  if (!post?.leaderUserId || !Array.isArray(users)) {
    return ''
  }
  const leader = users.find((user) => String(user.id) === String(post.leaderUserId))
  return leader ? leader.nickname || leader.username : ''
}

function isLeader(post, user) {
  return String(post?.leaderUserId || '') === String(user?.id || '')
}

function isCurrentUserLeader(post) {
  if (!currentUserId.value) {
    return false
  }
  return String(post?.leaderUserId || '') === currentUserId.value
}

function isCurrentUser(user) {
  if (!currentUserId.value) {
    return false
  }
  return String(user?.id || '') === currentUserId.value
}

function getTransferUsers(post) {
  return (post?.users || []).filter((user) => String(user.id) !== String(post?.leaderUserId || ''))
}

function isActualPostUser(user) {
  return !user?.synthetic
}

function collapsePostUsers(postId) {
  const prefix = `${postId}:`
  expandedUserKeys.value = expandedUserKeys.value.filter((key) => !key.startsWith(prefix))
}

function getPostCodes(post, user) {
  if (!post?.sessionCodes || !user) return []
  const codes = Array.isArray(post.sessionCodes) ? post.sessionCodes : []
  const targetUserId = String(user.id || '')
  if (!targetUserId) return []
  const result = codes.filter((code) => code && (String(code.userId || '') === targetUserId || String(code.leaderUserId || '') === targetUserId))
  return result || []
}

function openGenerateDialog(post, user) {
  dialogMode.value = 'generate'
  editingPost.value = post
  editingUser.value = user
  editingCode.value = null
  form.userId = String(user.id)
  form.postId = post.postId
  form.remark = ''
  dialogVisible.value = true
}

function openTransferDialog(code, post) {
  dialogMode.value = 'transfer'
  editingPost.value = post
  editingUser.value = null
  editingCode.value = code
  form.userId = ''
  form.postId = post.postId
  form.remark = ''
  dialogVisible.value = true
}

function resetDialogState() {
  dialogVisible.value = false
  editingPost.value = null
  editingUser.value = null
  editingCode.value = null
  form.userId = ''
  form.postId = null
  form.remark = ''
}

function closeDialog() {
  if (submitting.value) {
    return
  }
  resetDialogState()
}

async function submitForm() {
  submitting.value = true
  try {
    if (dialogMode.value === 'generate') {
      await api.post('/api/session-codes/generate', {
        userId: Number(form.userId),
        postId: form.postId,
        remark: form.remark
      })
    } else {
      await api.put(`/api/session-codes/${editingCode.value.id}/user`, {
        userId: Number(form.userId)
      })
    }

    resetDialogState()
    await loadData()
  } catch (error) {
    console.error('提交会话编码操作失败:', error)
    window.alert(error.message)
  } finally {
    submitting.value = false
  }
}

function confirmDeleteCode(code) {
  pendingDeleteCode.value = code
  deleteDialogVisible.value = true
}

function resetDeleteDialogState() {
  deleteDialogVisible.value = false
  pendingDeleteCode.value = null
}

function closeDeleteDialog() {
  if (deleting.value) {
    return
  }
  resetDeleteDialogState()
}

async function deleteCode() {
  if (!pendingDeleteCode.value) {
    return
  }

  deleting.value = true
  try {
    await api.delete(`/api/session-codes/${pendingDeleteCode.value.id}`)
    resetDeleteDialogState()
    await loadData()
  } catch (error) {
    console.error('删除会话编码失败:', error)
    window.alert(error.message)
  } finally {
    deleting.value = false
  }
}

async function setLeader(post, user) {
  try {
    await api.put(`/api/session-codes/post/${post.postId}/leader`, {
      userId: user.id
    })
    await loadData()
  } catch (error) {
    console.error('设置负责人失败:', error)
    window.alert(error.message)
  }
}

function canSubmit() {
  if (dialogMode.value === 'generate') {
    return Boolean(form.userId) && Boolean(form.postId)
  }
  return Boolean(editingCode.value?.id) && Boolean(form.userId)
}
</script>

<template>
  <div class="admin-scroll-page session-transfer-page menus-page admin-tree-table-page">
    <section class="data-panel glass-card admin-scroll-panel">
      <div class="toolbar">
        <input v-model="filters.keyword" placeholder="用户名称" />
        <button class="pill-button secondary" @click="loadData">查询</button>
        <button class="pill-button ghost" @click="resetFilters">重置</button>
      </div>

      <div v-if="loading" class="empty-state panel-empty-state">数据加载中...</div>

      <div v-else-if="treeData.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>岗位 / 用户</th>
              <th>负责人</th>
              <th>手机号</th>
              <th>会话编码</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="post in treeData" :key="`post-${post.postId}`">
              <tr class="post-row">
                <td>
                  <div class="menu-name-cell transfer-name-cell">
                    <button
                      type="button"
                      class="tree-toggle-button"
                      :class="{ expanded: isPostExpanded(post.postId) }"
                      @click.stop="togglePost(post.postId)"
                    >
                      <span class="tree-toggle-arrow" aria-hidden="true"></span>
                    </button>
                    <span class="menu-name-text transfer-post-name">{{ post.postName }}</span>
                  </div>
                </td>
                <td>
                  {{ getLeaderName(post) }}
                </td>
                <td></td>
                <td>{{ post.sessionCodes?.length || 0 }} 个</td>
                <td></td>
                <td>
                  <div class="action-group">
                    <button
                      v-if="isCurrentUserLeader(post)"
                      class="tiny-button"
                      @click="collapsePostUsers(post.postId)"
                    >
                      收起用户
                    </button>
                  </div>
                </td>
              </tr>

              <template v-if="isPostExpanded(post.postId)">
                <template v-for="user in post.displayUsers || []" :key="`user-${post.postId}-${user.id}`">
                  <tr class="user-row">
                    <td>
                      <div class="menu-name-cell transfer-name-cell" :style="{ paddingLeft: '32px' }">
                        <button
                          type="button"
                          class="tree-toggle-button"
                          :class="{ expanded: isUserExpanded(post.postId, user.id) }"
                          @click.stop="toggleUser(post.postId, user.id)"
                        >
                          <span class="tree-toggle-arrow" aria-hidden="true"></span>
                        </button>
                        <span class="menu-name-text">{{ user.nickname || user.username }}</span>
                        <span v-if="user.synthetic" class="cell-hint">编码归属用户</span>
                      </div>
                    </td>
                    <td>{{ isLeader(post, user) ? '是' : '否' }}</td>
                    <td>{{ user.phone || '' }}</td>
                    <td>{{ getPostCodes(post, user).length }} 个</td>
                    <td></td>
                    <td>
                      <div class="action-group">
                        <button
                          class="tiny-button"
                          @click="openGenerateDialog(post, user)"
                        >
                          生成编码
                        </button>
                        <button
                          v-if="!isLeader(post, user)"
                          class="tiny-button"
                          @click="setLeader(post, user)"
                        >
                          设为负责人
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr
                    v-if="isUserExpanded(post.postId, user.id)"
                    class="code-row"
                  >
                    <td colspan="6" class="code-panel-cell">
                      <div v-if="getPostCodes(post, user).length" class="code-table-wrap">
                        <table class="data-table code-table">
                          <tbody>
                            <tr
                          v-for="code in getPostCodes(post, user)"
                          :key="code.id"
                              class="code-detail-row"
                            >
                              <td class="code-detail-spacer"></td>
                              <td colspan="2">
                                <span>{{ code.code }}</span>
                                <span class="cell-hint">
                                  {{ code.userNickname || code.userName || '未绑定用户' }}
                                </span>
                              </td>
                              <td>{{ formatDateTime(code.createdAt) }}</td>
                              <td colspan="2">
                                <div class="action-group">
                                  <button class="tiny-button" @click="openTransferDialog(code, post)">转移</button>
                                  <button class="tiny-button danger" @click="confirmDeleteCode(code)">删除</button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div v-else class="empty-inline">暂无会话编码</div>
                    </td>
                  </tr>
                </template>
              </template>
            </template>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state panel-empty-state">暂无会话转移数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="closeDialog">
        <div class="modal-panel glass-card">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">{{ dialogMode === 'generate' ? '生成会话编码' : '转移会话编码' }}</h3>
            </div>
            <button class="pill-button ghost" @click="closeDialog">关闭</button>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>岗位</span>
              <input :value="editingPost?.postName || ''" disabled />
            </label>
            <label class="field">
              <span>{{ dialogMode === 'generate' ? '用户' : '会话编码' }}</span>
              <input
                :value="dialogMode === 'generate'
                  ? `${editingUser?.nickname || editingUser?.username || ''}`
                  : editingCode?.code || ''"
                disabled
              />
            </label>

            <label v-if="dialogMode === 'generate'" class="field full">
              <span>备注</span>
              <input v-model="form.remark" placeholder="补充该编码的用途说明" />
            </label>

            <div v-else class="field full">
              <span>目标用户</span>
              <AppSelect v-model="form.userId" :options="transferUserOptions" placeholder="请选择目标用户" />
            </div>
          </div>

          <div class="modal-actions">
            <button class="pill-button ghost" @click="closeDialog">取消</button>
            <button class="pill-button" :disabled="submitting || !canSubmit()" @click="submitForm">
              {{ submitting ? '提交中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      v-model="deleteDialogVisible"
      title="删除会话编码"
      :message="deleteMessage"
      :loading="deleting"
      @cancel="closeDeleteDialog"
      @confirm="deleteCode"
    />
  </div>
</template>

<style scoped>
.session-transfer-page .transfer-name-cell {
  padding-block: 2px;
}

.session-transfer-page .transfer-post-name {
  font-weight: 700;
  color: var(--text-main);
}

.session-transfer-page .code-row td {
  padding: 0;
}

.session-transfer-page .cell-hint {
  display: inline-block;
  margin-left: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.session-transfer-page .code-panel-cell {
  padding: 0;
}

.session-transfer-page .code-table-wrap {
  padding-left: 58px;
}

.session-transfer-page .code-table {
  min-width: 0;
}

.session-transfer-page .code-detail-row td {
  vertical-align: middle;
}

.session-transfer-page .code-detail-spacer {
  width: 1px;
  padding: 0;
}

.session-transfer-page .empty-inline {
  padding: 18px 0 18px 58px;
  color: var(--text-muted);
}

.session-transfer-page .field.full {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .session-transfer-page .code-table-wrap {
    padding-left: 22px;
  }

  .session-transfer-page .empty-inline {
    padding-left: 22px;
  }
}
</style>
