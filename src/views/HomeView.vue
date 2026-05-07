<template>
  <div class="admin-scroll-page home-page">
    <section class="data-panel glass-card admin-scroll-panel home-panel">
      <div class="home-intro">
        <article class="home-hero">
          <span class="home-eyebrow">系统首页</span>
          <h2>AI 用户管理系统</h2>
          <p>
            当前系统聚焦 AI 工作台、模型配置、知识库、日志和权限配置五类核心能力，
            用统一入口承接日常问答、模型接入、知识维护与后台管理。
          </p>
        </article>

        <div class="home-grid">
          <article class="home-card">
            <strong>AI 工作台</strong>
            <p>作为默认业务入口，支持统一承接大模型问答、内容生成和多角色协同使用。</p>
          </article>

          <article class="home-card">
            <strong>模型与参数配置</strong>
            <p>集中维护模型接入信息、参数项和调用所需的关键配置，便于统一管理。</p>
          </article>

          <article class="home-card">
            <strong>AI 知识库与日志</strong>
            <p>提供知识内容维护、过程留痕和结果排查能力，方便定位问题和持续优化。</p>
          </article>

          <article class="home-card">
            <strong>权限配置</strong>
            <p>保留用户、角色、岗位、菜单、所属公司等基础模块，支撑日常权限管理。</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-panel {
  justify-content: center;
}

.home-intro {
  display: grid;
  gap: calc(18px * var(--ui-scale));
}

.home-hero,
.home-card {
  border-radius: calc(24px * var(--ui-scale));
  border: 1px solid var(--panel-card-border);
  background: var(--panel-card-bg);
  box-shadow:
    var(--panel-card-shadow),
    inset 0 1px 0 var(--surface-inset);
}

.home-hero {
  padding: calc(24px * var(--ui-scale)) calc(26px * var(--ui-scale));
}

.home-eyebrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: calc(6px * var(--ui-scale)) calc(12px * var(--ui-scale));
  border-radius: 999px;
  background: var(--surface-accent-alt);
  color: var(--brand-alt);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  letter-spacing: 0.06em;
}

.home-hero h2 {
  margin: calc(16px * var(--ui-scale)) 0 calc(12px * var(--ui-scale));
  font-size: calc(24px * var(--ui-scale));
  color: var(--text-main);
}

.home-hero p,
.home-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.8;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(14px * var(--ui-scale));
}

.home-card {
  padding: calc(20px * var(--ui-scale)) calc(22px * var(--ui-scale));
}

.home-card strong {
  display: block;
  margin-bottom: calc(10px * var(--ui-scale));
  color: var(--text-main);
  font-size: calc(16px * var(--ui-scale));
}

@media (max-width: 900px) {
  .home-grid {
    grid-template-columns: 1fr;
  }
}
</style>
