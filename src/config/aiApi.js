import { API_CONFIG } from './api'

export const API_PATHS = {
  SESSION: {
    LIST: '/api/visit-assistant/history', //会话列表接口
    REDETAIL: '/api/visit-assistant/tasks', //待办事项详情接口
    DELETE: '/api/visit-assistant/tasks/', //删除定时任务会话接口
    QUERYREPORTS: '/api/visit-assistant/reports/', //待办事项查询接口
    ASSISYANT: '/api/visit-assistant/tasks/', //待办事项修改接口
    WEB_STREAM: '/awp/visit-assistant', //访客辅助会话流接口
    DOWNIOAD: '/api/visit-assistant/reports/', //下载导出接口
    RULE_QA: '/awp/rule-qa', //规则答疑会话流接口
    SESSION: '/session',
    products: '/api/admin/products', //产品列表接口
    enterprises: '/api/admin/enterprises', //企业画像列表接口
    insights: '/api/admin/insights' //行业动态接口
  },
  AGENT: {
    LIST: '/api/agent-modules'
  }
}

export { API_CONFIG }
