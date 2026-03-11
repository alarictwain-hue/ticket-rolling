export const sourceSnapshot = {
  checkedAt: "2026-03-11",
  artist: "Yorushika",
  tourName: 'LIVE TOUR 2026 "一人称"',
  complianceNotes: [
    "Do not automate lottery entry or bypass platform identity checks.",
    "Only collect publicly accessible pages.",
    "Store source URL and snapshot timestamp for each rule."
  ],
  officialSources: [
    {
      name: "Yorushika News",
      type: "official",
      url: "https://yorushika.com/news/",
      notes: "官方新闻与公告主入口"
    },
    {
      name: "Yorushika Tour Feature",
      type: "official",
      url: "https://yorushika.com/feature/livetour2026_ichininsho",
      notes: "巡演专题页，包含日程、票价、注意事项"
    },
    {
      name: "Yorushika Tour Feature (ZH-CN)",
      type: "official",
      url: "https://yorushika.com/feature/livetour2026_ichininsho?lang=zh-cn",
      notes: "中文入口，适合展示给中文用户"
    },
    {
      name: "Lawson Ticket Artist Page",
      type: "ticketing",
      url: "https://l-tike.com/artist/000000000719249/",
      notes: "艺人公开售卖页与公开先行入口"
    },
    {
      name: "Lawson Ticket English",
      type: "ticketing",
      url: "https://l-tike.com/en/",
      notes: "海外用户可参考的英文入口"
    },
    {
      name: "Tixplus",
      type: "ticketing",
      url: "https://tixplus.jp/",
      notes: "电子票和发券生态"
    },
    {
      name: "Plusmember",
      type: "ticketing",
      url: "https://plusmember.jp/",
      notes: "官方 App 和会员生态相关入口"
    },
    {
      name: "Yorushika Membership Registration",
      type: "membership",
      url: "https://secure.plusmember.jp/yorushika/1/regist/",
      notes: "夜鹿会员注册入口，需优先在手机浏览器中操作"
    }
  ],
  events: [
    {
      id: "evt-sendai-20260321",
      city: "宫城",
      venue: "ゼビオアリーナ仙台",
      date: "2026-03-21",
      doorsAt: "17:30",
      startsAt: "18:30",
      ticketPriceJpy: 12000,
      salesStatus: "会员先行已结束",
      paymentMethod: "电子票 + 官方渠道支付",
      travelTip: "建议住仙台站周边，电车往返较方便。",
      rules: [
        "购票者电子票显示姓名与照片",
        "需使用官方 App / チケプラ电子票",
        "同行者若无日本手机号，可现场窗口处理"
      ]
    },
    {
      id: "evt-osaka-20260418",
      city: "大阪",
      venue: "大阪城ホール",
      date: "2026-04-18",
      doorsAt: "17:00",
      startsAt: "18:00",
      ticketPriceJpy: 12000,
      salesStatus: "公开先行中",
      paymentMethod: "抽选后可出现便利店付款任务",
      travelTip: "优先考虑大阪城公园或京桥周边真实酒店。",
      rules: [
        "先关注官方专题页的最新抽选窗口",
        "便利店付款仅能作为人工协同任务处理",
        "不支持绕过实名限制"
      ]
    },
    {
      id: "evt-yokohama-20260729",
      city: "神奈川",
      venue: "横浜アリーナ",
      date: "2026-07-29",
      doorsAt: "17:30",
      startsAt: "18:30",
      ticketPriceJpy: 12000,
      salesStatus: "待开放",
      paymentMethod: "以官方公告为准",
      travelTip: "新横滨站周边适合首次赴日用户落脚。",
      rules: [
        "后续需继续核对是否有 Inbound 相关入口",
        "建议提前准备真实住宿订单",
        "本人到场能力会影响可行路径"
      ]
    }
  ]
};
