/* ═══════════════════════════════════════════════════════════════════
   两个人的小世界 · 云函数调用层
   统一包装 wx.cloud.callFunction：code=0 返回 data，非 0 抛 Error（带 code）。
   接口约定见 docs/api.md（event.type 路由，响应 { code, message, data }）。
   ═══════════════════════════════════════════════════════════════════ */
const FN_NAME = 'love288-api';
const FALLBACK_MSG = '好像走神了一下，再试一次吧～';

function call(type, params) {
  return new Promise(function (resolve, reject) {
    wx.cloud.callFunction({
      name: FN_NAME,
      data: Object.assign({ type: type }, params || {}),
      success: function (res) {
        const r = res && res.result;
        if (r && r.code === 0) {
          resolve(r.data);
          return;
        }
        const e = new Error((r && r.message) || FALLBACK_MSG);
        e.code = (r && r.code) || -1;
        reject(e);
      },
      fail: function () {
        const e = new Error(FALLBACK_MSG);
        e.code = -1;
        reject(e);
      }
    });
  });
}

module.exports = {
  user: {
    login: function () { return call('user.login'); },
    get: function () { return call('user.get'); },
    update: function (p) { return call('user.update', p); },
    reportStatus: function (p) { return call('user.reportStatus', p); }
  },
  couple: {
    get: function () { return call('couple.get'); },
    genCode: function () { return call('couple.genCode'); },
    bind: function (p) { return call('couple.bind', p); },
    unpair: function () { return call('couple.unpair'); },
    updateSettings: function (p) { return call('couple.updateSettings', p); }
  },
  home: {
    overview: function () { return call('home.overview'); }
  },
  mood: {
    get: function () { return call('mood.get'); },
    update: function (p) { return call('mood.update', p); }
  },
  meal: {
    list: function (p) { return call('meal.list', p); },
    create: function (p) { return call('meal.create', p); }
  },
  mealShare: {
    list: function (p) { return call('mealShare.list', p); },
    create: function (p) { return call('mealShare.create', p); }
  },
  post: {
    list: function (p) { return call('post.list', p); },
    create: function (p) { return call('post.create', p); },
    delete: function (p) { return call('post.delete', p); },
    like: function (p) { return call('post.like', p); },
    comments: function (p) { return call('post.comments', p); },
    commentCreate: function (p) { return call('post.commentCreate', p); }
  },
  event: {
    list: function (p) { return call('event.list', p); },
    get: function (p) { return call('event.get', p); },
    create: function (p) { return call('event.create', p); },
    update: function (p) { return call('event.update', p); },
    delete: function (p) { return call('event.delete', p); }
  },
  interaction: {
    send: function (p) { return call('interaction.send', p); }
  },
  reminder: {
    meal: function () { return call('reminder.meal'); }
  }
};
