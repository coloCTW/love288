// app.js — 两个人的小世界
// 数据层为微信云开发：utils/store.js 是云数据快照（订阅模式），
// 业务云函数 cloudfunctions/love288-api 按 event.type 分发。
const store = require('./utils/store.js');

App({
  onLaunch: function () {
    this.globalData = {
      env: "cloud1-d0gfv1rcr2e2932c7"
    };
    if (!wx.cloud) {
      console.error ('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
    // 静默登录：upsert users + 更新 lastActiveAt（失败不打扰）
    store.fetchUser().catch(function () {});

    wx.loadFontFace({
      family: 'MyCuteFont',
      source: 'url("https://cn-font.claude-code-best.win/packages/mkwtyt/dist/MaoKenTangYuan/result.css")',
      global: true,
      success: console.log
    })
  },
});
