<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSelect from '../components/AppSelect.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { AdminApi } from '../api'

const route = useRoute()

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const deleting = ref(false)

const importDialogVisible = ref(false)
const importSubmitting = ref(false)
const importFile = ref(null)
const importText = ref('')
const importPreviewRows = ref([])
const importPreviewErrors = ref([])
const importPreparedRows = ref([])

const editingKey = ref(null)
const pendingDeleteRow = ref(null)
const rows = ref([])

const filters = reactive({
  keyword: '',
  industry_code: '',
  is_active: ''
})

const form = reactive({})

const kbKey = computed(() => route.meta.kbKey || 'products')
const kindLabel = computed(() => route.meta.title || '知识库')
const importKindLabel = computed(() =>
  kbKey.value === 'products' ? '产品' : kbKey.value === 'portraits' ? '企业' : '动态'
)

const deleteDialogTitle = computed(() =>
  kbKey.value === 'products'
    ? '删除产品'
    : kbKey.value === 'portraits'
    ? '删除企业'
    : '删除动态'
)

const deleteDialogMessage = computed(() => {
  const row = pendingDeleteRow.value
  if (!row) return ''
  if (kbKey.value === 'products') {
    return `确认删除产品“${row.product_name}（${row.product_id}）”吗？`
  }
  if (kbKey.value === 'portraits') {
    return `确认删除企业“${row.company_name}”吗？`
  }
  return `确认删除动态 #${row.id} “${row.title}”吗？`
})

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
const INSIGHT_CATEGORY_OPTIONS = ['政策', '景气', '竞品', '热点', '舆情', '其他'].map((value) => ({
  label: value,
  value
}))
const ACTIVE_FILTER_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '启用', value: '1' },
  { label: '停用', value: '0' }
]

const IMPORT_FIELD_ALIASES = {
  products: {
    product_id: ['product_id', 'productid', 'id', '产品id', '产品编号', '编号'],
    product_name: ['product_name', 'productname', 'name', '产品名称', '产品名'],
    category: ['category', '类别', '大类'],
    subcategory: ['subcategory', '子类', '细分类型'],
    selling_points: ['selling_points', 'sellingpoints', '卖点', '产品卖点', '亮点'],
    fit_industries: ['fit_industries', '适配行业', '行业', 'target_industries'],
    fit_scales: ['fit_scales', '适配规模', '规模'],
    fit_client_tiers: ['fit_client_tiers', 'fit_tiers', '适配客户等级', '客户等级', 'client_tiers'],
    fit_aum_min: ['fit_aum_min', '最小aum', '最低aum', 'aum_min'],
    fit_aum_max: ['fit_aum_max', '最大aum', '最高aum', 'aum_max'],
    trigger_signals: ['trigger_signals', '触发信号', 'signals'],
    rate_range: ['rate_range', '利率区间', '费率区间', 'rate'],
    tenor_range: ['tenor_range', '期限区间', '期限', 'tenor'],
    is_active: ['is_active', 'active', 'status', '状态']
  },
  portraits: {
    company_name: ['company_name', 'company', 'name', '企业名称', '公司名称'],
    aliases: ['aliases', 'alias', '别名', '简称'],
    main_business: ['main_business', '主营业务', '主营'],
    industry_code: ['industry_code', '行业编码', '行业代码', 'industry'],
    industry_name: ['industry_name', '行业名称', '行业'],
    scale: ['scale', '规模'],
    client_tier: ['client_tier', '客户等级', '层级', 'tier'],
    region: ['region', '地区', '区域'],
    employee_count: ['employee_count', '员工人数', '人数'],
    aum: ['aum', 'aum展示', 'aum文本', '管理资产'],
    aum_numeric: ['aum_numeric', 'aum数值', '管理资产数值'],
    deposit_this_year: ['deposit_this_year', '今年存款', '年度存款'],
    loan_balance: ['loan_balance', '贷款余额'],
    held_products: ['held_products', '已持产品', '已购产品'],
    credit_due_days: ['credit_due_days', '授信到期天数', '授信剩余天数'],
    last_large_outflow_amt: ['last_large_outflow_amt', '近期大额流出', '流出金额'],
    export_oriented: ['export_oriented', '出口导向', '出口型'],
    is_group: ['is_group', '集团企业', '集团'],
    green_industry: ['green_industry', '绿色产业', '绿色'],
    msme_first_time: ['msme_first_time', '小微首贷', '首贷'],
    key_needs: ['key_needs', '关键需求', '需求'],
    contact_person: ['contact_person', '联系人'],
    contact_phone: ['contact_phone', '联系电话', '电话'],
    last_visit_date: ['last_visit_date', '上次拜访日期', '最近拜访日期'],
    last_visit_summary: ['last_visit_summary', '上次拜访摘要', '拜访摘要'],
    risk_preference: ['risk_preference', '风险偏好'],
    family_info: ['family_info', '家庭信息', '家庭备注'],
    is_active: ['is_active', 'active', 'status', '状态']
  },
  trends: {
    id: ['id', 'insight_id', '动态id'],
    industry_code: ['industry_code', '行业编码', '行业代码', 'industry'],
    insight_date: ['insight_date', 'date', '日期', '发布时间'],
    category: ['category', '类别', '类型'],
    title: ['title', '标题'],
    summary: ['summary', '摘要', '内容简介'],
    source: ['source', '来源'],
    is_active: ['is_active', 'active', 'status', '状态']
  }
}

const importHeaderHint = computed(() => {
  if (kbKey.value === 'products') {
    return 'product_id, product_name, category, subcategory, fit_industries, fit_scales, fit_client_tiers, is_active'
  }
  if (kbKey.value === 'portraits') {
    return 'company_name, industry_code, industry_name, scale, client_tier, held_products, key_needs, is_active'
  }
  return 'industry_code, insight_date, category, title, summary, source, is_active'
})

const importTextPlaceholder = computed(() => {
  if (kbKey.value === 'products') {
    return '示例：\nproduct_id,product_name,category,is_active\nP001,经营贷,贷款,1'
  }
  if (kbKey.value === 'portraits') {
    return '示例：\ncompany_name,industry_code,industry_name,scale,is_active\n宁波某科技,C3815,电子元件制造,中型,1'
  }
  return '示例：\nindustry_code,insight_date,category,title,summary,source,is_active\nC3815,2026-05-06,政策,行业新政发布,摘要内容,发改委,1'
})

function splitCsv(text) {
  return String(text || '')
    .split(/[,，、;\n\r\t]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinCsv(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '')
}

function normalizeString(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean)
  }
  if (value === null || value === undefined) {
    return []
  }
  return splitCsv(String(value))
}

function normalizeBoolean(value, fallback = true) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  const text = normalizeString(value).toLowerCase()
  if (['1', 'true', 'yes', 'y', 'on', 'enable', 'enabled', 'active', '启用', '开启', '是'].includes(text)) {
    return true
  }
  if (['0', 'false', 'no', 'n', 'off', 'disable', 'disabled', 'inactive', '停用', '禁用', '否'].includes(text)) {
    return false
  }
  return fallback
}

function normalizeNumber(value, fallback = 0, options = {}) {
  const { allowNull = false } = options
  if (value === null || value === undefined || value === '') {
    return allowNull ? null : fallback
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  const cleaned = String(value).trim().replace(/,/g, '').replace(/[^\d.-]/g, '')
  if (!cleaned) {
    return allowNull ? null : fallback
  }
  const num = Number(cleaned)
  if (!Number.isFinite(num)) {
    return allowNull ? null : fallback
  }
  return num
}

function excelSerialToDate(serial) {
  const wholeDays = Math.floor(Number(serial))
  if (!Number.isFinite(wholeDays)) return ''
  const date = new Date((wholeDays - 25569) * 86400 * 1000)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  if (typeof value === 'number') {
    return excelSerialToDate(value)
  }
  const text = normalizeString(value)
  if (!text) return ''
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split('-')
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split('/')
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
  }
  if (/^\d+(\.\d+)?$/.test(text) && Number(text) > 20000) {
    return excelSerialToDate(Number(text))
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return text.slice(0, 10)
  }
  return ''
}

function normalizeFieldName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-/]/g, '_')
}

function toNormalizedImportRecord(record) {
  const normalized = {}
  Object.entries(record || {}).forEach(([key, value]) => {
    normalized[normalizeFieldName(key)] = value
  })
  return normalized
}

function pickFirstValue(record, aliases) {
  for (const alias of aliases) {
    const value = record[normalizeFieldName(alias)]
    if (value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '')) {
      return value
    }
  }
  return undefined
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
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, emptyForm(kbKey.value))
  editingKey.value = null
}

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

function normalizeImportedRowByKey(record, key) {
  const source = toNormalizedImportRecord(record)
  const aliases = IMPORT_FIELD_ALIASES[key]

  if (key === 'products') {
    return {
      product_id: normalizeString(pickFirstValue(source, aliases.product_id)),
      product_name: normalizeString(pickFirstValue(source, aliases.product_name)),
      category: normalizeString(pickFirstValue(source, aliases.category)),
      subcategory: normalizeString(pickFirstValue(source, aliases.subcategory)),
      selling_points: normalizeString(pickFirstValue(source, aliases.selling_points)),
      fit_industries: normalizeList(pickFirstValue(source, aliases.fit_industries)),
      fit_scales: normalizeList(pickFirstValue(source, aliases.fit_scales)),
      fit_client_tiers: normalizeList(pickFirstValue(source, aliases.fit_client_tiers)),
      fit_aum_min: normalizeNumber(pickFirstValue(source, aliases.fit_aum_min), 0),
      fit_aum_max: normalizeNumber(pickFirstValue(source, aliases.fit_aum_max), 0),
      trigger_signals: normalizeList(pickFirstValue(source, aliases.trigger_signals)),
      rate_range: normalizeString(pickFirstValue(source, aliases.rate_range)),
      tenor_range: normalizeString(pickFirstValue(source, aliases.tenor_range)),
      is_active: normalizeBoolean(pickFirstValue(source, aliases.is_active), true) ? 1 : 0
    }
  }

  if (key === 'portraits') {
    const industryName = normalizeString(pickFirstValue(source, aliases.industry_name))
    return {
      company_name: normalizeString(pickFirstValue(source, aliases.company_name)),
      aliases: normalizeList(pickFirstValue(source, aliases.aliases)),
      main_business: normalizeString(pickFirstValue(source, aliases.main_business)),
      industry_code: normalizeString(pickFirstValue(source, aliases.industry_code)),
      industry_name: industryName,
      industry: industryName,
      scale: normalizeString(pickFirstValue(source, aliases.scale)) || '中型',
      client_tier: normalizeString(pickFirstValue(source, aliases.client_tier)) || '一般',
      region: normalizeString(pickFirstValue(source, aliases.region)),
      employee_count: normalizeNumber(pickFirstValue(source, aliases.employee_count), 0),
      aum: normalizeString(pickFirstValue(source, aliases.aum)),
      aum_numeric: normalizeNumber(pickFirstValue(source, aliases.aum_numeric), 0),
      deposit_this_year: normalizeString(pickFirstValue(source, aliases.deposit_this_year)),
      loan_balance: normalizeString(pickFirstValue(source, aliases.loan_balance)),
      held_products: normalizeList(pickFirstValue(source, aliases.held_products)),
      credit_due_days: normalizeNumber(pickFirstValue(source, aliases.credit_due_days), null, {
        allowNull: true
      }),
      last_large_outflow_amt: normalizeNumber(
        pickFirstValue(source, aliases.last_large_outflow_amt),
        0
      ),
      export_oriented: normalizeBoolean(pickFirstValue(source, aliases.export_oriented), false),
      is_group: normalizeBoolean(pickFirstValue(source, aliases.is_group), false),
      green_industry: normalizeBoolean(pickFirstValue(source, aliases.green_industry), false),
      msme_first_time: normalizeBoolean(pickFirstValue(source, aliases.msme_first_time), false),
      key_needs: normalizeList(pickFirstValue(source, aliases.key_needs)),
      contact_person: normalizeString(pickFirstValue(source, aliases.contact_person)),
      contact_phone: normalizeString(pickFirstValue(source, aliases.contact_phone)),
      last_visit_date: normalizeDate(pickFirstValue(source, aliases.last_visit_date)),
      last_visit_summary: normalizeString(pickFirstValue(source, aliases.last_visit_summary)),
      risk_preference: normalizeString(pickFirstValue(source, aliases.risk_preference)),
      family_info: normalizeString(pickFirstValue(source, aliases.family_info)),
      is_active: normalizeBoolean(pickFirstValue(source, aliases.is_active), true) ? 1 : 0
    }
  }

  const importedId = pickFirstValue(source, aliases.id)
  return {
    id: importedId === undefined || importedId === null || importedId === '' ? null : importedId,
    industry_code: normalizeString(pickFirstValue(source, aliases.industry_code)),
    insight_date: normalizeDate(pickFirstValue(source, aliases.insight_date)),
    category: normalizeString(pickFirstValue(source, aliases.category)) || '政策',
    title: normalizeString(pickFirstValue(source, aliases.title)),
    summary: normalizeString(pickFirstValue(source, aliases.summary)),
    source: normalizeString(pickFirstValue(source, aliases.source)),
    is_active: normalizeBoolean(pickFirstValue(source, aliases.is_active), true) ? 1 : 0
  }
}

function validateImportedRow(row, key) {
  const errors = []

  if (key === 'products') {
    if (!row.product_id) errors.push('缺少 product_id / 产品ID')
    if (!row.product_name) errors.push('缺少 product_name / 产品名称')
    if (
      row.fit_aum_max > 0 &&
      Number.isFinite(row.fit_aum_min) &&
      Number.isFinite(row.fit_aum_max) &&
      row.fit_aum_min > row.fit_aum_max
    ) {
      errors.push('fit_aum_min 不能大于 fit_aum_max')
    }
  } else if (key === 'portraits') {
    if (!row.company_name) errors.push('缺少 company_name / 公司名称')
    if (row.last_visit_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.last_visit_date)) {
      errors.push('last_visit_date 日期格式应为 YYYY-MM-DD')
    }
  } else {
    if (!row.industry_code) errors.push('缺少 industry_code / 行业编码')
    if (!row.insight_date) errors.push('缺少 insight_date / 日期')
    if (!row.title) errors.push('缺少 title / 标题')
    if (!row.summary) errors.push('缺少 summary / 摘要')
    if (row.insight_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.insight_date)) {
      errors.push('insight_date 日期格式应为 YYYY-MM-DD')
    }
  }

  return errors
}

function describeImportRow(payload, key) {
  if (key === 'products') {
    return `${payload.product_name || '未命名产品'} / ${payload.category || '未分类'}`
  }
  if (key === 'portraits') {
    return `${payload.company_name || '未命名企业'} / ${payload.industry_name || payload.industry_code || '未填写行业'}`
  }
  return `${payload.title || '未命名动态'} / ${payload.industry_code || '未填写行业'}`
}

function parseJsonInput(text) {
  const cleaned = String(text || '').replace(/^\uFEFF/, '').trim()
  const parsed = JSON.parse(cleaned)
  if (Array.isArray(parsed)) {
    return parsed
  }
  const moduleKey = kbKey.value === 'products' ? 'products' : kbKey.value === 'portraits' ? 'enterprises' : 'insights'
  const containerKeys = [moduleKey, 'items', 'rows', 'data', 'list']
  for (const key of containerKeys) {
    if (Array.isArray(parsed?.[key])) {
      return parsed[key]
    }
  }
  if (parsed && typeof parsed === 'object') {
    return [parsed]
  }
  throw new Error('JSON 内容中未找到可导入的数据')
}

function detectDelimiter(line) {
  const candidates = [',', '\t', ';', '|', '，']
  let winner = ','
  let maxCount = -1
  for (const delimiter of candidates) {
    const count = line.split(delimiter).length - 1
    if (count > maxCount) {
      winner = delimiter
      maxCount = count
    }
  }
  return winner
}

function parseDelimitedLine(line, delimiter) {
  const cells = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (char === delimiter && !insideQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function parseCsvInput(text) {
  const cleaned = String(text || '').replace(/^\uFEFF/, '').trim()
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('CSV/TXT 至少需要表头和一行数据')
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = parseDelimitedLine(lines[0], delimiter).map((item) => item.replace(/^\uFEFF/, '').trim())

  if (!headers.some(Boolean)) {
    throw new Error('无法识别导入表头')
  }

  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter)
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })
}

function buildImportPreview(records) {
  const previewRows = []
  const previewErrors = []
  const preparedRows = []

  records.forEach((record, index) => {
    const payload = normalizeImportedRowByKey(record, kbKey.value)
    const errors = validateImportedRow(payload, kbKey.value)
    const preview = {
      index: index + 1,
      payload,
      valid: errors.length === 0,
      errorText: errors.join('；'),
      summary: describeImportRow(payload, kbKey.value)
    }

    previewRows.push(preview)

    if (errors.length) {
      previewErrors.push(`第 ${index + 1} 行：${errors.join('；')}`)
    } else {
      preparedRows.push({
        index: index + 1,
        payload
      })
    }
  })

  importPreviewRows.value = previewRows
  importPreviewErrors.value = previewErrors
  importPreparedRows.value = preparedRows
}

async function loadData() {
  loading.value = true
  try {
    let list = []
    if (kbKey.value === 'products') {
      const resp = await AdminApi.listProducts()
      list = resp?.products || []
    } else if (kbKey.value === 'portraits') {
      const resp = await AdminApi.listEnterprises()
      list = resp?.enterprises || []
    } else {
      const resp = await AdminApi.listInsights(
        filters.industry_code ? { industry_code: filters.industry_code } : undefined
      )
      list = resp?.insights || []
    }
    rows.value = Array.isArray(list) ? list : []
  } catch (error) {
    rows.value = []
    window.alert(`加载失败：${error.message}`)
  } finally {
    loading.value = false
  }
}

const filteredRows = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const activeFilter = filters.is_active

  let list = rows.value
  if (activeFilter !== '') {
    const want = activeFilter === '1' ? 1 : 0
    list = list.filter((row) => (row.is_active === 0 ? 0 : 1) === want)
  }

  if (!keyword) return list

  return list.filter((row) => {
    let haystack = ''
    if (kbKey.value === 'products') {
      haystack = [
        row.product_id,
        row.product_name,
        row.category,
        row.subcategory,
        row.selling_points
      ].join(' ')
    } else if (kbKey.value === 'portraits') {
      haystack = [
        row.company_name,
        row.main_business,
        row.industry_name,
        row.industry_code,
        row.scale,
        row.client_tier,
        row.region
      ].join(' ')
    } else {
      haystack = [row.title, row.summary, row.source, row.category, row.industry_code].join(' ')
    }
    return haystack.toLowerCase().includes(keyword)
  })
})

const industryCodeOptions = ref([{ label: '全部行业', value: '' }])

async function refreshIndustryOptions() {
  try {
    const resp = await AdminApi.listEnterprises()
    const codes = Array.from(
      new Set((resp?.enterprises || []).map((item) => item.industry_code).filter(Boolean))
    ).sort()
    industryCodeOptions.value = [
      { label: '全部行业', value: '' },
      ...codes.map((code) => ({ label: code, value: code }))
    ]
  } catch (error) {
    // ignore
  }
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  Object.assign(form, emptyForm(kbKey.value), recordToForm(row))
  editingKey.value =
    kbKey.value === 'products'
      ? row.product_id
      : kbKey.value === 'portraits'
      ? row.company_name
      : row.id
  dialogVisible.value = true
}

async function submitForm() {
  submitting.value = true
  try {
    const body = formToBody()
    if (kbKey.value === 'products') {
      if (!body.product_id || !body.product_name) {
        window.alert('产品 ID 和产品名称必填。')
        return
      }
      await AdminApi.upsertProduct(body)
    } else if (kbKey.value === 'portraits') {
      if (!body.company_name) {
        window.alert('公司名称必填。')
        return
      }
      await AdminApi.upsertEnterprise(body)
    } else {
      if (!body.industry_code || !body.insight_date || !body.title || !body.summary) {
        window.alert('行业编码、日期、标题、摘要均必填。')
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
  } catch (error) {
    window.alert(`保存失败：${error.message}`)
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
  if (!row) return

  deleting.value = true
  try {
    if (kbKey.value === 'products') {
      await AdminApi.deleteProduct(row.product_id)
    } else if (kbKey.value === 'portraits') {
      await AdminApi.deleteEnterprise(row.company_name)
    } else {
      await AdminApi.deleteInsight(row.id)
    }
    closeRemoveDialog()
    await loadData()
  } catch (error) {
    window.alert(`删除失败：${error.message}`)
  } finally {
    deleting.value = false
  }
}

function resetImportState() {
  importFile.value = null
  importText.value = ''
  importPreviewRows.value = []
  importPreviewErrors.value = []
  importPreparedRows.value = []
}

function openImportDialog() {
  resetImportState()
  importDialogVisible.value = true
}

function closeImportDialog() {
  importDialogVisible.value = false
  resetImportState()
}

function onImportFileChange(event) {
  const file = event.target?.files?.[0] || null
  importFile.value = file
}

async function parseImportSource() {
  try {
    const fromText = importText.value.trim()
    const fromFile = importFile.value ? await importFile.value.text() : ''
    const source = (fromFile || fromText).trim()

    if (!source) {
      window.alert('请选择导入文件或粘贴导入内容。')
      return
    }

    const filename = importFile.value?.name?.toLowerCase() || ''
    const isJson = filename.endsWith('.json') || source.startsWith('{') || source.startsWith('[')
    const records = isJson ? parseJsonInput(source) : parseCsvInput(source)

    if (!Array.isArray(records) || records.length === 0) {
      window.alert('未解析到可导入数据。')
      importPreviewRows.value = []
      importPreviewErrors.value = []
      importPreparedRows.value = []
      return
    }

    buildImportPreview(records)
  } catch (error) {
    importPreviewRows.value = []
    importPreviewErrors.value = [error.message]
    importPreparedRows.value = []
    window.alert(`解析失败：${error.message}`)
  }
}

async function submitImportedRow(payload) {
  if (kbKey.value === 'products') {
    await AdminApi.upsertProduct(payload)
    return
  }
  if (kbKey.value === 'portraits') {
    await AdminApi.upsertEnterprise(payload)
    return
  }
  const body = {
    industry_code: payload.industry_code,
    insight_date: payload.insight_date,
    category: payload.category,
    title: payload.title,
    summary: payload.summary,
    source: payload.source,
    is_active: payload.is_active
  }
  if (payload.id) {
    await AdminApi.updateInsight(payload.id, body)
  } else {
    await AdminApi.createInsight(body)
  }
}

async function submitImport() {
  if (!importPreparedRows.value.length) {
    window.alert('没有可导入的数据，请先解析并修正错误。')
    return
  }

  importSubmitting.value = true

  const failures = []
  const failedPreviewRows = importPreviewRows.value.filter((item) => !item.valid)
  const failedPreparedRows = []
  let successCount = 0

  try {
    for (const item of importPreparedRows.value) {
      try {
        await submitImportedRow(item.payload)
        successCount += 1
      } catch (error) {
        const message = `第 ${item.index} 行提交失败：${error.message}`
        failures.push(message)
        failedPreparedRows.push(item)
        failedPreviewRows.push({
          index: item.index,
          payload: item.payload,
          valid: false,
          errorText: `提交失败：${error.message}`,
          summary: describeImportRow(item.payload, kbKey.value)
        })
      }
    }

    if (failures.length) {
      importPreparedRows.value = failedPreparedRows
      importPreviewRows.value = failedPreviewRows.sort((a, b) => a.index - b.index)
      importPreviewErrors.value = failures
      window.alert(`成功导入 ${successCount} 条，失败 ${failures.length} 条，请修正后重试。`)
    } else {
      closeImportDialog()
      window.alert(`成功导入 ${successCount} 条${importKindLabel.value}数据。`)
    }

    await loadData()
    if (kbKey.value === 'trends') {
      await refreshIndustryOptions()
    }
  } finally {
    importSubmitting.value = false
  }
}

watch(
  () => kbKey.value,
  async (key) => {
    filters.keyword = ''
    filters.industry_code = ''
    filters.is_active = ''
    dialogVisible.value = false
    closeRemoveDialog()
    closeImportDialog()
    resetForm()
    await loadData()
    if (key === 'trends') {
      await refreshIndustryOptions()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="admin-scroll-page">
    <section class="data-panel glass-card admin-scroll-panel">
      <div class="toolbar">
        <input
          v-model="filters.keyword"
          :placeholder="
            kbKey === 'products'
              ? '搜索产品 ID / 名称 / 类别'
              : kbKey === 'portraits'
              ? '搜索公司名称 / 行业 / 规模'
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
        <button class="pill-button" @click="openImportDialog">+ 导入{{ importKindLabel }}</button>
        <button class="pill-button" @click="openCreate">+ 新增{{ importKindLabel }}</button>
      </div>

      <div v-if="loading" class="empty-state panel-empty-state">数据加载中...</div>

      <div v-else-if="kbKey === 'products' && filteredRows.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>产品 ID</th>
              <th>产品名称</th>
              <th>类别</th>
              <th>适配行业 / 规模 / 等级</th>
              <th>利率 / 期限</th>
              <th class="nowrap-col">状态</th>
              <th class="nowrap-col">操作</th>
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
                <span v-for="item in row.fit_industries || []" :key="`i-${item}`" class="tag">{{ item }}</span>
                <span v-for="item in row.fit_scales || []" :key="`s-${item}`" class="tag green">{{ item }}</span>
                <span
                  v-for="item in row.fit_client_tiers || row.fit_tiers || []"
                  :key="`c-${item}`"
                  class="tag gray"
                >
                  {{ item }}
                </span>
                <span v-for="item in row.trigger_signals || []" :key="`g-${item}`" class="tag orange">
                  {{ item }}
                </span>
              </td>
              <td>
                {{ row.rate_range || '--' }}
                <div class="cell-hint">{{ row.tenor_range || '' }}</div>
              </td>
              <td class="nowrap-col">
                <span class="status-tag" :class="row.is_active === 0 ? 'inactive' : 'active'">
                  {{ row.is_active === 0 ? '停用' : '启用' }}
                </span>
              </td>
              <td class="nowrap-col">
                <div class="action-group">
                  <button class="tiny-button" @click="openEdit(row)">编辑</button>
                  <button class="tiny-button danger" @click="openRemoveDialog(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="kbKey === 'portraits' && filteredRows.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>公司名称 / 主营</th>
              <th>行业</th>
              <th>规模 / 等级</th>
              <th>AUM</th>
              <th>已持产品 / 关键标签</th>
              <th class="nowrap-col">状态</th>
              <th class="nowrap-col">操作</th>
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
                <span v-for="item in row.held_products || []" :key="`p-${item}`" class="tag">{{ item }}</span>
                <span v-for="item in row.key_needs || []" :key="`n-${item}`" class="tag gray">{{ item }}</span>
                <span v-if="row.export_oriented" class="tag orange">出口</span>
                <span v-if="row.is_group" class="tag">集团</span>
                <span v-if="row.green_industry" class="tag green">绿色</span>
                <span v-if="row.msme_first_time" class="tag green">小微首贷</span>
                <span
                  v-if="row.credit_due_days !== null && row.credit_due_days !== undefined"
                  class="tag gray"
                >
                  授信 {{ row.credit_due_days }} 天到期
                </span>
              </td>
              <td class="nowrap-col">
                <span class="status-tag" :class="row.is_active === 0 ? 'inactive' : 'active'">
                  {{ row.is_active === 0 ? '停用' : '启用' }}
                </span>
              </td>
              <td class="nowrap-col">
                <div class="action-group">
                  <button class="tiny-button" @click="openEdit(row)">编辑</button>
                  <button class="tiny-button danger" @click="openRemoveDialog(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="kbKey === 'trends' && filteredRows.length" class="table-wrap panel-scroll-region">
        <table class="data-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>行业</th>
              <th>类别</th>
              <th>标题 / 摘要</th>
              <th>来源</th>
              <th class="nowrap-col">状态</th>
              <th class="nowrap-col">操作</th>
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
              <td class="nowrap-col">
                <span class="status-tag" :class="row.is_active === 0 ? 'inactive' : 'active'">
                  {{ row.is_active === 0 ? '停用' : '启用' }}
                </span>
              </td>
              <td class="nowrap-col">
                <div class="action-group">
                  <button class="tiny-button" @click="openEdit(row)">编辑</button>
                  <button class="tiny-button danger" @click="openRemoveDialog(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state panel-empty-state">暂无{{ kindLabel }}数据。</div>
    </section>

    <Teleport to="body">
      <div v-if="dialogVisible" class="modal-mask" @click.self="dialogVisible = false">
        <div class="modal-panel glass-card">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">
                {{ editingKey ? '编辑' : '新增'
                }}{{ kbKey === 'products' ? '产品' : kbKey === 'portraits' ? '企业' : '动态' }}
                <span v-if="editingKey" class="modal-key">· {{ editingKey }}</span>
              </h3>
              <p class="modal-subtext">
                字段直接映射后台
                <code>{{
                  kbKey === 'products'
                    ? 'bank_products'
                    : kbKey === 'portraits'
                    ? 'enterprise_profiles'
                    : 'industry_insights'
                }}</code>
                表，保存后立即入库。
              </p>
            </div>
            <button class="pill-button ghost" @click="dialogVisible = false">关闭</button>
          </div>

          <div class="form-grid">
            <template v-if="kbKey === 'products'">
              <label class="field">
                <span>产品 ID *</span>
                <input v-model="form.product_id" :readonly="!!editingKey" placeholder="如 CL_WCRL" />
              </label>
              <label class="field">
                <span>产品名称 *</span>
                <input v-model="form.product_name" placeholder="如 优享小微流贷" />
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
                <textarea v-model="form.selling_points"></textarea>
              </label>
              <label class="field">
                <span>适配行业</span>
                <input v-model="form.fit_industries" placeholder="制造业, 外贸, 物流" />
              </label>
              <label class="field">
                <span>适配规模</span>
                <input v-model="form.fit_scales" placeholder="小微, 中型" />
              </label>
              <label class="field">
                <span>适配客户等级</span>
                <input v-model="form.fit_client_tiers" placeholder="一般, 重点客户" />
              </label>
              <label class="field">
                <span>AUM 最小值（万元）</span>
                <input v-model.number="form.fit_aum_min" type="number" placeholder="0" />
              </label>
              <label class="field">
                <span>AUM 最大值（万元，0=不限）</span>
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
                <span>行业编码</span>
                <input v-model="form.industry_code" placeholder="如 C3815" />
              </label>
              <label class="field">
                <span>行业名称</span>
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
                  placeholder="≤ 30 天会触发续授优先"
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
                <span>家庭 / 个人备注</span>
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

            <template v-else>
              <label class="field">
                <span>行业编码 *</span>
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

    <Teleport to="body">
      <div v-if="importDialogVisible" class="modal-mask" @click.self="closeImportDialog">
        <div class="modal-panel glass-card import-modal">
          <div class="modal-header">
            <div>
              <h3 style="margin: 0">导入{{ importKindLabel }}</h3>
              <p class="modal-subtext">
                支持 <code>JSON</code>、<code>CSV</code>、<code>TXT</code>。CSV/TXT 默认首行为表头，校验失败的记录不会被导入。
              </p>
            </div>
            <button class="pill-button ghost" @click="closeImportDialog">关闭</button>
          </div>

          <div class="import-layout">
            <section class="import-section">
              <h4 class="import-section-title">导入来源</h4>
              <label class="field full">
                <span>选择文件</span>
                <input
                  accept=".json,.csv,.txt,application/json,text/csv,text/plain"
                  type="file"
                  @change="onImportFileChange"
                />
              </label>
              <div v-if="importFile" class="import-file-name">已选择：{{ importFile.name }}</div>
              <label class="field full">
                <span>或粘贴内容</span>
                <textarea
                  v-model="importText"
                  class="import-textarea"
                  :placeholder="importTextPlaceholder"
                ></textarea>
              </label>
              <div class="import-tip-box">
                <div class="import-tip-title">推荐表头</div>
                <code>{{ importHeaderHint }}</code>
              </div>
              <div class="import-actions">
                <button class="pill-button secondary" @click="parseImportSource">解析预览</button>
                <button class="pill-button ghost" @click="resetImportState">清空内容</button>
              </div>
            </section>

            <section class="import-section">
              <div class="import-summary">
                <span>已解析 {{ importPreviewRows.length }} 条</span>
                <span>可导入 {{ importPreparedRows.length }} 条</span>
                <span>异常 {{ importPreviewErrors.length }} 条</span>
              </div>

              <div v-if="importPreviewRows.length" class="table-wrap import-preview-wrap">
                <table class="data-table import-preview-table">
                  <thead v-if="kbKey === 'products'">
                    <tr>
                      <th>#</th>
                      <th>产品 ID</th>
                      <th>产品名称</th>
                      <th>类别</th>
                      <th class="nowrap-col">状态</th>
                      <th>说明</th>
                    </tr>
                  </thead>
                  <thead v-else-if="kbKey === 'portraits'">
                    <tr>
                      <th>#</th>
                      <th>公司名称</th>
                      <th>行业</th>
                      <th>规模 / 等级</th>
                      <th class="nowrap-col">状态</th>
                      <th>说明</th>
                    </tr>
                  </thead>
                  <thead v-else>
                    <tr>
                      <th>#</th>
                      <th>日期</th>
                      <th>行业编码</th>
                      <th>标题</th>
                      <th class="nowrap-col">状态</th>
                      <th>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in importPreviewRows" :key="`${kbKey}-${item.index}`">
                      <template v-if="kbKey === 'products'">
                        <td>{{ item.index }}</td>
                        <td><code>{{ item.payload.product_id || '--' }}</code></td>
                        <td>{{ item.payload.product_name || '--' }}</td>
                        <td>
                          {{ item.payload.category || '--' }}
                          <div class="cell-hint">{{ item.payload.subcategory || '' }}</div>
                        </td>
                      </template>
                      <template v-else-if="kbKey === 'portraits'">
                        <td>{{ item.index }}</td>
                        <td>{{ item.payload.company_name || '--' }}</td>
                        <td>
                          {{ item.payload.industry_name || '--' }}
                          <div class="cell-hint">{{ item.payload.industry_code || '' }}</div>
                        </td>
                        <td>
                          {{ item.payload.scale || '--' }}
                          <div class="cell-hint">{{ item.payload.client_tier || '' }}</div>
                        </td>
                      </template>
                      <template v-else>
                        <td>{{ item.index }}</td>
                        <td>{{ item.payload.insight_date || '--' }}</td>
                        <td><code>{{ item.payload.industry_code || '--' }}</code></td>
                        <td>
                          {{ item.payload.title || '--' }}
                          <div class="cell-hint">{{ item.payload.category || '' }}</div>
                        </td>
                      </template>
                      <td class="nowrap-col">
                        <span class="status-tag" :class="item.valid ? 'active' : 'inactive'">
                          {{ item.valid ? '可导入' : '需修正' }}
                        </span>
                      </td>
                      <td>
                        <span v-if="item.valid">{{ item.summary }}</span>
                        <span v-else class="import-error-text">{{ item.errorText }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-else class="empty-state import-empty-state">选择文件或粘贴内容后，点击“解析预览”。</div>

              <div v-if="importPreviewErrors.length" class="import-error-panel">
                <div class="import-tip-title">异常明细</div>
                <ul class="import-error-list">
                  <li v-for="error in importPreviewErrors" :key="error">{{ error }}</li>
                </ul>
              </div>
            </section>
          </div>

          <div class="modal-actions">
            <button class="pill-button ghost" @click="closeImportDialog">取消</button>
            <button class="pill-button secondary" @click="parseImportSource">重新解析</button>
            <button
              class="pill-button"
              :disabled="importSubmitting || !importPreparedRows.length"
              @click="submitImport"
            >
              {{ importSubmitting ? '导入中...' : `确认导入 ${importPreparedRows.length} 条` }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      v-model="deleteDialogVisible"
      :title="deleteDialogTitle"
      :message="deleteDialogMessage"
      description="删除为软删除，不影响历史数据。"
      :loading="deleting"
      @cancel="closeRemoveDialog"
      @confirm="confirmRemove"
    />
  </div>
</template>

<style scoped>
.cell-hint {
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 2px;
}

.cell-multi {
  /* display: flex; */
  /* flex-wrap: wrap; */
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
  color: #15803d;
}

.tag.orange {
  background: rgba(237, 124, 71, 0.18);
  color: #c2410c;
}

.nowrap-col {
  white-space: nowrap;
}

.status-tag {
  white-space: nowrap;
}

.action-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
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

.import-modal {
  max-width: 1180px;
}

.field.full {
  grid-column: 1 / -1;
}

.modal-key {
  color: var(--text-muted);
  font-weight: normal;
}

.import-layout {
  display: grid;
  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
  gap: 20px;
}

.import-section {
  min-width: 0;
}

.import-section-title {
  margin: 0 0 12px;
  font-size: 16px;
}

.import-textarea {
  min-height: 220px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.import-file-name {
  margin: -4px 0 12px;
  color: var(--text-muted);
  font-size: 12px;
}

.import-tip-box,
.import-error-panel {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.04);
}

.import-tip-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.import-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.import-preview-wrap {
  max-height: 420px;
}

.import-preview-table td {
  vertical-align: top;
}

.import-empty-state {
  min-height: 220px;
}

.import-error-list {
  margin: 0;
  padding-left: 18px;
}

.import-error-list li + li {
  margin-top: 6px;
}

.import-error-text {
  color: #b91c1c;
}

@media (max-width: 960px) {
  .import-layout {
    grid-template-columns: 1fr;
  }

  .import-modal {
    max-width: 880px;
  }
}
</style>
