<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSession } from '../stores/session'

const router = useRouter()
const session = useSession()
const pageIndex = ref(0)

const userName = computed(() => {
  const user = session.user
  return user?.nickname || user?.username || '用户'
})

const iconMap = {
  '/home': '\u{1F3E0}',
  '/chat': '\u{1F4AC}',
  '/workbench': '\u{1F4BB}',
  '/agents': '\u{1F9E0}',
  '/params': '\u{2699}\u{FE0F}',
  '/WorkbenchView': '\u{1F916}',
  '/knowledge/products': '\u{1F3F7}\u{FE0F}',
  '/knowledge/portraits': '\u{1F464}',
  '/knowledge/trends': '\u{1F4C8}',
  '/logs/badcase': '\u{1F41E}',
  '/logs/observation-auth': '\u{1F50D}',
  '/logs/regression-review': '\u{2705}',
  '/logs/fix-queue': '\u{1F527}',
  '/logs/rule-library': '\u{2696}\u{FE0F}',
  '/logs/instructions': '\u{1F4D6}',
  '/users': '\u{1F465}',
  '/roles': '\u{1F3AD}',
  '/posts': '\u{1F3E2}',
  '/menus': '\u{1F4CB}',
  '/companies': '\u{1F3E6}',
  '/session-transfer': '\u{1F504}',
  '/api-demo': '\u{1F4F1}',
}

const sectionIconMap = {
  ai: '\u{1F4AC}',
  knowledge: '\u{1F4DA}',
  logs: '\u{1F4DD}',
  permission: '\u{1F510}',
}

const modules = computed(() => {
  const menus = session.user?.menus
  if (!Array.isArray(menus)) return []
  return menus
    .filter((m) => m.parentId != null && m.path)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((m) => ({
      title: m.name,
      remark: m.remark || '',
      path: m.path,
      section: m.section || '',
      icon: iconMap[m.path] || sectionIconMap[m.section] || '\u{1F4C1}',
    }))
})

const totalPages = computed(() => Math.max(1, Math.ceil(modules.value.length / 8)))

const pageModules = computed(() => {
  const start = pageIndex.value * 8
  return modules.value.slice(start, start + 8)
})

const slides = [
  { label: '接入模型', value: '6+', unit: '个', desc: 'DeepSeek / OpenAI / 通义千问 / 千帆 / 智谱 / Ollama' },
  { label: '管理用户', value: '128', unit: '人', desc: '多角色权限体系，支持精细化管理' },
  { label: '知识条目', value: '2,400+', unit: '条', desc: '涵盖产品库、企业画像、行业动态' },
  { label: '对话次数', value: '8.6K', unit: '次', desc: '累计完成智能问答与内容生成' },
]

function navigateTo(path) {
  router.push(path)
}

function prevPage() {
  if (pageIndex.value > 0) pageIndex.value--
}

function nextPage() {
  if (pageIndex.value < totalPages.value - 1) pageIndex.value++
}
</script>

<template>
  <div class="admin-scroll-page home-page">
    <section class="data-panel glass-card admin-scroll-panel home-panel">
      <div class="home-hero">
        <span class="home-eyebrow">模型一体化管理平台</span>
        <h2>
          欢迎回来，
          <span class="user-with-status">
            <span class="online-dot"></span>
            <span class="online-label">在线</span>
            {{ userName }}
          </span>
        </h2>
        <p>统一接入大模型能力，集成 AI 工作台、知识库、配置管理与权限体系，<br>用统一入口承接日常问答、模型接入、知识维护与后台管理。</p>
      </div>

      <div class="home-carousel">
        <div class="carousel-track">
          <div v-for="(slide, idx) in [...slides, ...slides]" :key="idx" class="carousel-card">
            <span class="carousel-label">{{ slide.label }}</span>
            <div class="carousel-value">
              <strong>{{ slide.value }}</strong>
              <small>{{ slide.unit }}</small>
            </div>
            <span class="carousel-desc">{{ slide.desc }}</span>
          </div>
        </div>
      </div>

      <div v-if="modules.length" class="home-section-header">
        <h3>功能模块</h3>
        <span class="section-subtitle">快速进入各业务模块</span>
      </div>

      <div v-if="modules.length" class="home-module-area">
        <button
          class="scroll-arrow scroll-left"
          :disabled="pageIndex === 0"
          @click="prevPage"
        >
          <span class="arrow-icon"></span>
        </button>

        <div class="home-grid">
          <article
            v-for="mod in pageModules"
            :key="mod.path"
            class="home-card"
            @click="navigateTo(mod.path)"
          >
            <div class="card-icon-wrap">
              <span class="card-icon">{{ mod.icon }}</span>
            </div>
            <div class="card-body">
              <strong>{{ mod.title }}</strong>
            </div>
            <p v-if="mod.remark" class="card-remark">{{ mod.remark }}</p>
          </article>
        </div>

        <button
          class="scroll-arrow scroll-right"
          :disabled="pageIndex >= totalPages - 1"
          @click="nextPage"
        >
          <span class="arrow-icon"></span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-panel {
  justify-content: flex-start;
  gap: 28px;
}

.home-hero {
  border-radius: 1.5rem;
  padding: 1.75rem 1.875rem;
  border: 1px solid var(--panel-card-border);
  background: var(--panel-card-bg);
  box-shadow: var(--panel-card-shadow), inset 0 1px 0 var(--surface-inset);
}

.home-eyebrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  background: var(--surface-accent-alt);
  color: var(--brand-alt);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.home-hero h2 {
  margin: 1.125rem 0 0.625rem;
  font-size: 1.625rem;
  color: var(--text-main);
}

.home-hero p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.8;
  font-size: 1rem;
}

.user-with-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.online-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
  animation: online-pulse 2s ease-in-out infinite;
}

@keyframes online-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(34, 197, 94, 0.4); transform: scale(1); }
  50% { box-shadow: 0 0 14px rgba(34, 197, 94, 0.8); transform: scale(1.12); }
}

.online-label {
  font-size: 0.8125rem;
  color: #22c55e;
  font-weight: 500;
}

/* Carousel */
.home-carousel {
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
  padding: 4px 0;
}

.carousel-track {
  display: flex;
  width: max-content;
  animation: carousel-scroll 24s linear infinite;
}

.carousel-card {
  flex: 0 0 220px;
  margin-right: 16px;
  padding: 1.125rem 1.25rem;
  border-radius: 1.125rem;
  border: 1px solid var(--panel-card-border);
  background: var(--panel-card-bg-soft);
  box-shadow: var(--panel-card-shadow), inset 0 1px 0 var(--surface-inset);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.carousel-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.carousel-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.carousel-value strong {
  font-size: 2rem;
  font-weight: 800;
  color: var(--brand);
  line-height: 1;
}

.carousel-value small {
  font-size: 1rem;
  color: var(--text-muted);
}

.carousel-desc {
  font-size: 1rem;
  color: var(--text-muted);
  line-height: 1.5;
}

@keyframes carousel-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .carousel-track { animation: none; }
}

/* Section header */
.home-section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.home-section-header h3 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--text-main);
}

.section-subtitle {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Module area: arrows + grid */
.home-module-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.875rem;
  flex: 1;
}

/* Arrows */
.scroll-arrow {
  flex: 0 0 auto;
  width: 40px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--panel-card-border);
  border-radius: 0.75rem;
  background: var(--panel-card-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.scroll-arrow:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: var(--surface-accent);
}

.scroll-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.arrow-icon {
  display: block;
  width: 12px;
  height: 12px;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
}

.scroll-left .arrow-icon {
  transform: rotate(-135deg);
}

.scroll-right .arrow-icon {
  transform: rotate(45deg);
}

/* Cards */
.home-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1.125rem 1.25rem;
  border-radius: 1.25rem;
  border: 1px solid var(--panel-card-border);
  background: var(--panel-card-bg);
  box-shadow: var(--panel-card-shadow), inset 0 1px 0 var(--surface-inset);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.home-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1), var(--panel-card-shadow), inset 0 1px 0 var(--surface-inset);
  border-color: var(--brand);
}

.card-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--surface-accent);
  flex-shrink: 0;
}

.card-icon {
  font-size: 20px;
  line-height: 1;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-body strong {
  display: block;
  font-size: 1rem;
  color: var(--text-main);
  font-weight: 600;
}

.card-remark {
  flex: 0 0 auto;
  max-width: 45%;
  margin: 0;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.5;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>


