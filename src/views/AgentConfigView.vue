<template>
  <section class="data-panel glass-card agent-panel">
    <div class="section-title">
      <div>
        <h2>智能体配置</h2>
        <p>这里预留智能体配置入口，后续接入真实配置表单或列表即可继续扩展。</p>
      </div>
    </div>

    <div class="agent-grid">
      <article class="agent-card">
        <span class="agent-badge">Agent</span>
        <h3>智能体编排</h3>
        <p>预留智能体角色、工具链和工作流配置区域。</p>
      </article>

      <article class="agent-card">
        <span class="agent-badge">Model</span>
        <h3>模型绑定</h3>
        <p>后续可以在这里设置模型、提示词模板和调用参数。</p>
      </article>

      <article class="agent-card">
        <span class="agent-badge">Access</span>
        <h3>发布权限</h3>
        <p>支持按用户、角色或岗位控制智能体可见范围。</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.agent-panel {
  border-radius: var(--radius-xl);
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: calc(14px * var(--ui-scale));
}

.agent-card {
  padding: calc(20px * var(--ui-scale));
  border-radius: calc(22px * var(--ui-scale));
  border: 1px solid rgba(27, 37, 54, 0.08);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(247, 250, 255, 0.88));
  box-shadow:
    0 16px 30px rgba(29, 35, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.agent-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: calc(74px * var(--ui-scale));
  padding: calc(6px * var(--ui-scale)) calc(10px * var(--ui-scale));
  border-radius: 999px;
  background: rgba(47, 131, 116, 0.12);
  color: var(--brand-alt);
  font-size: calc(12px * var(--ui-scale));
  font-weight: 700;
  letter-spacing: 0.04em;
}

.agent-card h3 {
  margin: calc(16px * var(--ui-scale)) 0 calc(10px * var(--ui-scale));
  font-size: calc(20px * var(--ui-scale));
}

.agent-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}
</style>
