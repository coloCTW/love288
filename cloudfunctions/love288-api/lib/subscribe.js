/* ═══════════════════════════════════════════════════════════════════
   订阅消息（api.md §1.8）：落库后尽力发送给对方，失败静默跳过、不影响主流程。
   模板 ID 通过云函数环境变量配置：

   SUBSCRIBE_TEMPLATE_IDS = {"interaction":"…","mealReminder":"…","mood":"…","plan":"…","post":"…","comment":"…"}
   MINIPROGRAM_STATE      = developer | trial | formal（默认 developer，发布后改 formal）

   注意：data 字段名须与公众平台申请到的模板字段一致（thing1/thing2/time3 为占位
   示例，按实际模板调整）；前端需在对应按钮先调 wx.requestSubscribeMessage 请求授权，
   用户拒绝则只落库不推送（双人数据本来就在云端，对方打开小程序仍能看到变化）。
   ═══════════════════════════════════════════════════════════════════ */

const PAGES = {
  interaction: 'pages/home/home',
  mealReminder: 'pages/eat/eat',
  mood: 'pages/mood/mood',
  plan: 'pages/plan/plan',
  post: 'pages/daily/daily',
  comment: 'pages/daily/daily'
};

function templates() {
  try {
    const raw = process.env.SUBSCRIBE_TEMPLATE_IDS || '';
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function toData(o) {
  const data = {};
  Object.keys(o).forEach(function (k) {
    data[k] = { value: String(o[k] == null ? '' : o[k]).slice(0, 20) };
  });
  return data;
}

/* 尽力发送；未配置模板 / 未传 openid / 发送失败一律静默返回 false */
async function send(cloud, toOpenid, key, fields) {
  if (!cloud || !toOpenid) return false;
  const tplId = templates()[key];
  if (!tplId) return false;
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: toOpenid,
      templateId: tplId,
      page: PAGES[key] || 'pages/home/home',
      data: toData(fields),
      miniprogramState: process.env.MINIPROGRAM_STATE || 'developer'
    });
    return true;
  } catch (e) {
    console.warn('[subscribe] skip:', (e && (e.errMsg || e.message)) || e);
    return false;
  }
}

module.exports = { send: send };
