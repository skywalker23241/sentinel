import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

// 状态页基础配置
const pageConfig: PageConfig = {
  // 状态页标题
  title: "JC's Status Page",

  // 顶部导航链接
  links: [
    { link: 'https://jackcooper.qzz.io/', label: 'Blog', highlight: true },
    { link: 'https://github.com/skywalker23241', label: 'GitHub' },
    { link: 'https://www.hopp.bio/junbo-le/', label: 'Social' },
    { link: 'http://jackcooper.vn.kg/', label: 'Notes' },
  ],

  // 分组展示（可选）
  group: {
    '🌐 Main Services': ['main_site_monitor'],
  },

  // 图标
  favicon: '/favicon.ico',

  // 维护配置（主要是颜色设置）
  maintenances: {
    upcomingColor: 'gray',
  },
}

// Worker 主配置
const workerConfig: WorkerConfig = {
  // 写入 KV 的最小间隔（分钟）
  kvWriteCooldownMinutes: 3,

  // 监控任务定义
  monitors: [
    {
      id: 'main_site_monitor',
      name: 'JackCooper Main Website',
      method: 'GET',
      target: 'http://jackcooper.qzz.io/',
      tooltip: 'Blog站运行情况',
      statusPageLink: 'http://jackcooper.qzz.io/',
      timeout: 10000,
      expectedCodes: [200],
      hideLatencyChart: false,
    },

    {
      id: 'main_site_monitor',
      name: 'Mi Notes Blog Site',
      method: 'GET',
      target: 'http://jackcooper.vn.kg/',
      tooltip: '小米笔记同步站运行情况',
      statusPageLink: 'http://jackcooper.vn.kg/',
      timeout: 10000,
      expectedCodes: [200],
      hideLatencyChart: false,
    },
  ],

  // 通知配置
  notification: {
    webhook: {
      url: 'https://api.telegram.org/bot123456:ABCDEF/sendMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      payloadType: 'x-www-form-urlencoded',
      payload: {
        chat_id: 12345678,
        text: '$MSG',
      },
      timeout: 10000,
    },
    timeZone: 'Asia/Shanghai',
    gracePeriod: 5,
  },

  // 回调函数（可自定义逻辑）
  callbacks: {
    onStatusChange: async (
      env: any,
      monitor: any,
      isUp: boolean,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => {
      // 状态变更时触发
      console.log(`Monitor ${monitor.name} is now ${isUp ? 'UP' : 'DOWN'}`)
    },
    onIncident: async (
      env: any,
      monitor: any,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => {
      // 故障期间每分钟触发一次
      console.log(`Incident ongoing for ${monitor.name}: ${reason}`)
    },
  },
}

// 维护计划配置（可选）
const maintenances: MaintenanceConfig[] = [
  {
    monitors: ['main_site_monitor'],
    title: 'Server Maintenance',
    body: 'Routine maintenance for JackCooper main website.',
    start: '2025-10-25T00:00:00+08:00',
    end: '2025-10-25T04:00:00+08:00',
    color: 'blue',
  },
]

// 导出
export { maintenances, pageConfig, workerConfig }
