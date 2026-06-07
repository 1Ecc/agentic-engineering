<script setup lang="ts">
const featuredSkills = [
  {
    icon: '🧾',
    name: '表单识别',
    scene: '从申请单、报销单等结构化表单中提取字段',
    tags: ['OCR', '字段抽取', '校验'],
  },
  {
    icon: '📊',
    name: '数据洞察',
    scene: '把业务表格转换为指标摘要和异常点说明',
    tags: ['分析', '摘要', '指标'],
  },
  {
    icon: '✉️',
    name: '邮件生成',
    scene: '按审批、通知、跟进等场景生成标准邮件草稿',
    tags: ['生成', '模板', '润色'],
  },
  {
    icon: '🔎',
    name: '知识检索',
    scene: '面向规程、SOP 和历史记录进行问答检索',
    tags: ['RAG', '问答', '引用'],
  },
]

const hubStats = [
  { label: '推荐 Skills', value: '4' },
  { label: '覆盖场景', value: '12+' },
  { label: 'Demo 状态', value: '展示中' },
]
</script>

<template>
  <div class="page skills-hub-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Skills Hub</p>
        <h1>Skills Hub</h1>
        <p class="page-sub">面向业务流程的技能展示区，与节点市场平级，用于呈现可复用的 AI 能力。</p>
      </div>
    </header>

    <section class="skills-hero">
      <div>
        <span class="skills-hero-kicker">Demo Preview</span>
        <h2>把可复用能力沉淀成 Skills</h2>
        <p>节点市场偏向接口与执行节点，Skills Hub 展示面向业务场景的 AI 能力单元，方便后续扩展为技能安装、配置和编排入口。</p>
      </div>
      <div class="skills-stat-grid">
        <div v-for="stat in hubStats" :key="stat.label" class="skills-stat">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </div>
      </div>
    </section>

    <section class="market-group">
      <h2>精选 Skills</h2>
      <div class="skills-grid">
        <article v-for="skill in featuredSkills" :key="skill.name" class="skill-card">
          <header>
            <span class="skill-icon">{{ skill.icon }}</span>
            <div>
              <h3>{{ skill.name }}</h3>
              <small>展示级 Demo</small>
            </div>
          </header>
          <p>{{ skill.scene }}</p>
          <footer>
            <span v-for="tag in skill.tags" :key="tag">{{ tag }}</span>
          </footer>
        </article>
      </div>
    </section>
  </div>
</template>
