// 配置
window.Config = {

  // 显示标题
  SiteName: '站点监测',

  ApiDomain: 'worker-restless-meadow-58b1.yours-truly8126.workers.dev',

  // UptimeRobot Api Keys
  // 支持 Monitor-Specific 和 Read-Only
  ApiKeys: [
    'ur2425493-c451cddce836659f250b1ba0',
  ],

    // 日志天数
  // 虽然免费版说仅保存60天日志，但测试好像API可以获取90天的
  // 不过时间不要设置太长，容易卡，接口请求也容易失败
  CountDays: 60,

  // 是否显示检测站点的链接
  ShowLink: true,

  // 导航栏菜单
  Navi: [
    {
      text: '主页',
      url: 'https://uptime-status.hlsq.cn'
    },
//    {
//      text: '博客',
//      url: 'https://blog.qikaile.tk'
//    },
//    {
 //     text: 'GitHub',
//      url: 'https://github.com/qikaile/uptime-status'
//    },
  ],
};
