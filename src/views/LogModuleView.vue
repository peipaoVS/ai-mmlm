<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSelect from '../components/AppSelect.vue'
import { api } from '../api/http'
import { formatDateTime } from '../utils/format'

const route = useRoute()

const AGENT_LABELS = {
  visit_assistant_agent: '访客辅助',
  rule_qa_agent: '规则答疑',
  admin_rule_qa_agent: '管理员规则'
}

const BADCASE_STATUS_LABELS = {
  open: '待处理',
  triaged: '已分诊',
  fixed: '已修复',
  wontfix: '不修复'
}

const REPAIR_TARGET_LABELS = {
  prompt: 'Prompt',
  tool: '工具',
  retrieval: '检索',
  guardrail: '防错护栏',
  observability: '可观测性',
  manual_review: '人工复核'
}

const REQUESTER_LEVEL_LABELS = {
  hq_admin: '总行管理员',
  branch_admin: '分行管理员',
  rm: '客户经理',
  observer: '观察员',
  admin: '管理员'
}

const OBSERVABILITY_ACTION_LABELS = {
  parse: '解析需求',
  confirm: '确认生成',
  rewrite: '改写内容',
  view: '查看报告',
  list: '查询列表',
  query: '规则问答',
  answer: '生成答复',
  generate: '生成内容',
  export: '导出内容'
}

const OBSERVABILITY_MESSAGE_ROLE_LABELS = {
  user: '用户',
  assistant: '助手',
  system: '系统',
  tool: '工具',
  developer: '开发指令'
}

const OBSERVABILITY_MODERATION_DIRECTION_LABELS = {
  input: '输入',
  output: '输出'
}

const OBSERVABILITY_MODERATION_ACTION_LABELS = {
  allow: '放行',
  block: '拦截',
  redact: '脱敏',
  review: '人工复核'
}

const OBSERVABILITY_GENERATION_STATUS_LABELS = {
  pending: '待处理',
  preparing: '准备中',
  generating: '生成中',
  completed: '已完成',
  failed: '失败'
}

const OBSERVABILITY_FIELD_LABELS = {
  action: '操作',
  report_id: '报告 ID',
  version: '版本',
  visit_time: '拜访时间',
  visit_location: '拜访地点',
  person: '拜访对象',
  report_send_time: '发送时间',
  remark: '备注',
  report_title: '报告标题',
  title: '标题',
  type: '类型',
  status: '状态',
  generation_status: '生成状态',
  created_at: '创建时间',
  updated_at: '更新时间',
  started_at: '开始时间',
  branch: '分行',
  home_branch: '所属分行',
  user_branch: '用户分行',
  user_level: '用户级别',
  user_level_label: '用户级别',
  report_content: '报告正文',
  full_report_content: '完整报告',
  brief_report_content: '简版报告',
  answer_text: '答复正文',
  answer_preview: '答复预览',
  raw_final_answer: '最终答复',
  result: '处理结果',
  summary: '摘要',
  content: '内容',
  task_name: '任务名称',
  task_type: '任务类型',
  sections: '报告章节',
  brief_sections: '简版章节'
}

const STRUCTURED_ANSWER_HIGHLIGHT_KEYS = [
  'action',
  'report_id',
  'version',
  'generation_status',
  'visit_time',
  'visit_location',
  'person',
  'report_send_time'
]

const STRUCTURED_ANSWER_TEXT_KEYS = [
  'report_content',
  'full_report_content',
  'brief_report_content',
  'answer_text',
  'raw_final_answer',
  'summary',
  'result',
  'content'
]

const PREVIEW_SECTION_LIMIT = 2
const PREVIEW_EXTRA_FIELD_LIMIT = 4

const PAGE_CONFIGS = {
  badcase: {
    // title: 'Badcase',
    // description: '对接 demo 中的 badcase 查询接口，按状态和智能体查看问题样本。',
    endpoints: ['/api/badcases']
  },
  observationAuth: {
    // title: '观测认证',
    // description: '对接 demo 中的 observability 日志接口，查看问题、答复、召回和合规信息。',
    endpoints: ['/api/observability/logs']
  },
  regressionReview: {
    // title: '回归评测',
    // description: '对接 demo 中的回归评测接口，查看 badcase 生成的回归用例。',
    endpoints: ['/api/regression/badcases']
  },
  fixQueue: {
    // title: '修复队列',
    // description: '对接 demo 中的 repair queue 接口，聚合展示修复目标与优先级。',
    endpoints: ['/api/repair-queue']
  },
  ruleLibrary: {
    // title: '规则库',
    // description: '对接 demo 中的规则目录、全文和章节查询接口，按范围浏览规则知识。',
    endpoints: ['/api/rule-kb/catalog', '/api/rule-kb/source', '/api/rule-kb/chapter']
  },
  instructions: {
    // title: '说明',
    // description: '说明页沿用 demo 中的帮助说明内容，不单独请求查询接口。',
    endpoints: []
  }
}

const agentOptions = [
  { label: '全部智能体', value: '' },
  { label: '访客辅助', value: 'visit_assistant_agent' },
  { label: '规则答疑', value: 'rule_qa_agent' },
  { label: '管理员规则', value: 'admin_rule_qa_agent' }
]

const badcaseStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '待处理', value: 'open' },
  { label: '已分诊', value: 'triaged' },
  { label: '已修复', value: 'fixed' },
  { label: '不修复', value: 'wontfix' }
]

const limitOptions = [
  { label: '10 条', value: '10' },
  { label: '20 条', value: '20' },
  { label: '50 条', value: '50' }
]

const instructions = [
  {
    title: '三种模式',
    text: '访客辅助负责生成访前报告与定时推送，规则答疑基于身份检索规则知识库，管理员规则支持答疑兼知识库维护。'
  },
  {
    title: '访客辅助动作',
    text: '解析描述、确认并生成报告、查看已有报告、改写报告是主流程；留空动作时系统会自动完成解析和生成。'
  },
  {
    title: '报告要素',
    text: '编辑报告要素时可结构化填写拜访时间、拜访地点、联系人、备注等信息。'
  },
  {
    title: '报告编号',
    text: '确认并生成后系统会自动回填报告编号，查看和改写报告时都依赖这个编号。'
  },
  {
    title: '任务面板',
    text: '任务面板支持查看、删除和修改定时任务，修改时可以只做预览不直接落库。'
  },
  {
    title: '会话历史',
    text: '会话历史可以按智能体查看，并把某一段历史消息重新载入当前会话继续使用。'
  },
  {
    title: '规则答疑',
    text: '分行为空时默认按当前身份可见范围检索；管理员还支持清空分行知识库与批量导入。'
  }
]

const loading = ref(false)
const errorMessage = ref('')
const listRows = ref([])
const summaryCards = ref([])
const summaryTags = ref([])
const ruleCatalog = ref([])
const ruleVisibleScopes = ref([])
const ruleSourceKind = ref('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailMode = ref('')
const detailTitle = ref('')
const detailSubtitle = ref('')
const detailPayload = ref(null)

const filters = reactive({
  badcaseStatus: '',
  badcaseAgent: '',
  observabilityAgent: '',
  observabilityKeyword: '',
  observabilityLimit: '20',
  regressionAgent: 'rule_qa_agent',
  regressionLimit: '20',
  repairAgent: 'rule_qa_agent',
  ruleBranch: '',
  ruleKeyword: ''
})

const pageKey = computed(() => {
  switch (route.name) {
    case 'logs-badcase':
      return 'badcase'
    case 'logs-observation-auth':
      return 'observationAuth'
    case 'logs-regression-review':
      return 'regressionReview'
    case 'logs-fix-queue':
      return 'fixQueue'
    case 'logs-rule-library':
      return 'ruleLibrary'
    case 'logs-instructions':
    default:
      return 'instructions'
  }
})

const currentPage = computed(() => PAGE_CONFIGS[pageKey.value] || PAGE_CONFIGS.instructions)
const pageTitle = computed(() => route.meta.title || currentPage.value.title)
const pageDescription = computed(() => currentPage.value.description)
const endpointList = computed(() => currentPage.value.endpoints)
const showToolbar = computed(() => pageKey.value !== 'instructions')

const filteredRuleCatalog = computed(() => {
  const keyword = filters.ruleKeyword.trim().toLowerCase()
  if (!keyword) {
    return ruleCatalog.value
  }

  return ruleCatalog.value
    .map((scope) => {
      const scopeName = toDisplayText(scope.scope, '').toLowerCase()
      const sourceList = asArray(scope.sources)
        .map((source) => {
          const sourceName = toDisplayText(source.source, '').toLowerCase()
          const preview = toDisplayText(source.preview, '').toLowerCase()
          const chapters = asArray(source.chapters).filter((chapter) =>
            toDisplayText(chapter, '').toLowerCase().includes(keyword)
          )

          const matched =
            scopeName.includes(keyword) ||
            sourceName.includes(keyword) ||
            preview.includes(keyword) ||
            chapters.length > 0

          if (!matched) {
            return null
          }

          return {
            ...source,
            chapters: chapters.length ? chapters : asArray(source.chapters)
          }
        })
        .filter(Boolean)

      if (!sourceList.length) {
        return null
      }

      return {
        ...scope,
        sources: sourceList
      }
    })
    .filter(Boolean)
})

watch(
  pageKey,
  async (key) => {
    resetPageState(key)
    await loadData()
  },
  { immediate: true }
)

function resetPageState(key) {
  loading.value = false
  errorMessage.value = ''
  listRows.value = []
  summaryCards.value = []
  summaryTags.value = []
  ruleCatalog.value = []
  ruleVisibleScopes.value = []
  ruleSourceKind.value = ''
  closeDetail()

  if (key === 'badcase') {
    filters.badcaseStatus = ''
    filters.badcaseAgent = ''
  } else if (key === 'observationAuth') {
    filters.observabilityAgent = ''
    filters.observabilityKeyword = ''
    filters.observabilityLimit = '20'
  } else if (key === 'regressionReview') {
    filters.regressionAgent = 'rule_qa_agent'
    filters.regressionLimit = '20'
  } else if (key === 'fixQueue') {
    filters.repairAgent = 'rule_qa_agent'
  } else if (key === 'ruleLibrary') {
    filters.ruleBranch = ''
    filters.ruleKeyword = ''
  }
}

function closeDetail() {
  detailVisible.value = false
  detailLoading.value = false
  detailError.value = ''
  detailMode.value = ''
  detailTitle.value = ''
  detailSubtitle.value = ''
  detailPayload.value = null
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function buildQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

function toDisplayText(value, fallback = '--') {
  if (value === null || value === undefined || value === '') {
    return fallback
  }
  return String(value)
}

function trimText(value, limit = 240) {
  const content = toDisplayText(value, '')
  if (!content) {
    return '（无）'
  }
  return content.length > limit ? `${content.slice(0, limit)}...` : content
}

function getAgentLabel(agentName) {
  return AGENT_LABELS[agentName] || toDisplayText(agentName)
}

function getBadcaseStatusLabel(status) {
  return BADCASE_STATUS_LABELS[status] || toDisplayText(status)
}

function getRepairTargetLabel(target) {
  return REPAIR_TARGET_LABELS[target] || toDisplayText(target)
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    return value.trim() !== ''
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  return true
}

function getTextOrEmpty(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function isPrimitiveArray(value) {
  return Array.isArray(value) &&
    value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item))
}

function localizeObservabilityAction(action) {
  return OBSERVABILITY_ACTION_LABELS[action] || toDisplayText(action)
}

function localizeMessageRole(role) {
  return OBSERVABILITY_MESSAGE_ROLE_LABELS[role] || toDisplayText(role)
}

function localizeModerationDirection(direction) {
  return OBSERVABILITY_MODERATION_DIRECTION_LABELS[direction] || toDisplayText(direction)
}

function localizeModerationAction(action) {
  return OBSERVABILITY_MODERATION_ACTION_LABELS[action] || toDisplayText(action)
}

function localizeGenerationStatus(status) {
  return OBSERVABILITY_GENERATION_STATUS_LABELS[status] || toDisplayText(status)
}

function getRequesterLevelLabel(level) {
  return REQUESTER_LEVEL_LABELS[level] || getTextOrEmpty(level)
}

function getObservabilityRequesterText(requester) {
  const info = requester || {}
  const name =
    info.display_name ||
    info.nickname ||
    info.username ||
    info.user_id ||
    '未知用户'
  const level = info.user_level_label || getRequesterLevelLabel(info.user_level)
  const branch = info.user_branch || info.branch || info.home_branch || ''

  return [name, level, branch].filter(Boolean).join(' · ')
}

function getObservabilityFieldLabel(key) {
  return OBSERVABILITY_FIELD_LABELS[key] || key
}

function pushJsonCandidate(candidates, candidate) {
  const normalized = getTextOrEmpty(candidate)
  if (!normalized || candidates.includes(normalized)) {
    return
  }

  candidates.push(normalized)
}

function parseJsonContent(value) {
  if (isPlainObject(value) || Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const content = value.trim()
  if (!content) {
    return null
  }

  const candidates = []
  pushJsonCandidate(candidates, content)

  const codeFenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeFenceMatch?.[1]) {
    pushJsonCandidate(candidates, codeFenceMatch[1])
  }

  const firstBraceIndex = content.indexOf('{')
  const lastBraceIndex = content.lastIndexOf('}')
  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    pushJsonCandidate(candidates, content.slice(firstBraceIndex, lastBraceIndex + 1))
  }

  const firstBracketIndex = content.indexOf('[')
  const lastBracketIndex = content.lastIndexOf(']')
  if (firstBracketIndex >= 0 && lastBracketIndex > firstBracketIndex) {
    pushJsonCandidate(candidates, content.slice(firstBracketIndex, lastBracketIndex + 1))
  }

  const looksLikeObjectFragment =
    /^"[^"]+"\s*:/.test(content) ||
    /^[A-Za-z0-9_]+\s*:/.test(content)

  if (looksLikeObjectFragment) {
    pushJsonCandidate(candidates, `{${content}}`)
  }

  for (const candidate of [...candidates]) {
    if (candidate.startsWith('{') && !candidate.endsWith('}')) {
      pushJsonCandidate(candidates, `${candidate}}`)
    }
    if (candidate.startsWith('[') && !candidate.endsWith(']')) {
      pushJsonCandidate(candidates, `${candidate}]`)
    }
  }

  for (const candidate of candidates) {
    if (!candidate || (!candidate.startsWith('{') && !candidate.startsWith('['))) {
      continue
    }

    try {
      return JSON.parse(candidate)
    } catch (error) {
      // Try next candidate.
    }
  }

  return null
}

function normalizeStructuredAnswerData(value) {
  const parsed = parseJsonContent(value)
  if (!parsed) {
    return null
  }

  if (!isPlainObject(parsed)) {
    return parsed
  }

  const normalized = { ...parsed }
  if (isPlainObject(parsed.task_payload)) {
    Object.entries(parsed.task_payload).forEach(([key, nestedValue]) => {
      if (!hasMeaningfulValue(normalized[key])) {
        normalized[key] = nestedValue
      }
    })
  }

  return normalized
}

function formatStructuredValue(key, value) {
  if (!hasMeaningfulValue(value)) {
    return '（无）'
  }

  if (key === 'action') {
    return localizeObservabilityAction(value)
  }

  if (key === 'generation_status') {
    return localizeGenerationStatus(value)
  }

  if (key === 'created_at' || key === 'updated_at' || key === 'started_at') {
    return formatDateTime(value)
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  if (isPrimitiveArray(value)) {
    return value.map((item) => toDisplayText(item, '（空）')).join('、')
  }

  return toDisplayText(value)
}

function normalizeStructuredSections(items, groupLabel) {
  return asArray(items)
    .map((section, index) => {
      if (typeof section === 'string') {
        return {
          groupLabel,
          title: `${groupLabel} ${index + 1}`,
          subtitle: '',
          body: section,
          bullets: []
        }
      }

      if (!isPlainObject(section)) {
        return null
      }

      const numeral = getTextOrEmpty(section.numeral)
      const baseTitle = section.title || section.heading || `第 ${index + 1} 节`
      const title = numeral ? `${numeral}. ${baseTitle}` : baseTitle
      const subtitle = section.heading && section.heading !== section.title ? section.heading : ''

      return {
        groupLabel,
        title,
        subtitle,
        body: getTextOrEmpty(section.body),
        bullets: asArray(section.bullets).map((item) => String(item)).filter(Boolean)
      }
    })
    .filter(Boolean)
}

const FRIENDLY_BODY_FIELD_KEYS = [
  'report_content',
  'full_report_content',
  'brief_report_content',
  'answer_text',
  'raw_final_answer',
  'summary',
  'result',
  'content'
]

const FRIENDLY_META_FIELD_KEYS = [
  'report_title',
  'title',
  'action',
  'report_id',
  'version',
  'status',
  'generation_status',
  'visit_time',
  'visit_location',
  'person',
  'report_send_time',
  'remark',
  'task_name',
  'task_type',
  'branch',
  'home_branch',
  'user_branch',
  'user_level_label',
  'user_level',
  'created_at',
  'updated_at',
  'started_at'
]

function dedupeTextLines(items) {
  const seen = new Set()

  return items.filter((item) => {
    const normalized = getTextOrEmpty(item)
    if (!normalized || seen.has(normalized)) {
      return false
    }

    seen.add(normalized)
    return true
  })
}

function formatFriendlyFieldLine(key, value) {
  return `${getObservabilityFieldLabel(key)}：${formatStructuredValue(key, value)}`
}

function formatStructuredSectionText(section, includeGroupLabel = true) {
  const lines = []
  const titleLine = includeGroupLabel ? `${section.groupLabel}：${section.title}` : section.title
  lines.push(titleLine)

  if (section.subtitle) {
    lines.push(section.subtitle)
  }

  if (section.body) {
    lines.push(formatAnswerTextAsChinese(section.body, { preferBodyOnly: true, depth: 1 }))
  }

  if (section.bullets.length) {
    section.bullets.forEach((bullet) => {
      lines.push(`- ${bullet}`)
    })
  }

  return lines.filter(Boolean).join('\n')
}

function extractStructuredBodyText(data, depth = 0) {
  if (!hasMeaningfulValue(data) || depth > 2) {
    return ''
  }

  if (Array.isArray(data)) {
    const parts = dedupeTextLines(
      data.map((item) => {
        if (!hasMeaningfulValue(item)) {
          return ''
        }

        if (isPlainObject(item) || Array.isArray(item)) {
          return formatStructuredDataAsChineseText(item, {
            preferBodyOnly: true,
            depth: depth + 1
          })
        }

        return formatAnswerTextAsChinese(item, {
          preferBodyOnly: true,
          depth: depth + 1
        })
      })
    )

    return parts
      .map((item, index) => (parts.length > 1 ? `条目 ${index + 1}\n${item}` : item))
      .join('\n\n')
  }

  if (!isPlainObject(data)) {
    return toDisplayText(data, '')
  }

  for (const key of FRIENDLY_BODY_FIELD_KEYS) {
    const content = getTextOrEmpty(data[key])
    if (!content) {
      continue
    }

    const nested = depth < 2 ? normalizeStructuredAnswerData(content) : null
    if (nested) {
      const nestedText = formatStructuredDataAsChineseText(nested, {
        preferBodyOnly: true,
        depth: depth + 1
      })

      if (nestedText) {
        return nestedText
      }
    }

    return content
  }

  const sections = [
    ...normalizeStructuredSections(data.sections, '报告章节'),
    ...normalizeStructuredSections(data.brief_sections, '简版章节')
  ]

  if (sections.length) {
    return sections.map((section) => formatStructuredSectionText(section, true)).join('\n\n')
  }

  return ''
}

function formatStructuredDataAsChineseText(data, options = {}) {
  const { preferBodyOnly = false, depth = 0 } = options

  if (!hasMeaningfulValue(data)) {
    return '（无）'
  }

  if (depth > 2) {
    return JSON.stringify(localizeStructuredDataKeys(data), null, 2)
  }

  if (Array.isArray(data)) {
    const bodyText = extractStructuredBodyText(data, depth)
    return bodyText || JSON.stringify(localizeStructuredDataKeys(data), null, 2)
  }

  if (!isPlainObject(data)) {
    return toDisplayText(data, '（无）')
  }

  const bodyText = extractStructuredBodyText(data, depth)
  if (preferBodyOnly && bodyText) {
    return bodyText
  }

  const metaLines = FRIENDLY_META_FIELD_KEYS
    .filter((key) => hasMeaningfulValue(data[key]))
    .map((key) => formatFriendlyFieldLine(key, data[key]))

  const extraLines = Object.entries(data)
    .filter(([key, value]) => !FRIENDLY_META_FIELD_KEYS.includes(key) && hasMeaningfulValue(value))
    .filter(([key]) => !FRIENDLY_BODY_FIELD_KEYS.includes(key) && key !== 'sections' && key !== 'brief_sections')
    .filter(([, value]) => typeof value !== 'function')
    .filter(([, value]) => isPrimitiveArray(value) || ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => formatFriendlyFieldLine(key, value))

  const parts = []
  if (metaLines.length) {
    parts.push(metaLines.join('\n'))
  }

  if (bodyText) {
    parts.push(bodyText)
  } else if (extraLines.length) {
    parts.push(extraLines.join('\n'))
  }

  return parts.filter(Boolean).join('\n\n') || JSON.stringify(localizeStructuredDataKeys(data), null, 2)
}

function formatAnswerTextAsChinese(value, options = {}) {
  if (!hasMeaningfulValue(value)) {
    return '（无）'
  }

  const normalized = normalizeStructuredAnswerData(value)
  if (!normalized) {
    return toDisplayText(value, '（无）')
  }

  return formatStructuredDataAsChineseText(normalized, options)
}

function formatLabeledMultilineValue(label, value) {
  const content = getTextOrEmpty(value)
  if (!content) {
    return `${label}：（无）`
  }

  return content.includes('\n') ? `${label}：\n${content}` : `${label}：${content}`
}

function formatStructuredDataAsChineseFields(data, options = {}) {
  const { depth = 0 } = options

  if (!hasMeaningfulValue(data)) {
    return '（无）'
  }

  if (depth > 2) {
    return JSON.stringify(localizeStructuredDataKeys(data), null, 2)
  }

  if (Array.isArray(data)) {
    return data
      .map((item, index) => {
        const content = isPlainObject(item) || Array.isArray(item)
          ? formatStructuredDataAsChineseFields(item, { depth: depth + 1 })
          : toDisplayText(item, '（空）')

        return content.includes('\n') ? `条目 ${index + 1}：\n${content}` : `条目 ${index + 1}：${content}`
      })
      .join('\n\n')
  }

  if (!isPlainObject(data)) {
    return toDisplayText(data, '（无）')
  }

  const lines = []

  FRIENDLY_META_FIELD_KEYS.forEach((key) => {
    if (!hasMeaningfulValue(data[key])) {
      return
    }

    lines.push(formatFriendlyFieldLine(key, data[key]))
  })

  FRIENDLY_BODY_FIELD_KEYS.forEach((key) => {
    if (!hasMeaningfulValue(data[key])) {
      return
    }

    const rawContent = getTextOrEmpty(data[key])
    const nested = depth < 2 ? normalizeStructuredAnswerData(rawContent) : null
    const content = nested
      ? formatStructuredDataAsChineseFields(nested, { depth: depth + 1 })
      : rawContent

    lines.push(formatLabeledMultilineValue(getObservabilityFieldLabel(key), content))
  })

  const sectionGroups = [
    ...normalizeStructuredSections(data.sections, '报告章节'),
    ...normalizeStructuredSections(data.brief_sections, '简版章节')
  ]
  sectionGroups.forEach((section) => {
    lines.push(formatStructuredSectionText(section, true))
  })

  Object.entries(data)
    .filter(([key, value]) => !FRIENDLY_META_FIELD_KEYS.includes(key) && hasMeaningfulValue(value))
    .filter(([key]) => !FRIENDLY_BODY_FIELD_KEYS.includes(key) && key !== 'sections' && key !== 'brief_sections')
    .filter(([, value]) => typeof value !== 'function')
    .filter(([, value]) => isPrimitiveArray(value) || ['string', 'number', 'boolean'].includes(typeof value))
    .forEach(([key, value]) => {
      lines.push(formatFriendlyFieldLine(key, value))
    })

  return dedupeTextLines(lines).join('\n\n') || JSON.stringify(localizeStructuredDataKeys(data), null, 2)
}

function formatAnswerTextAsChineseFields(value) {
  if (!hasMeaningfulValue(value)) {
    return '（无）'
  }

  const normalized = normalizeStructuredAnswerData(value)
  if (!normalized) {
    return toDisplayText(value, '（无）')
  }

  return formatStructuredDataAsChineseFields(normalized)
}

function buildStructuredAnswerView(data, depth = 0) {
  const emptyView = {
    structured: false,
    highlights: [],
    textBlocks: [],
    sections: [],
    extraFields: [],
    hasOverflow: false
  }

  if (!data) {
    return emptyView
  }

  if (Array.isArray(data)) {
    const textBlocks = data.slice(0, 2).map((item, index) => ({
      label: `条目 ${index + 1}`,
      content: isPlainObject(item) || Array.isArray(item)
        ? JSON.stringify(item, null, 2)
        : toDisplayText(item, '（空）')
    }))

    return {
      structured: true,
      highlights: [
        { label: '输出类型', value: '数组结果' },
        { label: '条目数量', value: data.length }
      ],
      textBlocks,
      sections: [],
      extraFields: [],
      hasOverflow: data.length > textBlocks.length
    }
  }

  const highlights = STRUCTURED_ANSWER_HIGHLIGHT_KEYS
    .filter((key) => hasMeaningfulValue(data[key]))
    .map((key) => ({
      label: getObservabilityFieldLabel(key),
      value: formatStructuredValue(key, data[key])
    }))

  const textBlocks = STRUCTURED_ANSWER_TEXT_KEYS
    .filter((key) => typeof data[key] === 'string' && data[key].trim())
    .map((key) => ({
      key,
      label: getObservabilityFieldLabel(key),
      content: data[key].trim(),
      structuredView:
        depth < 1
          ? buildStructuredAnswerView(normalizeStructuredAnswerData(data[key].trim()), depth + 1)
          : null
    }))

  const sections = [
    ...normalizeStructuredSections(data.sections, '报告章节'),
    ...normalizeStructuredSections(data.brief_sections, '简版章节')
  ]

  const usedKeys = new Set([
    ...STRUCTURED_ANSWER_HIGHLIGHT_KEYS,
    ...STRUCTURED_ANSWER_TEXT_KEYS,
    'sections',
    'brief_sections',
    'task_payload'
  ])

  const extraFields = Object.entries(data)
    .filter(([key, value]) => !usedKeys.has(key) && hasMeaningfulValue(value))
    .filter(([, value]) => typeof value !== 'function')
    .filter(([, value]) => isPrimitiveArray(value) || ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => ({
      label: getObservabilityFieldLabel(key),
      value: formatStructuredValue(key, value)
    }))

  return {
    structured: highlights.length > 0 || textBlocks.length > 0 || sections.length > 0 || extraFields.length > 0,
    highlights,
    textBlocks,
    sections,
    extraFields,
    hasOverflow:
      sections.length > PREVIEW_SECTION_LIMIT ||
      textBlocks.length > 1 ||
      extraFields.length > PREVIEW_EXTRA_FIELD_LIMIT
  }
}

function getObservabilityStructuredAnswer(item) {
  const candidates = [
    item?.assistant_payload,
    item?.answer_preview,
    item?.answer_text,
    item?.assistant_raw_content
  ]

  for (const candidate of candidates) {
    const normalized = normalizeStructuredAnswerData(candidate)
    if (normalized) {
      return normalized
    }
  }

  return null
}

function getObservabilityAnswerText(item) {
  const candidates = [
    item?.answer_text,
    item?.answer_preview,
    item?.assistant_raw_content
  ]

  for (const candidate of candidates) {
    const content = getTextOrEmpty(candidate)
    if (!content) {
      continue
    }

    if (parseJsonContent(candidate)) {
      continue
    }

    return content
  }

  return ''
}

function enhanceObservabilityItem(item) {
  const structuredAnswer = getObservabilityStructuredAnswer(item)
  const structuredAnswerView = buildStructuredAnswerView(structuredAnswer)
  const answerText = getObservabilityAnswerText(item)

  if (structuredAnswerView.structured && answerText) {
    const exists = structuredAnswerView.textBlocks.some((block) => block.content === answerText)
    if (!exists) {
      structuredAnswerView.textBlocks.unshift({
        key: 'answer_text_fallback',
        label: '答复正文',
        content: answerText
      })
    }

    structuredAnswerView.hasOverflow =
      structuredAnswerView.hasOverflow || structuredAnswerView.textBlocks.length > 1
  }

  return {
    ...item,
    __requesterText: getObservabilityRequesterText(item.requester),
    __answerText: answerText,
    __structuredAnswer: structuredAnswer,
    __structuredAnswerView: structuredAnswerView
  }
}

function formatModerationCategories(categories) {
  return asArray(categories).map((item) => String(item)).filter(Boolean).join('、') || '未命中分类'
}

function localizeStructuredDataKeys(value) {
  if (Array.isArray(value)) {
    return value.map((item) => localizeStructuredDataKeys(item))
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        getObservabilityFieldLabel(key),
        localizeStructuredDataKeys(nestedValue)
      ])
    )
  }

  return value
}

function formatLocalizedStructuredText(value) {
  if (!hasMeaningfulValue(value)) {
    return '（无）'
  }

  const parsed = parseJsonContent(value)
  if (!parsed) {
    return toDisplayText(value, '（无）')
  }

  return JSON.stringify(localizeStructuredDataKeys(parsed), null, 2)
}

function formatStructuredDebugText(value) {
  if (!hasMeaningfulValue(value)) {
    return '（无）'
  }

  if (typeof value === 'string') {
    const parsed = parseJsonContent(value)
    return parsed ? JSON.stringify(localizeStructuredDataKeys(parsed), null, 2) : value
  }

  return JSON.stringify(localizeStructuredDataKeys(value), null, 2)
}

function openObservabilityDetail(item) {
  detailMode.value = 'observability'
  detailVisible.value = true
  detailTitle.value = `观测日志 · ${getAgentLabel(item.agent_name)}`
  detailSubtitle.value = [
    formatDateTime(item.updated_at || item.started_at),
    `线程 ${toDisplayText(item.thread_id)}`,
    `运行 ${toDisplayText(item.run_id, '无 run_id')}`
  ].join(' · ')
  detailPayload.value = item
}

async function openRuleSource(scope, source) {
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detailMode.value = 'ruleSource'
  detailTitle.value = `${scope} · ${source}`
  detailSubtitle.value = '加载全文中...'
  detailPayload.value = null

  try {
    const payload = await api.get(
      `/api/rule-kb/source${buildQuery({
        scope,
        source
      })}`
    )

    detailPayload.value = payload
    detailSubtitle.value = [
      `${toDisplayText(payload.char_count, 0)} 字`,
      payload.managed_file ? `来源文件 ${toDisplayText(String(payload.managed_file).split(/[/\\]/).pop())}` : ''
    ]
      .filter(Boolean)
      .join(' · ')
  } catch (error) {
    detailError.value = error.message || '加载失败'
  } finally {
    detailLoading.value = false
  }
}

async function openRuleChapter(scope, source, chapter) {
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detailMode.value = 'ruleChapter'
  detailTitle.value = chapter
  detailSubtitle.value = '加载章节中...'
  detailPayload.value = null

  try {
    const payload = await api.get(
      `/api/rule-kb/chapter${buildQuery({
        scope,
        source,
        chapter
      })}`
    )

    detailPayload.value = payload
    detailSubtitle.value = [
      scope,
      source,
      `版本 v${toDisplayText(payload.version, '-')}`,
      payload.content_hash ? `指纹 ${String(payload.content_hash).slice(0, 8)}` : ''
    ]
      .filter(Boolean)
      .join(' · ')
  } catch (error) {
    detailError.value = error.message || '加载失败'
  } finally {
    detailLoading.value = false
  }
}

async function loadData() {
  if (pageKey.value === 'instructions') {
    // summaryCards.value = [
    //   { label: '说明条目', value: instructions.length, tone: 'brand' },
    //   { label: '来源', value: 'demo.html', tone: 'soft' }
    // ]
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    if (pageKey.value === 'badcase') {
      await loadBadcases()
    } else if (pageKey.value === 'observationAuth') {
      await loadObservability()
    } else if (pageKey.value === 'regressionReview') {
      await loadRegressionSuite()
    } else if (pageKey.value === 'fixQueue') {
      await loadRepairQueue()
    } else if (pageKey.value === 'ruleLibrary') {
      await loadRuleLibrary()
    }
  } catch (error) {
    errorMessage.value = error.message || '数据加载失败'
  } finally {
    loading.value = false
  }
}

async function loadBadcases() {
  const payload = await api.get(
    `/api/badcases${buildQuery({
      status: filters.badcaseStatus,
      source_agent: filters.badcaseAgent,
      limit: 100
    })}`
  )

  const items = asArray(payload.items)
  listRows.value = items
  summaryTags.value = []
  summaryCards.value = [
    // { label: '总数', value: payload.count ?? items.length, tone: 'brand' },
    // {
    //   label: '待处理',
    //   value: items.filter((item) => (item.status || 'open') === 'open').length,
    //   tone: 'warning'
    // },
    // {
    //   label: '已分诊',
    //   value: items.filter((item) => item.status === 'triaged').length,
    //   tone: 'soft'
    // },
    // {
    //   label: '已修复',
    //   value: items.filter((item) => item.status === 'fixed').length,
    //   tone: 'success'
    // }
  ]
}

async function loadObservability() {
  const payload = await api.get(
    `/api/observability/logs${buildQuery({
      agent_name: filters.observabilityAgent,
      keyword: filters.observabilityKeyword.trim(),
      limit: filters.observabilityLimit
    })}`
  )

  const items = asArray(payload.items).map((item) => enhanceObservabilityItem(item))
  const totalMessages = items.reduce(
    (sum, item) => sum + Number(item.message_count || asArray(item.messages).length || 0),
    0
  )
  const totalEvidence = items.reduce(
    (sum, item) =>
      sum + Number(item.retrieval?.evidence_count || asArray(item.retrieval?.items).length || 0),
    0
  )
  const totalReasoning = items.reduce(
    (sum, item) => sum + asArray(item.reasoning_steps).length,
    0
  )
  const totalModeration = items.reduce(
    (sum, item) => sum + asArray(item.moderation_logs).length,
    0
  )

  listRows.value = items
  summaryTags.value = []
  summaryCards.value = [
    // { label: '日志条数', value: items.length, tone: 'brand' },
    // { label: '消息总数', value: totalMessages, tone: 'soft' },
    // { label: '召回片段', value: totalEvidence, tone: 'success' },
    // { label: '合规记录', value: totalModeration + totalReasoning, tone: 'warning' }
  ]
}

async function loadRegressionSuite() {
  const payload = await api.get(
    `/api/regression/badcases${buildQuery({
      source_agent: filters.regressionAgent,
      limit: filters.regressionLimit
    })}`
  )

  const items = asArray(payload.cases)
  const primaryCauseCounts = payload.summary?.primary_cause_counts || {}

  listRows.value = items
  // summaryTags.value = Object.entries(primaryCauseCounts).map(([name, count]) => ({
  //   label: `${name} × ${count}`
  // }))
  summaryCards.value = [
    // { label: '回归用例', value: items.length, tone: 'brand' },
    // {
    //   label: '主因分类',
    //   value: Object.keys(primaryCauseCounts).length,
    //   tone: 'soft'
    // },
    // {
    //   label: '默认智能体',
    //   value: getAgentLabel(filters.regressionAgent),
    //   tone: 'success'
    // }
  ]
}

async function loadRepairQueue() {
  const payload = await api.get(
    `/api/repair-queue${buildQuery({
      source_agent: filters.repairAgent,
      limit: 100
    })}`
  )

  const items = asArray(payload.items)
  const openCount = items.reduce((sum, item) => sum + Number(item.open_count || 0), 0)
  const fixedCount = items.reduce((sum, item) => sum + Number(item.fixed_count || 0), 0)

  listRows.value = items
  summaryTags.value = []
  summaryCards.value = [
    // { label: '修复目标', value: payload.count ?? items.length, tone: 'brand' },
    // {
    //   label: '覆盖 Badcase',
    //   value: payload.covered_badcase_count ?? 0,
    //   tone: 'soft'
    // },
    // { label: '待处理', value: openCount, tone: 'warning' },
    // { label: '已修复', value: fixedCount, tone: 'success' }
  ]
}

async function loadRuleLibrary() {
  const payload = await api.get(
    `/api/rule-kb/catalog${buildQuery({
      branch: filters.ruleBranch.trim()
    })}`
  )

  const scopes = asArray(payload.scopes)
  const sourceCount = scopes.reduce((sum, scope) => sum + asArray(scope.sources).length, 0)
  const chapterCount = scopes.reduce(
    (sum, scope) =>
      sum +
      asArray(scope.sources).reduce(
        (inner, source) => inner + asArray(source.chapters).length,
        0
      ),
    0
  )

  ruleCatalog.value = scopes
  ruleVisibleScopes.value = asArray(payload.visible_scopes)
  ruleSourceKind.value = toDisplayText(payload.source_kind, '--')
  summaryTags.value = ruleVisibleScopes.value.map((scope) => ({
    label: scope
  }))
  summaryCards.value = [
    // { label: '可见范围', value: ruleVisibleScopes.value.length, tone: 'brand' },
    // { label: '规则来源', value: sourceCount, tone: 'soft' },
    // { label: '章节数量', value: chapterCount, tone: 'success' },
    // { label: '数据源', value: ruleSourceKind.value, tone: 'warning' }
  ]
}
</script>

<template>
  <section class="data-panel glass-card log-panel admin-scroll-panel">
    <div class="section-title page-head">
      <div>
        <h3 class="section-pill">{{ pageTitle }}</h3>
        <p>{{ pageDescription }}</p>
      </div>

      <div v-if="endpointList.length" class="endpoint-group">
        <!-- <span class="endpoint-caption">接口映射</span> -->
        <!-- <div class="endpoint-list">
          <code v-for="endpoint in endpointList" :key="endpoint" class="endpoint-code">
            {{ endpoint }}
          </code>
        </div> -->
      </div>
    </div>

    <div v-if="summaryCards.length" class="summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="summary-card"
        :class="card.tone"
      >
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </div>

    <div v-if="summaryTags.length" class="tag-row summary-tags">
      <span v-for="tag in summaryTags" :key="tag.label" class="info-tag">
        {{ tag.label }}
      </span>
    </div>

    <div v-if="showToolbar" class="toolbar log-toolbar">
      <template v-if="pageKey === 'badcase'">
        <div class="toolbar-field compact">
          <AppSelect
            v-model="filters.badcaseStatus"
            :options="badcaseStatusOptions"
            placeholder="全部状态"
          />
        </div>

        <div class="toolbar-field compact">
          <AppSelect
            v-model="filters.badcaseAgent"
            :options="agentOptions"
            placeholder="全部智能体"
          />
        </div>
      </template>

      <template v-else-if="pageKey === 'observationAuth'">
        <div class="toolbar-field compact">
          <AppSelect
            v-model="filters.observabilityAgent"
            :options="agentOptions"
            placeholder="全部智能体"
          />
        </div>

        <div class="toolbar-field wide">
          <input
            v-model="filters.observabilityKeyword"
            class="toolbar-input"
            placeholder="按问题 / 答复关键字过滤"
            @keyup.enter="loadData"
          />
        </div>

        <div class="toolbar-field compact">
          <AppSelect
            v-model="filters.observabilityLimit"
            :options="limitOptions"
            placeholder="20 条"
          />
        </div>
      </template>

      <template v-else-if="pageKey === 'regressionReview'">
        <div class="toolbar-field compact">
          <AppSelect
            v-model="filters.regressionAgent"
            :options="agentOptions"
            placeholder="全部智能体"
          />
        </div>

        <div class="toolbar-field compact">
          <AppSelect
            v-model="filters.regressionLimit"
            :options="limitOptions"
            placeholder="20 条"
          />
        </div>
      </template>

      <template v-else-if="pageKey === 'fixQueue'">
        <div class="toolbar-field compact">
          <AppSelect
            v-model="filters.repairAgent"
            :options="agentOptions"
            placeholder="全部智能体"
          />
        </div>
      </template>

      <template v-else-if="pageKey === 'ruleLibrary'">
        <div class="toolbar-field compact">
          <input
            v-model="filters.ruleBranch"
            class="toolbar-input"
            placeholder="分行名，留空使用当前可见范围"
            @keyup.enter="loadData"
          />
        </div>

        <div class="toolbar-field wide">
          <input
            v-model="filters.ruleKeyword"
            class="toolbar-input"
            placeholder="按范围 / 来源 / 章节关键字过滤"
          />
        </div>
      </template>

      <button class="pill-button secondary" @click="loadData">查询</button>
      <button
        class="pill-button ghost"
        @click="
          resetPageState(pageKey);
          loadData();
        "
      >
        重置
      </button>
    </div>

    <div class="panel-scroll-region log-scroll-body">
      <div v-if="loading" class="empty-state panel-empty-state">数据加载中...</div>
      <div v-else-if="errorMessage" class="empty-state error-state panel-empty-state">{{ errorMessage }}</div>

      <template v-else>
      <div v-if="pageKey === 'instructions'" class="instruction-grid instruction-card">
        <article v-for="item in instructions" :key="item.title">
          <!-- <span class="section-pill">说明</span> -->
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>

      <div v-else-if="pageKey === 'ruleLibrary'">
        <div v-if="ruleVisibleScopes.length" class="rule-meta-row">
          <span class="section-pill soft">数据源 {{ ruleSourceKind }}</span>
          <span v-for="scope in ruleVisibleScopes" :key="scope" class="info-tag">
            {{ scope }}
          </span>
        </div>

        <div v-if="filteredRuleCatalog.length" class="rule-library">
          <details
            v-for="scope in filteredRuleCatalog"
            :key="scope.scope"
            class="rule-scope"
            open
          >
            <summary>
              <div class="rule-scope-head">
                <div>
                  <strong>{{ scope.scope }}</strong>
                  <p>{{ asArray(scope.sources).length }} 个规则来源</p>
                </div>
              </div>
            </summary>

            <div class="rule-source-list">
              <details
                v-for="source in asArray(scope.sources)"
                :key="`${scope.scope}-${source.source}`"
                class="rule-source"
              >
                <summary>
                  <div class="rule-source-head">
                    <div>
                      <strong>{{ source.source }}</strong>
                      <p>{{ source.preview || '点击查看章节与全文' }}</p>
                    </div>

                    <div class="rule-source-side">
                      <span class="section-pill">{{ asArray(source.chapters).length }} 章</span>
                      <button
                        class="tiny-button"
                        @click.stop="openRuleSource(scope.scope, source.source)"
                      >
                        查看全文
                      </button>
                    </div>
                  </div>
                </summary>

                <div v-if="asArray(source.chapters).length" class="chapter-list">
                  <button
                    v-for="chapter in asArray(source.chapters)"
                    :key="`${scope.scope}-${source.source}-${chapter}`"
                    class="chapter-chip"
                    @click="openRuleChapter(scope.scope, source.source, chapter)"
                  >
                    {{ chapter }}
                  </button>
                </div>

                <div v-else class="empty-inline">该来源暂无章节目录</div>
              </details>
            </div>
          </details>
        </div>

        <div v-else class="empty-state panel-empty-state">当前没有匹配到规则目录数据。</div>
      </div>

      <div v-else-if="listRows.length" class="log-list">
        <article
          v-for="item in listRows"
          :key="
            item.id ||
            item.badcase_id ||
            item.run_id ||
            item.target ||
            `${item.scope || 'scope'}-${item.source || 'source'}`
          "
          class="log-entry"
        >
          <template v-if="pageKey === 'badcase'">
            <div class="entry-head">
              <div>
                <h3>#{{ item.id }} · {{ getAgentLabel(item.source_agent) }}</h3>
                <p>
                  {{ formatDateTime(item.created_at) }} · 上报人 {{ toDisplayText(item.reporter) }}
                  <template v-if="item.thread_id">
                    · 会话 {{ String(item.thread_id).slice(0, 8) }}
                  </template>
                  <template v-if="item.report_id"> · 报告 #{{ item.report_id }} </template>
                </p>
              </div>

              <span class="status-chip warning">{{ getBadcaseStatusLabel(item.status) }}</span>
            </div>

            <div v-if="asArray(item.tags_list).length" class="tag-row">
              <span v-for="tag in item.tags_list" :key="tag" class="info-tag">{{ tag }}</span>
            </div>

            <div v-if="item.reason" class="content-block">
              <strong>原因</strong>
              <p>{{ item.reason }}</p>
            </div>

            <div v-if="item.user_input" class="content-block">
              <strong>用户输入</strong>
              <p>{{ trimText(item.user_input, 420) }}</p>
            </div>

            <div v-if="item.agent_output" class="content-block">
              <strong>Agent 输出</strong>
              <p>{{ trimText(item.agent_output, 520) }}</p>
            </div>
          </template>

          <template v-else-if="pageKey === 'observationAuth'">
            <div class="entry-head">
              <div>
                <h3>{{ toDisplayText(item.requester?.nickname || item.requester?.username, '当前用户') }}</h3>
                <p>
                  {{ getAgentLabel(item.agent_name) }} · {{ localizeObservabilityAction(item.action) }} ·
                  {{ formatDateTime(item.updated_at || item.started_at) }}
                </p>
              </div>

              <span class="status-chip soft">{{ toDisplayText(item.run_id, '无 run_id') }}</span>
            </div>

            <div class="tag-row">
              <span class="info-tag">消息 {{ item.message_count || 0 }} 条</span>
              <span class="info-tag">
                召回
                {{ item.retrieval?.evidence_count || asArray(item.retrieval?.items).length || 0 }} 条
              </span>
              <span class="info-tag">思考 {{ asArray(item.reasoning_steps).length }} 步</span>
              <span class="info-tag">合规 {{ asArray(item.moderation_logs).length }} 条</span>
            </div>

            <div class="content-block">
              <strong>用户问题</strong>
              <p>{{ trimText(item.question, 280) }}</p>
            </div>

            <div class="content-block">
              <strong>答复预览</strong>
              <pre class="answer-preview-pre">{{ trimText(formatAnswerTextAsChineseFields(item.__structuredAnswer || item.__answerText || item.answer_preview || item.answer_text || item.assistant_raw_content), 420) }}</pre>
            </div>

            <div class="entry-actions">
              <button class="pill-button ghost" @click="openObservabilityDetail(item)">
                查看完整日志
              </button>
            </div>
          </template>

          <template v-else-if="pageKey === 'regressionReview'">
            <div class="entry-head">
              <div>
                <h3>#{{ toDisplayText(item.badcase_id) }} · {{ getAgentLabel(item.source_agent) }}</h3>
                <p>
                  {{ toDisplayText(item.expected_primary_cause, 'manual_review') }} ·
                  {{ toDisplayText(item.status) }} ·
                  {{ getRepairTargetLabel(item.repair_target) }}
                </p>
              </div>

              <span class="status-chip success">{{ getRepairTargetLabel(item.repair_target) }}</span>
            </div>

            <div class="content-block">
              <strong>问题</strong>
              <p>{{ trimText(item.user_input, 300) }}</p>
            </div>

            <div v-if="asArray(item.expected_checks).length" class="tag-row">
              <span v-for="check in item.expected_checks" :key="check" class="info-tag">
                {{ check }}
              </span>
            </div>

            <div v-if="item.reporter_feedback" class="content-block subtle">
              <strong>反馈</strong>
              <p>{{ item.reporter_feedback }}</p>
            </div>
          </template>

          <template v-else-if="pageKey === 'fixQueue'">
            <div class="entry-head">
              <div>
                <h3>{{ getRepairTargetLabel(item.target) }}</h3>
                <p>按修复目标聚合后的 badcase 队列</p>
              </div>

              <span class="status-chip brand">总数 {{ item.count || 0 }}</span>
            </div>

            <div class="tag-row">
              <span class="info-tag">待处理 {{ item.open_count || 0 }}</span>
              <span class="info-tag">已分诊 {{ item.triaged_count || 0 }}</span>
              <span class="info-tag">已修复 {{ item.fixed_count || 0 }}</span>
            </div>

            <div v-if="Object.keys(item.actions || {}).length" class="tag-row">
              <span
                v-for="(count, actionName) in item.actions"
                :key="`${item.target}-${actionName}`"
                class="info-tag soft"
              >
                {{ actionName }} × {{ count }}
              </span>
            </div>

            <div v-if="Object.keys(item.priorities || {}).length" class="tag-row">
              <span
                v-for="(count, priorityName) in item.priorities"
                :key="`${item.target}-${priorityName}`"
                class="info-tag success"
              >
                {{ String(priorityName).toUpperCase() }} × {{ count }}
              </span>
            </div>

            <details v-if="asArray(item.examples).length" class="entry-details">
              <summary>示例 badcase（{{ asArray(item.examples).length }}）</summary>
              <div class="detail-stack compact">
                <article
                  v-for="example in asArray(item.examples)"
                  :key="`${item.target}-${example.badcase_id}`"
                  class="detail-card"
                >
                  <strong>#{{ toDisplayText(example.badcase_id) }}</strong>
                  <p>{{ toDisplayText(example.primary_cause) }}</p>
                  <p>{{ toDisplayText(example.recommendation, '（无建议）') }}</p>
                </article>
              </div>
            </details>
          </template>
        </article>
      </div>

        <div v-else class="empty-state panel-empty-state">当前没有查询到对应数据。</div>
      </template>
    </div>

    <Teleport to="body">
      <div v-if="detailVisible" class="modal-mask" @click.self="closeDetail">
        <div class="modal-panel glass-card log-detail-modal" :class="{ wide: detailMode === 'observability' }">
          <div class="modal-header">
            <div>
              <h3>{{ detailTitle }}</h3>
              <p class="modal-subtext">{{ detailSubtitle }}</p>
            </div>
            <button class="pill-button ghost" @click="closeDetail">关闭</button>
          </div>

          <div v-if="detailLoading" class="empty-state">详情加载中...</div>
          <div v-else-if="detailError" class="empty-state error-state">{{ detailError }}</div>

          <template v-else-if="detailMode === 'observability' && detailPayload">
            <div class="detail-meta-grid">
              <div class="detail-meta-card">
                <span>使用人</span>
                <strong>
                  {{
                    toDisplayText(detailPayload.__requesterText, '当前用户')
                  }}
                </strong>
              </div>

              <div class="detail-meta-card">
                <span>时间</span>
                <strong>{{ formatDateTime(detailPayload.updated_at || detailPayload.started_at) }}</strong>
              </div>

              <div class="detail-meta-card">
                <span>线程 / 运行</span>
                <strong>
                  {{ toDisplayText(detailPayload.thread_id) }} /
                  {{ toDisplayText(detailPayload.run_id, '无 run_id') }}
                </strong>
              </div>

              <div class="detail-meta-card">
                <span>动作 / 范围</span>
                <strong>
                  {{ localizeObservabilityAction(detailPayload.action) }} /
                  {{
                    toDisplayText(
                      detailPayload.request_context?.branch ||
                        detailPayload.request_context?.home_branch
                    )
                  }}
                </strong>
              </div>
            </div>

            <details open class="entry-details">
              <summary>答复内容</summary>
              <pre
                class="detail-pre"
              >{{ formatAnswerTextAsChineseFields(detailPayload.__structuredAnswer || detailPayload.__answerText || detailPayload.answer_text || detailPayload.answer_preview || detailPayload.assistant_raw_content) }}</pre>
            </details>

            <details open class="entry-details">
              <summary>每轮对话内容（{{ asArray(detailPayload.messages).length }}）</summary>
              <div v-if="asArray(detailPayload.messages).length" class="detail-stack">
                <article
                  v-for="(message, index) in asArray(detailPayload.messages)"
                  :key="`${detailPayload.run_id || 'run'}-${index}`"
                  class="detail-card"
                >
                  <div class="detail-card-head">
                    <strong>{{ localizeMessageRole(message.role) }}</strong>
                    <span>{{ formatDateTime(message.created_at) }}</span>
                  </div>
                  <pre class="detail-pre">{{ formatLocalizedStructuredText(message.content) }}</pre>
                </article>
              </div>
              <div v-else class="empty-inline">无消息详情</div>
            </details>

            <details class="entry-details">
              <summary>
                数据召回内容（{{
                  detailPayload.retrieval?.evidence_count ||
                  asArray(detailPayload.retrieval?.items).length ||
                  0
                }}）
              </summary>
              <div v-if="asArray(detailPayload.retrieval?.items).length" class="detail-stack">
                <article
                  v-for="(evidence, index) in asArray(detailPayload.retrieval?.items)"
                  :key="`${detailPayload.run_id || 'run'}-evidence-${index}`"
                  class="detail-card"
                >
                  <div class="detail-card-head">
                    <strong>{{ toDisplayText(evidence.source || evidence.title, '命中文档') }}</strong>
                    <span>
                      {{ toDisplayText(evidence.scope) }} · {{ toDisplayText(evidence.chapter) }}
                    </span>
                  </div>
                  <p>{{ toDisplayText(evidence.quote, '（无摘录）') }}</p>
                  <details class="nested-detail">
                    <summary>查看完整命中</summary>
                    <pre class="detail-pre">{{ toDisplayText(evidence.full_text, '（无正文）') }}</pre>
                  </details>
                </article>
              </div>
              <div v-else class="empty-inline">无召回详情</div>
            </details>

            <details class="entry-details">
              <summary>思考流程（{{ asArray(detailPayload.reasoning_steps).length }}）</summary>
              <div v-if="asArray(detailPayload.reasoning_steps).length" class="detail-stack">
                <article
                  v-for="(step, index) in asArray(detailPayload.reasoning_steps)"
                  :key="`${detailPayload.run_id || 'run'}-reasoning-${index}`"
                  class="detail-card"
                >
                  <div class="detail-card-head">
                    <strong>步骤 {{ index + 1 }} · {{ toDisplayText(step.title, '处理步骤') }}</strong>
                  </div>
                  <pre class="detail-pre">{{ toDisplayText(step.body, '（无）') }}</pre>
                </article>
              </div>
              <div v-else class="empty-inline">无思考流程</div>
            </details>

            <details class="entry-details">
              <summary>合规日志（{{ asArray(detailPayload.moderation_logs).length }}）</summary>
              <div v-if="asArray(detailPayload.moderation_logs).length" class="detail-stack">
                <article
                  v-for="(log, index) in asArray(detailPayload.moderation_logs)"
                  :key="`${detailPayload.run_id || 'run'}-moderation-${index}`"
                  class="detail-card"
                >
                  <div class="detail-card-head">
                    <strong>{{ localizeModerationDirection(log.direction) }} / {{ localizeModerationAction(log.action) }}</strong>
                    <span>{{ formatDateTime(log.created_at) }}</span>
                  </div>
                  <p>{{ formatModerationCategories(log.categories) }}</p>
                  <pre class="detail-pre">{{ toDisplayText(log.snippet, '（无片段）') }}</pre>
                </article>
              </div>
              <div v-else class="empty-inline">本轮无合规日志</div>
            </details>

            <details v-if="detailPayload.__structuredAnswer" class="entry-details">
              <summary>结构化输出原文（调试）</summary>
              <pre class="detail-pre">{{ formatStructuredDebugText(detailPayload.__structuredAnswer) }}</pre>
            </details>

            <details class="entry-details">
              <summary>助手原始落库内容（调试）</summary>
              <pre class="detail-pre">{{ formatLocalizedStructuredText(detailPayload.assistant_raw_content) }}</pre>
            </details>
          </template>

          <template v-else-if="(detailMode === 'ruleSource' || detailMode === 'ruleChapter') && detailPayload">
            <pre class="detail-pre large">{{ toDisplayText(detailPayload.content, '（空）') }}</pre>
          </template>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.log-panel {
  display: flex;
  flex-direction: column;
  gap: calc(18px * var(--ui-scale));
}

.log-scroll-body {
  display: flex;
  flex-direction: column;
  gap: calc(14px * var(--ui-scale));
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: calc(16px * var(--ui-scale));
  align-items: flex-start;
}

.endpoint-group {
  min-width: min(23rem, 100%);
  display: flex;
  flex-direction: column;
  gap: calc(8px * var(--ui-scale));
}

.endpoint-caption {
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
  letter-spacing: 0.06em;
}

.endpoint-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: calc(8px * var(--ui-scale));
}

.endpoint-code {
  display: inline-flex;
  align-items: center;
  padding: calc(8px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: calc(14px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(27, 37, 54, 0.08);
  color: var(--text-main);
  font-size: calc(12px * var(--ui-scale));
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: calc(12px * var(--ui-scale));
}

.summary-card {
  padding: calc(16px * var(--ui-scale)) calc(18px * var(--ui-scale));
  border-radius: calc(20px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  background: rgba(255, 255, 255, 0.78);
  box-shadow:
    0 14px 28px rgba(29, 35, 52, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.summary-card span {
  display: block;
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
}

.summary-card strong {
  display: block;
  margin-top: calc(10px * var(--ui-scale));
  font-size: calc(22px * var(--ui-scale));
  line-height: 1.1;
  color: var(--text-main);
}

.summary-card.brand {
  background: linear-gradient(135deg, rgba(47, 131, 116, 0.12), rgba(255, 255, 255, 0.82));
}

.summary-card.soft {
  background: linear-gradient(135deg, rgba(87, 103, 132, 0.1), rgba(255, 255, 255, 0.82));
}

.summary-card.success {
  background: linear-gradient(135deg, rgba(67, 160, 71, 0.12), rgba(255, 255, 255, 0.82));
}

.summary-card.warning {
  background: linear-gradient(135deg, rgba(237, 124, 71, 0.12), rgba(255, 255, 255, 0.82));
}

.summary-tags {
  margin-top: calc(-4px * var(--ui-scale));
}

.log-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: calc(12px * var(--ui-scale));
  align-items: center;
}

.toolbar-field {
  min-width: min(100%, calc(220px * var(--ui-scale)));
}

.toolbar-field.compact {
  width: min(100%, calc(220px * var(--ui-scale)));
}

.toolbar-field.wide {
  flex: 1;
  min-width: min(100%, calc(320px * var(--ui-scale)));
}

.toolbar-input {
  width: 100%;
  min-height: calc(48px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.1);
  border-radius: calc(16px * var(--ui-scale));
  padding: calc(11px * var(--ui-scale)) calc(14px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-main);
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.toolbar-input:focus {
  border-color: rgba(237, 124, 71, 0.36);
  box-shadow:
    0 0 0 calc(3px * var(--ui-scale)) rgba(237, 124, 71, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.instruction-grid,
.log-list {
  display: grid;
  gap: calc(14px * var(--ui-scale));
}

.instruction-card,
.log-entry,
.detail-card,
.rule-scope,
.rule-source {
  border-radius: calc(22px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(247, 250, 255, 0.88));
  box-shadow:
    0 16px 30px rgba(29, 35, 52, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.instruction-card,
.log-entry {
  padding: calc(20px * var(--ui-scale));
}

.instruction-card h3,
.log-entry h3 {
  margin: calc(12px * var(--ui-scale)) 0 calc(8px * var(--ui-scale));
  font-size: calc(18px * var(--ui-scale));
}

.instruction-card p,
.content-block p,
.detail-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.entry-head,
.detail-card-head,
.rule-scope-head,
.rule-source-head {
  display: flex;
  justify-content: space-between;
  gap: calc(12px * var(--ui-scale));
  align-items: flex-start;
}

.entry-head h3,
.rule-source-head strong,
.rule-scope-head strong,
.detail-card-head strong {
  margin: 0;
}

.entry-head p,
.rule-source-head p,
.rule-scope-head p {
  margin: calc(6px * var(--ui-scale)) 0 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.status-chip,
.section-pill,
.info-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: calc(5px * var(--ui-scale)) calc(10px * var(--ui-scale));
  border-radius: 999px;
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  white-space: nowrap;
}

.status-chip.warning,
.section-pill {
  background: rgba(237, 124, 71, 0.12);
  color: var(--brand);
}

.status-chip.soft,
.section-pill.soft,
.info-tag.soft {
  background: rgba(87, 103, 132, 0.12);
  color: #546173;
}

.status-chip.success,
.info-tag.success {
  background: rgba(67, 160, 71, 0.14);
  color: #2f7f32;
}

.status-chip.brand {
  background: rgba(47, 131, 116, 0.12);
  color: var(--brand-alt);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: calc(8px * var(--ui-scale));
  margin-top: calc(14px * var(--ui-scale));
}

.info-tag {
  background: rgba(247, 249, 252, 1);
  color: var(--text-main);
  border: 1px solid rgba(27, 37, 54, 0.06);
}

.content-block {
  margin-top: calc(14px * var(--ui-scale));
  padding: calc(14px * var(--ui-scale)) calc(16px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(27, 37, 54, 0.05);
}

.content-block.subtle {
  background: rgba(248, 250, 254, 0.92);
}

.content-block strong {
  display: block;
  margin-bottom: calc(8px * var(--ui-scale));
  color: var(--text-main);
}

.structured-answer {
  display: grid;
  gap: calc(10px * var(--ui-scale));
  margin-top: calc(10px * var(--ui-scale));
}

.structured-highlight-grid,
.structured-extra-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: calc(10px * var(--ui-scale));
}

.structured-highlight-card,
.structured-extra-item,
.structured-text-card,
.structured-section-card {
  border-radius: calc(16px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(247, 250, 255, 0.88));
  box-shadow:
    0 10px 22px rgba(29, 35, 52, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.structured-highlight-card,
.structured-extra-item {
  padding: calc(12px * var(--ui-scale)) calc(14px * var(--ui-scale));
}

.structured-highlight-card span,
.structured-extra-item span {
  display: block;
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
}

.structured-highlight-card strong,
.structured-extra-item strong {
  display: block;
  margin-top: calc(6px * var(--ui-scale));
  color: var(--text-main);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.structured-text-list,
.structured-section-list {
  display: grid;
  gap: calc(10px * var(--ui-scale));
}

.structured-text-card,
.structured-section-card {
  padding: calc(14px * var(--ui-scale)) calc(16px * var(--ui-scale));
}

.structured-card-head,
.structured-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(10px * var(--ui-scale));
  flex-wrap: wrap;
}

.structured-card-head strong,
.structured-section-head strong {
  color: var(--text-main);
}

.structured-text-card p,
.structured-section-card p {
  margin: calc(10px * var(--ui-scale)) 0 0;
  color: var(--text-muted);
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.structured-section-kind {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: calc(4px * var(--ui-scale)) calc(10px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.12);
  color: var(--brand-alt);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  white-space: nowrap;
}

.structured-section-subtitle {
  margin-top: calc(8px * var(--ui-scale));
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
}

.structured-bullet-list {
  margin: calc(10px * var(--ui-scale)) 0 0;
  padding-left: calc(18px * var(--ui-scale));
  display: grid;
  gap: calc(6px * var(--ui-scale));
  color: var(--text-muted);
}

.structured-preview-note {
  margin: 0;
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
  line-height: 1.6;
}

.answer-preview-pre {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: "Microsoft YaHei UI", "PingFang SC", sans-serif;
}

.structured-pre {
  margin-top: calc(10px * var(--ui-scale));
}

.entry-actions {
  margin-top: calc(16px * var(--ui-scale));
  display: flex;
  justify-content: flex-end;
}

.rule-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: calc(8px * var(--ui-scale));
  margin-bottom: calc(12px * var(--ui-scale));
}

.rule-library {
  display: grid;
  gap: calc(12px * var(--ui-scale));
}

.rule-scope {
  padding: calc(14px * var(--ui-scale)) calc(16px * var(--ui-scale));
}

.rule-scope > summary,
.rule-source > summary,
.entry-details > summary,
.nested-detail > summary {
  cursor: pointer;
  list-style: none;
}

.rule-scope > summary::-webkit-details-marker,
.rule-source > summary::-webkit-details-marker,
.entry-details > summary::-webkit-details-marker,
.nested-detail > summary::-webkit-details-marker {
  display: none;
}

.rule-source-list {
  display: grid;
  gap: calc(10px * var(--ui-scale));
  margin-top: calc(12px * var(--ui-scale));
}

.rule-source {
  padding: calc(12px * var(--ui-scale)) calc(14px * var(--ui-scale));
}

.rule-source-side {
  display: flex;
  align-items: center;
  gap: calc(8px * var(--ui-scale));
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chapter-list {
  display: flex;
  flex-wrap: wrap;
  gap: calc(8px * var(--ui-scale));
  margin-top: calc(12px * var(--ui-scale));
}

.chapter-chip {
  border: 1px solid rgba(27, 37, 54, 0.08);
  border-radius: 999px;
  padding: calc(8px * var(--ui-scale)) calc(12px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.94);
  color: var(--text-main);
}

.chapter-chip:hover {
  border-color: rgba(47, 131, 116, 0.24);
  color: var(--brand-alt);
}

.entry-details {
  margin-top: calc(14px * var(--ui-scale));
  padding: calc(14px * var(--ui-scale)) calc(16px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(27, 37, 54, 0.05);
}

.entry-details > summary,
.nested-detail > summary {
  color: var(--text-main);
  font-weight: 700;
}

.detail-stack {
  display: grid;
  gap: calc(10px * var(--ui-scale));
  margin-top: calc(12px * var(--ui-scale));
}

.detail-stack.compact {
  margin-top: calc(10px * var(--ui-scale));
}

.detail-card {
  padding: calc(14px * var(--ui-scale)) calc(16px * var(--ui-scale));
}

.detail-card-head span {
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
}

.detail-pre {
  margin: calc(10px * var(--ui-scale)) 0 0;
  padding: calc(14px * var(--ui-scale)) calc(16px * var(--ui-scale));
  border-radius: calc(16px * var(--ui-scale));
  background: rgba(248, 250, 254, 0.96);
  border: 1px solid rgba(27, 37, 54, 0.08);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: "Microsoft YaHei UI", "PingFang SC", sans-serif;
  line-height: 1.75;
  color: var(--text-main);
}

.detail-pre.large {
  max-height: calc(62vh * var(--ui-scale));
  overflow: auto;
}

.nested-detail {
  margin-top: calc(10px * var(--ui-scale));
}

.empty-inline {
  margin-top: calc(10px * var(--ui-scale));
  color: var(--text-muted);
}

.error-state {
  color: #b42318;
  background: rgba(254, 242, 242, 0.82);
}

.log-detail-modal {
  width: min(42rem, calc(100vw - 2rem));
  max-height: calc(88vh * var(--ui-scale));
  overflow: auto;
}

.log-detail-modal.wide {
  width: min(62rem, calc(100vw - 2rem));
}

.detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  gap: calc(10px * var(--ui-scale));
}

.detail-meta-card {
  padding: calc(12px * var(--ui-scale)) calc(14px * var(--ui-scale));
  border-radius: calc(18px * var(--ui-scale));
  background: rgba(248, 250, 254, 0.92);
  border: 1px solid rgba(27, 37, 54, 0.06);
}

.detail-meta-card span {
  display: block;
  color: var(--text-muted);
  font-size: calc(12px * var(--ui-scale));
}

.detail-meta-card strong {
  display: block;
  margin-top: calc(6px * var(--ui-scale));
  line-height: 1.6;
}

@media (max-width: 1080px) {
  .page-head {
    flex-direction: column;
  }

  .endpoint-list {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .log-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-field,
  .toolbar-field.compact,
  .toolbar-field.wide {
    width: 100%;
    min-width: 0;
  }

  .entry-head,
  .detail-card-head,
  .rule-scope-head,
  .rule-source-head {
    flex-direction: column;
  }

  .entry-actions {
    justify-content: flex-start;
  }
}
</style>
