<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const pageTitle = computed(() => route.meta.title || '日志')
const description = computed(
  () => route.meta.description || '当前为预留页面，后续接入真实接口后前端结构无需重写。'
)

const cards = computed(() => [
  {
    label: 'Source',
    title: '接口预留',
    text: '当前页面保留了标题、结构和卡片区块，后续只需要替换成真实日志接口即可。'
  },
  {
    label: 'Workflow',
    title: '流程承接',
    text: '可继续扩展筛选、列表、详情、审核、导出等交互，而无需重新搭建页面骨架。'
  },
  {
    label: 'Delivery',
    title: '后续扩展',
    text: '根据业务需要可以接入表格、状态流转、统计图表和操作记录。'
  }
])
</script>

<template>
  <section class="data-panel glass-card log-panel">
    <div class="section-title">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>{{ description }}</p>
      </div>
    </div>

    <div class="log-grid">
      <article v-for="card in cards" :key="card.title" class="log-card">
        <span class="log-badge">{{ card.label }}</span>
        <h3>{{ card.title }}</h3>
        <p>{{ card.text }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.log-panel {
  border-radius: var(--radius-xl);
}

.log-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: calc(14px * var(--ui-scale));
}

.log-card {
  padding: calc(20px * var(--ui-scale));
  border-radius: calc(22px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(247, 250, 255, 0.88));
  box-shadow:
    0 16px 30px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.log-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: calc(78px * var(--ui-scale));
  padding: calc(6px * var(--ui-scale)) calc(10px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(237, 124, 71, 0.12);
  color: var(--brand);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  letter-spacing: 0.04em;
}

.log-card h3 {
  margin: calc(16px * var(--ui-scale)) 0 calc(10px * var(--ui-scale));
  font-size: calc(20px * var(--ui-scale));
}

.log-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}
</style>
