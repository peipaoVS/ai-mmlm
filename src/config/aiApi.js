import { API_CONFIG } from './api';
// API 路径配置（与具体地址分离）
export const API_PATHS = {
  SESSION: {
    LIST: '/api/visit-assistant/history', //会话列表接口
    REDETAIL: '/api/visit-assistant/tasks', //待办事项详情接口
    CREATE: '/session/create',
    UPDATE: '/session/update',
    DELETE: '/api/visit-assistant/tasks/', //删除定时任务会话接口
    QUERYREPORTS: '/api/visit-assistant/reports/', //待办事项查询接口
    ASSISYANT: '/api/visit-assistant/tasks/', //待办事项修改接口

    WEB_STREAM: '/awp/visit-assistant', //会话流接口
    DOWNIOAD: '/api/visit-assistant/reports/', //下载导出接口

    SESSION: '/session',
  },
  AGENT: {
    LIST: '/api/taskstop',
    RULE_QA: '/awp/rule-qa', //会话流接口
  },
}