import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

// 状态页基础配置
const pageConfig: PageConfig = {
  // 状态页标题
  title: 'Abo的监控站',
  description: '展示 Abo 个人服务的可用性、响应时间、事件历史和运行状态。',

  // 可选：生产域名。用于 sitemap / canonical / RSS 里的绝对 URL。
  // 本地开发或未配置时会自动从请求 Host 推断。
  siteUrl: undefined,

  // 顶部导航链接
  links: [
    { link: 'https://jackcooper.qzz.io/', label: 'Blog', highlight: true },
    { link: 'https://github.com/skywalker23241', label: 'Github', highlight: true },
    { link: 'https://www.hopp.bio/junbo-le/', label: 'Social', highlight: true },
    { link: 'https://www.abo.qzz.io/', label: 'Resume', highlight: true },
  ],

  // 公开订阅 / 数据入口。只放公共 URL，不要放 Webhook token 或私密邮箱 API。
  subscriptions: [
    { type: 'rss', label: 'RSS', url: '/rss.xml' },
    { type: 'json', label: 'Status JSON', url: '/status.json' },
    { type: 'json', label: 'Incidents JSON', url: '/incidents.json' },
  ],

  // 分组展示（可选）。分组标题为界面文案，统一英文；品牌名与监控项名称保留。
  group: {
    "Abo's Blog": ['main_site_monitor'],
    RadiantShelf: ['valorant_site_monitor'],
    RestCal: ['restcal_site-monitor'],
    Resume: ['resume-site-monitor'],
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
      name: 'Abo的博客',
      method: 'GET',
      target: 'http://jackcooper.qzz.io/',
      tooltip: 'Abo的博客站运行情况',
      statusPageLink: 'http://jackcooper.qzz.io/',
      timeout: 10000,
      expectedCodes: [200],
      hideLatencyChart: false,
    },
    {
      id: 'valorant_site_monitor',
      name: 'RadiantShelf',
      method: 'GET',
      target: 'https://playvalorant.qzz.io/',
      tooltip: 'RadiantShelf站运行情况',
      statusPageLink: 'https://playvalorant.qzz.io/',
      timeout: 10000,
      expectedCodes: [200],
      hideLatencyChart: false,
    },
    {
      id: 'restcal_site-monitor',
      name: 'RestCal-休历',
      method: 'GET',
      target: 'https://abo.qzz.io/restcal/',
      tooltip: 'RestCal站运行情况',
      statusPageLink: 'https://abo.qzz.io/restcal/',
      timeout: 10000,
      expectedCodes: [200],
      hideLatencyChart: false,
    },
    {
      id: 'resume-site-monitor',
      name: 'Resume',
      method: 'GET',
      target: 'https://abo.qzz.io/',
      tooltip: 'Resume站运行情况',
      statusPageLink: 'https://abo.qzz.io/',
      timeout: 10000,
      expectedCodes: [200],
      hideLatencyChart: false,
    },
  ],

  // 通知配置
  // 机密（Telegram bot token / chat id）不要写在本文件里。
  // 用 Cloudflare 机密注入：
  //   wrangler secret put TG_BOT_TOKEN
  //   wrangler secret put TG_CHAT_ID
  // 下面的 ${...} 占位会在 worker 发送时由 env 替换。
  notification: {
    webhook: {
      url: 'https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      payloadType: 'x-www-form-urlencoded',
      payload: {
        chat_id: '${TG_CHAT_ID}',
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
