<script setup>
/**
 * AI 知识库 · 单组件三 Tab
 *
 * 路由 meta.kbKey 决定当前 Tab：
 *   - 'products'  → /api/admin/products       银行产品目录   (table: bank_products)
 *   - 'portraits' → /api/admin/enterprises    企业画像        (table: enterprise_profiles)
 *   - 'trends'    → /api/admin/insights       行业动态        (table: industry_insights)
 *
 * 三个域字段差异较大，用 v-if 分支渲染各自的列和表单。
 * 后端写接口由 _require_admin_writer 守卫；非管理员保存会回 401/403，
 * 这里直接把错误透出到 alert，不再前端预先隐藏按钮（避免身份判断口径分裂）。
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSelect from '../components/AppSelect.vue'
import { formatDateTime } from '../utils/format'
import { AdminApi } from '../api'

const route = useRoute()

// ---- state ----
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingKey = ref(null)        // 编辑时的主键值（product_id / company_name / insight id）
const rows = ref([])                  // 当前 tab 加载到的所有行（已缓存）
const filters = reactive({
  keyword: '',
  industry_code: '',                  // 仅 insights 用到
  is_active: ''                       // '1' / '0' / ''
})
const form = reactive({})             // 表单字段

const kbKey = computed(() => route.meta.kbKey || 'products')
const kindLabel = computed(() => route.meta.title || '知识库')

// ---- 三个域共享的下拉枚举 ----
const SCALE_OPTIONS = [
  { label: '小微', value: '小微' },
  { label: '中型', value: '中型' },
  { label: '大型', value: '大型' }
]
const TIER_OPTIONS = [
  { label: '一般', value: '一般' },
  { label: '重点客户', value: '重点客户' },
  { label: 'VIP', value: 'VIP' }
]
const INSIGHT_CATEGORY_OPTIONS = ['政策', '景气', '竞品', '热点', '舆情', '其他'].map((v) => ({
  label: v,
  value: v
}))
const ACTIVE_FILTER_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '启用', value: '1' },
  { label: '停用', value: '0' }
]

// ---- 工具函数 ----
function splitCsv(text) {
  return String(text || '')
    .split(/[,，、\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function joinCsv(arr) {
  return Array.isArray(arr) ? arr.join(', ') : String(arr || '')
}

function emptyForm(key) {
  if (key === 'products') {
    return {
      product_id: '',
      product_name: '',
      category: '',
      subcategory: '',
      selling_points: '',
      fit_industries: '',
      fit_scales: '',
      fit_client_tiers: '',
      fit_aum_min: 0,
      fit_aum_max: 0,
      trigger_signals: '',
      rate_range: '',
      tenor_range: '',
      is_active: 1
    }
  }
  if (key === 'portraits') {
    return {
      company_name: '',
      aliases: '',
      main_business: '',
      industry_code: '',
      industry_name: '',
      scale: '中型',
      client_tier: '一般',
      region: '',
      employee_count: 0,
      aum: '',
      aum_numeric: 0,
      deposit_this_year: '',
      loan_balance: '',
      held_products: '',
      credit_due_days: '',
      last_large_outflow_amt: 0,
      export_oriented: false,
      is_group: false,
      green_industry: false,
      msme_first_time: false,
      key_needs: '',
      contact_person: '',
      contact_phone: '',
      last_visit_date: '',
      last_visit_summary: '',
      risk_preference: '',
      family_info: '',
      is_active: 1
    }
  }
  // insights
  return {
    id: null,
    industry_code: '',
    insight_date: new Date().toISOString().slice(0, 10),
    category: '政策',
    title: '',
    summary: '',
    source: '',
    is_active: 1
  }
}

function resetForm() {
  Object.keys(form).forEach((k) => delete form[k])
  Object.assign(form, emptyForm(kbKey.value))
  editingKey.value = null
}

// 拉服务器原始记录后展开成可编辑表单（数组转 csv 文本、null 转空串等）
function recordToForm(record) {
  const key = kbKey.value
  if (key === 'products') {
    return {
      product_id: record.product_id || '',
      product_name: record.product_name || '',
      category: record.category || '',
      subcategory: record.subcategory || '',
      selling_points: record.selling_points || '',
      fit_industries: joinCsv(record.fit_industries),
      fit_scales: joinCsv(record.fit_scales),
      fit_client_tiers: joinCsv(record.fit_client_tiers || record.fit_tiers),
      fit_aum_min: Number(record.fit_aum_min || record.aum_min || 0),
      fit_aum_max: Number(record.fit_aum_max || record.aum_max || 0),
      trigger_signals: joinCsv(record.trigger_signals),
      rate_range: record.rate_range || '',
      tenor_range: record.tenor_range || '',
      is_active: record.is_active === 0 ? 0 : 1
    }
  }
  if (key === 'portraits') {
    return {
      company_name: record.company_name || '',
      aliases: joinCsv(record.aliases),
      main_business: record.main_business || '',
      industry_code: record.industry_code || '',
      industry_name: record.industry_name || record.industry || '',
      scale: record.scale || '中型',
      client_tier: record.client_tier || '一般',
      region: record.region || '',
      employee_count: Number(record.employee_count || 0),
      aum: record.aum || '',
      aum_numeric: Number(record.aum_numeric || 0),
      deposit_this_year: record.deposit_this_year || '',
      loan_balance: record.loan_balance || '',
      held_products: joinCsv(record.held_products),
      credit_due_days:
        record.credit_due_days === null || record.credit_due_days === undefined
          ? ''
          : Number(record.credit_due_days),
      last_large_outflow_amt: Number(record.last_large_outflow_amt || 0),
      export_oriented: !!record.export_oriented,
      is_group: !!record.is_group,
      green_industry: !!record.green_industry,
      msme_first_time: !!record.msme_first_time,
      key_needs: joinCsv(record.key_needs),
      contact_person: record.contact_person || '',
      contact_phone: record.contact_phone || '',
      last_visit_date: record.last_visit_date || '',
      last_visit_summary: record.last_visit_summary || '',
      risk_preference: record.risk_preference || '',
      family_info: record.family_info || '',
      is_active: record.is_active === 0 ? 0 : 1
    }
  }
  // insights
  return {
    id: record.id ?? null,
    industry_code: record.industry_code || '',
    insight_date: record.insight_date || '',
    category: record.category || '政策',
    title: record.title || '',
    summary: record.summary || '',
    source: record.source || '',
    is_active: record.is_active === 0 ? 0 : 1
  }
}

// 表单 → 后端 body
function formToBody() {
  const key = kbKey.value
  if (key === 'products') {
    return {
      product_id: form.product_id.trim(),
      product_name: form.product_name.trim(),
      category: form.category.trim(),
      subcategory: form.subcategory.trim(),
      selling_points: form.selling_points.trim(),
      fit_industries: splitCsv(form.fit_industries),
      fit_scales: splitCsv(form.fit_scales),
      fit_client_tiers: splitCsv(form.fit_client_tiers),
      fit_aum_min: Number(form.fit_aum_min || 0),
      fit_aum_max: Number(form.fit_aum_max || 0),
      trigger_signals: splitCsv(form.trigger_signals),
      rate_range: form.rate_range.trim(),
      tenor_range: form.tenor_range.trim(),
      is_active: form.is_active ? 1 : 0
    }
  }
  if (key === 'portraits') {
    const due = String(form.credit_due_days ?? '').trim()
    return {
      company_name: form.company_name.trim(),
      aliases: splitCsv(form.aliases),
      main_business: form.main_business.trim(),
      industry_code: form.industry_code.trim(),
      industry_name: form.industry_name.trim(),
      industry: form.industry_name.trim(),
      scale: form.scale,
      client_tier: form.client_tier,
      region: form.region.trim(),
      employee_count: Number(form.employee_count || 0),
      aum: form.aum.trim(),
      aum_numeric: Number(form.aum_numeric || 0),
      deposit_this_year: form.deposit_this_year.trim(),
      loan_balance: form.loan_balance.trim(),
      held_products: splitCsv(form.held_products),
      credit_due_days: due === '' ? null : Number(due),
      last_large_outflow_amt: Number(form.last_large_outflow_amt || 0),
      export_oriented: !!form.export_oriented,
      is_group: !!form.is_group,
      green_industry: !!form.green_industry,
      msme_first_time: !!form.msme_first_time,
      key_needs: splitCsv(form.key_needs),
      contact_person: form.contact_person.trim(),
      contact_phone: form.contact_phone.trim(),
      last_visit_date: form.last_visit_date,
      last_visit_summary: form.last_visit_summary.trim(),
      risk_preference: form.risk_preference.trim(),
      family_info: form.family_info.trim(),
      is_active: form.is_active ? 1 : 0
    }
  }
  // insights
  return {
    industry_code: form.industry_code.trim(),
    insight_date: form.insight_date,
    category: form.category,
    title: form.title.trim(),
    summary: form.summary.trim(),
    source: form.source.trim(),
    is_active: form.is_active ? 1 : 0
  }
}

// ---- 列表加载 ----
async function loadData() {
  loading.value = true
  try {
    const key = kbKey.value
    let list = []
    if (key === 'products') {
      const resp = await AdminApi.listProducts()
      list = resp?.products || []
    } else if (key === 'portraits') {
      const resp = await AdminApi.listEnterprises()
      list = resp?.enterprises || []
    } else if (key === 'trends') {
      const resp = await AdminApi.listInsights(
        filters.industry_code ? { industry_code: filters.industry_code } : undefined
      )
      list = resp?.insights || []
    }
    rows.value = Array.isArray(list) ? list : []
  } catch (e) {
    rows.value = []
    window.alert(`加载失败：${e.message}`)
  } finally {
    loading.value = false
  }
}

// 客户端搜索（与 admin.html 一致：拼几个字段做 includes）
const filteredRows = computed(() => {
  const q = filters.keyword.trim().toLowerCase()
  const activeFilter = filters.is_active
  let list = rows.value
  if (activeFilter !== '') {
    const want = activeFilter === '1' ? 1 : 0
    list = list.filter((r) => (r.is_active === 0 ? 0 : 1) === want)
  }
  if (!q) return list
  const key = kbKey.value
  return list.filter((r) => {
    let hay = ''
    if (key === 'products') {
      hay = [r.product_id, r.product_name, r.category, r.subcategory, r.selling_points].join(' ')
    } else if (key === 'portraits') {
      hay = [
        r.company_name,
        r.industry_name,
        r.industry_code,
        r.scale,
        r.client_tier,
        r.region
      ].join(' ')
    } else {
      hay = [r.title, r.summary, r.source, r.category, r.industry_code].join(' ')
    }
    return hay.toLowerCase().includes(q)
  })
})

// 行业过滤下拉（仅 trends Tab 用，从已加载的 enterprises 抽 industry_code）
const industryCodeOptions = ref([{ label: '全部行业', value: '' }])
async function refreshIndustryOptions() {
  try {
    const resp = await AdminApi.listEnterprises()
    const codes = Array.from(
      new Set((resp?.enterprises || []).map((e) => e.industry_code).filter(Boolean))
    ).sort()
    industryCodeOptions.value = [
      { label: '全部行业', value: '' },
      ...codes.map((c) => ({ label: c, value: c }))
    ]
  } catch (e) {
    /* 行业下拉拉不到不阻塞主功能 */
  }
}

// ---- 弹窗 / 保存 / 删除 ----
function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  Object.assign(form, emptyForm(kbKey.value), recordToForm(row))
  const key = kbKey.value
  editingKey.value =
    key === 'products' ? row.product_id : key === 'portraits' ? row.company_name : row.id
  dialogVisible.value = true
}

async function submitForm() {
  submitting.value = true
  try {
    const key = kbKey.value
    const body = formToBody()
    if (key === 'products') {
      if (!body.product_id || !body.product_name) {
        window.alert('产品 ID 和产品名称必填。')
        return
      }
      await AdminApi.upsertProduct(body)
    } else if (key === 'portraits') {
      if (!body.company_name) {
        window.alert('公司名称必填。')
        return
      }
      await AdminApi.upsertEnterprise(body)
    } else {
      if (!body.industry_code || !body.insight_date || !body.title || !body.summary) {
        window.alert('行业码 / 日期 / 标题 / 摘要 均必填。')
        return
      }
      if (editingKey.value) {
        await AdminApi.updateInsight(editingKey.value, body)
      } else {
        await AdminApi.createInsight(body)
      }
    }
    dialogVisible.value = false
    resetForm()
    await loadData()
  } catch (e) {
    window.alert(`保存失败：${e.message}`)
  } finally {
    submitting.value = false
  }
}

async function removeRow(row) {
  const key = kbKey.value
  const label =
    key === 'products'
      ? `产品「${row.product_name}」(${row.product_id})`
      : key === 'portraits'
      ? `企业「${row.company_name}」`
      : `动态 #${row.id}「${row.title}」`
  if (!window.confirm(`确认删除${label}？删除为软删除，不影响历史数据。`)) {
    return
  }
  try {
    if (key === 'products') {
      await AdminApi.deleteProduct(row.product_id)
    } else if (key === 'portraits') {
      await AdminApi.deleteEnterprise(row.company_name)
    } else {
      await AdminApi.deleteInsight(row.id)
    }
    await loadData()
  } catch (e) {
    window.alert(`删除失败：${e.message}`)
  }
}

// ---- 路由切换重置 ----
watch(
  () => kbKey.value,
  async (key) => {
    filters.keyword = ''
    filters.industry_code = ''
    filters.is_active = ''
    dialogVisible.value = false
    resetForm()
    await loadData()
    if (key === 'trends') {
      refreshIndustryOptions()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="admin-scroll-page">
    <section class="data-panel glass-card admin-scroll-panel">
      <!-- 工具栏 -->
      <div class="toolbar">
        <input
          v-model="filters.keyword"
          :placeholder="
            kbKey === 'products'
              ? '搜索产品 ID / 名称 / 类别'
              : kbKey === 'portraits'
              ? '搜索公司名 / 行业 / 规模'
              : '搜索标题 / 摘要 / 来源'
          "
        />
        <AppSelect
          v-if="kbKey === 'trends'"
          v-model="filters.industry_code"
          :options="industryCodeOptions"
          placeholder="全部行业"
          @update:model-value="loadData"
        />
        <AppSelect v-model="filters.is_active" :options="ACTIVE_FILTER_OPTIONS" placeholder="全部状态" />
        <button class="pill-button secondary" @click="loadData">刷新</button>
        <button
          class="pill-button ghost"
          @click="
            filters.keyword = '';
            filters.is_active = '';
            filters.industry_code = '';
            loadData();
          "
        >
          重置
        </button>
        <span class="toolbar-spacer"></span>
        <button class="pill-button" @click="openCreate">
          + 新增{{ kbKey === 'products' ? '产品' : kbKey === 'portraits' ? '企业' : '动态' }}
        </button>
      </div>

      <div v-if="loading" class="empty-state panel-empty-state">数据加载中...</div>

      <!-- ============ 产品库 ============ -->
      <div v-else-if="kbKey === 'products' && filteredRows.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>产品 ID</th>
              <th>产品名称</th>
              <th>类别</th>
              <th>适配行业 / 规模 / 等级</th>
              <th>利率 / 期限</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.product_id">
              <td><code>{{ row.product_id }}</code></td>
              <td>
                <strong>{{ row.product_name }}</strong>
                <div class="cell-hint">{{ row.selling_points || '' }}</div>
              </td>
              <td>
                {{ row.category || '--' }}
                <div class="cell-hint">{{ row.subcategory || '' }}</div>
              </td>
              <td class="cell-multi">
                <span v-for="t in (row.fit_industries || [])" :key="`i-${t}`" class="tag">{{ t }}</span>
                <span v-for="t in (row.fit_scales || [])" :key="`s-${t}`" class="tag green">{{ t }}</span>
                <span
                  v-for="t in (row.fit_client_tiers || row.fit_tiers || [])"
                  :key="`c-${t}`"
                  class="tag gray"
                >{{ t }}</span>
                <span v-for="t in (row.trigger_signals || [])" :key="`g-${t}`" class="tag orange">{{ t }}</span>
              </td>
              <td>
                {{ row.rate_range || '--' }}
                <div class="cell-hint">{{ row.tenor_range || '' }}</div>
              </td>
              <td>
                <span class="status-tag" :class="row.is_active === 0 ? 'inactive' : 'active'">
                  {{ row.is_active === 0 ? '停用' : '启用' }}
                </span>
              </td>
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

      <!-- ============ 企业画像 ============ -->
      <div v-else-if="kbKey === 'portraits' && filteredRows.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>公司名 / 主营</th>
              <th>行业</th>
              <th>规模 / 等级</th>
              <th>AUM</th>
              <th>已持产品 / 关键字段</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.company_name">
              <td>
                <strong>{{ row.company_name }}</strong>
                <div class="cell-hint">{{ row.main_business || '' }}</div>
              </td>
              <td>
                {{ row.industry_name || row.industry || '--' }}
                <div class="cell-hint">{{ row.industry_code || '' }}</div>
              </td>
              <td>
                {{ row.scale || '--' }}
                <div class="cell-hint">{{ row.client_tier || '' }}</div>
              </td>
              <td>
                {{ row.aum || '--' }}
                <div class="cell-hint">{{ row.aum_numeric || 0 }} 万</div>
              </td>
              <td class="cell-multi">
                <span v-for="t in (row.held_products || [])" :key="`p-${t}`" class="tag">{{ t }}</span>
                <span v-for="t in (row.key_needs || [])" :key="`n-${t}`" class="tag gray">{{ t }}</span>
                <span v-if="row.export_oriented" class="tag orange">出口</span>
                <span v-if="row.is_group" class="tag">集团</span>
                <span v-if="row.green_industry" class="tag green">绿色</span>
                <span v-if="row.msme_first_time" class="tag green">小微首贷</span>
                <span
                  v-if="row.credit_due_days !== null && row.credit_due_days !== undefined"
                  class="tag gray"
                >授信 {{ row.credit_due_days }} 天到期</span>
              </td>
              <td>
                <span class="status-tag" :class="row.is_active === 0 ? 'inactive' : 'active'">
                  {{ row.is_active === 0 ? '停用' : '启用' }}
                </span>
              </td>
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

      <!-- ============ 行业动态 ============ -->
      <div v-else-if="kbKey === 'trends' && filteredRows.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>行业</th>
              <th>类别</th>
              <th>标题 / 摘要</th>
              <th>来源</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.id">
              <td>{{ row.insight_date }}</td>
              <td><code>{{ row.industry_code || '--' }}</code></td>
              <td><span class="tag">{{ row.category || '--' }}</span></td>
              <td>
                <strong>{{ row.title }}</strong>
                <div class="cell-hint">{{ row.summary }}</div>
              </td>
              <td class="cell-hint">{{ row.source || '--' }}</td>
              <td>
                <span class="status-tag" :class="row.is_active === 0 ? 'inactive' : 'active'">
                  {{ row.is_active === 0 ? '停用' : '启用' }}
                </span>
              </td>
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

      <div v-else class="empty-state panel-empty-state">暂无{{ kindLabel }}数据。</div>
    </section>

    <!-- ============ 编辑弹窗 ============ -->
    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">
                {{ editingKey ? '编辑' : '新增'
                }}{{ kbKey === 'products' ? '产品' : kbKey === 'portraits' ? '企业' : '动态' }}
                <span v-if="editingKey" style="color: var(--text-muted); font-weight: normal">
                  · {{ editingKey }}
                </span>
              </h3>
              <p class="modal-subtext">
                字段直连后端
                <code>{{
                  kbKey === 'products'
                    ? 'bank_products'
                    : kbKey === 'portraits'
                    ? 'enterprise_profiles'
                    : 'industry_insights'
                }}</code>
                表，保存后立即落库。
              </p>
            </div>
            <button class="pill-button ghost" @click="dialogVisible = false">关闭</button>
          </div>

          <div class="form-grid">
            <!-- ----- 产品库表单 ----- -->
            <template v-if="kbKey === 'products'">
              <label class="field">
                <span>产品 ID *</span>
                <input
                  v-model="form.product_id"
                  :readonly="!!editingKey"
                  placeholder="如 CL_WCRL"
                />
              </label>
              <label class="field">
                <span>产品名称 *</span>
                <input v-model="form.product_name" placeholder="如 优秀小微流贷" />
              </label>
              <label class="field">
                <span>类别</span>
                <input v-model="form.category" placeholder="如 对公贷款" />
              </label>
              <label class="field">
                <span>子类</span>
                <input v-model="form.subcategory" placeholder="如 短期流动资金" />
              </label>
              <label class="field full">
                <span>卖点</span>
                <textarea v-model="form.selling_points" placeholder="1-2 句话卖点"></textarea>
              </label>
              <label class="field full">
                <span>适配行业（逗号分隔，空=全行业）</span>
                <input v-model="form.fit_industries" placeholder="C3815, C17" />
              </label>
              <label class="field">
                <span>适配规模（逗号分隔）</span>
                <input v-model="form.fit_scales" placeholder="小微, 中型" />
              </label>
              <label class="field">
                <span>客户等级（逗号分隔）</span>
                <input v-model="form.fit_client_tiers" placeholder="一般, 重点客户, VIP" />
              </label>
              <label class="field">
                <span>AUM 最小（万元）</span>
                <input v-model.number="form.fit_aum_min" type="number" placeholder="0" />
              </label>
              <label class="field">
                <span>AUM 最大（万元，0=不限）</span>
                <input v-model.number="form.fit_aum_max" type="number" placeholder="0" />
              </label>
              <label class="field full">
                <span>触发信号（逗号分隔）</span>
                <input
                  v-model="form.trigger_signals"
                  placeholder="credit_due_soon, large_outflow, export_oriented"
                />
              </label>
              <label class="field">
                <span>利率 / 费率</span>
                <input v-model="form.rate_range" placeholder="如 LPR+50bps" />
              </label>
              <label class="field">
                <span>期限</span>
                <input v-model="form.tenor_range" placeholder="如 12 个月" />
              </label>
              <label class="field">
                <span>状态</span>
                <AppSelect
                  v-model="form.is_active"
                  :options="[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]"
                />
              </label>
            </template>

            <!-- ----- 企业画像表单 ----- -->
            <template v-else-if="kbKey === 'portraits'">
              <label class="field">
                <span>公司名称 *</span>
                <input
                  v-model="form.company_name"
                  :readonly="!!editingKey"
                  placeholder="主键，编辑时不可修改"
                />
              </label>
              <label class="field">
                <span>别名（逗号分隔）</span>
                <input v-model="form.aliases" placeholder="华夏, 华夏科技" />
              </label>
              <label class="field full">
                <span>主营业务</span>
                <textarea v-model="form.main_business"></textarea>
              </label>
              <label class="field">
                <span>行业码</span>
                <input v-model="form.industry_code" placeholder="如 C3815" />
              </label>
              <label class="field">
                <span>行业</span>
                <input v-model="form.industry_name" placeholder="如 光伏组件制造" />
              </label>
              <label class="field">
                <span>规模</span>
                <AppSelect v-model="form.scale" :options="SCALE_OPTIONS" />
              </label>
              <label class="field">
                <span>客户等级</span>
                <AppSelect v-model="form.client_tier" :options="TIER_OPTIONS" />
              </label>
              <label class="field">
                <span>地区</span>
                <input v-model="form.region" />
              </label>
              <label class="field">
                <span>员工人数</span>
                <input v-model.number="form.employee_count" type="number" />
              </label>
              <label class="field">
                <span>AUM（展示文本）</span>
                <input v-model="form.aum" placeholder="如 2800万元" />
              </label>
              <label class="field">
                <span>AUM 数值（万元）</span>
                <input v-model.number="form.aum_numeric" type="number" step="0.01" />
              </label>
              <label class="field">
                <span>今年存款</span>
                <input v-model="form.deposit_this_year" placeholder="如 +350万元" />
              </label>
              <label class="field">
                <span>贷款余额</span>
                <input v-model="form.loan_balance" />
              </label>
              <label class="field full">
                <span>已持产品（产品 ID 列表，逗号分隔）</span>
                <input v-model="form.held_products" placeholder="CL_STWC, DEP_STD" />
              </label>
              <label class="field">
                <span>授信到期天数（留空=无授信）</span>
                <input
                  v-model="form.credit_due_days"
                  type="number"
                  placeholder="≤90 天会触发续授优先"
                />
              </label>
              <label class="field">
                <span>近期大额流出（万元）</span>
                <input v-model.number="form.last_large_outflow_amt" type="number" />
              </label>
              <label class="field full">
                <span>关键需求（逗号分隔）</span>
                <input v-model="form.key_needs" placeholder="应收账款保理, 外汇套保" />
              </label>
              <label class="field full checkbox-row">
                <span>标签</span>
                <div class="checkbox-group">
                  <label><input v-model="form.export_oriented" type="checkbox" /> 出口导向</label>
                  <label><input v-model="form.is_group" type="checkbox" /> 集团企业</label>
                  <label><input v-model="form.green_industry" type="checkbox" /> 绿色产业</label>
                  <label><input v-model="form.msme_first_time" type="checkbox" /> 小微首贷</label>
                </div>
              </label>
              <label class="field">
                <span>联系人</span>
                <input v-model="form.contact_person" />
              </label>
              <label class="field">
                <span>联系电话</span>
                <input v-model="form.contact_phone" />
              </label>
              <label class="field">
                <span>上次拜访日期</span>
                <input v-model="form.last_visit_date" type="date" />
              </label>
              <label class="field">
                <span>风险偏好</span>
                <input v-model="form.risk_preference" />
              </label>
              <label class="field full">
                <span>拜访摘要</span>
                <textarea v-model="form.last_visit_summary"></textarea>
              </label>
              <label class="field full">
                <span>家庭 / 个人备忘</span>
                <textarea v-model="form.family_info"></textarea>
              </label>
              <label class="field">
                <span>状态</span>
                <AppSelect
                  v-model="form.is_active"
                  :options="[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]"
                />
              </label>
            </template>

            <!-- ----- 行业动态表单 ----- -->
            <template v-else>
              <label class="field">
                <span>行业码 *</span>
                <input
                  v-model="form.industry_code"
                  placeholder="如 C3815，需与企业画像 industry_code 对齐"
                />
              </label>
              <label class="field">
                <span>日期 *</span>
                <input v-model="form.insight_date" type="date" />
              </label>
              <label class="field">
                <span>类别</span>
                <AppSelect v-model="form.category" :options="INSIGHT_CATEGORY_OPTIONS" />
              </label>
              <label class="field">
                <span>来源</span>
                <input v-model="form.source" placeholder="如 发改委公告" />
              </label>
              <label class="field full">
                <span>标题 *</span>
                <input v-model="form.title" />
              </label>
              <label class="field full">
                <span>摘要 *</span>
                <textarea v-model="form.summary" style="min-height: 110px"></textarea>
              </label>
              <label class="field">
                <span>状态</span>
                <AppSelect
                  v-model="form.is_active"
                  :options="[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]"
                />
              </label>
            </template>
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
.cell-hint {
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 2px;
}

.cell-multi {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: rgba(47, 131, 116, 0.12);
  color: var(--brand-alt, #2f8374);
}

.tag.gray {
  background: rgba(27, 37, 54, 0.08);
  color: var(--text-muted);
}

.tag.green {
  background: rgba(40, 160, 90, 0.14);
  color: #1f7a4c;
}

.tag.orange {
  background: rgba(237, 124, 71, 0.18);
  color: #b75726;
}

.checkbox-row .checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  margin-top: 6px;
}

.checkbox-row .checkbox-group label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: normal;
}

.modal-panel {
  max-width: 880px;
  width: 100%;
}

.field.full {
  grid-column: 1 / -1;
}
</style>
