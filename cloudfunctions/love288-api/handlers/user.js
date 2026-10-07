/* 用户：login / get / update / reportStatus */
const errors = require('../lib/errors');
const time = require('../lib/time');
const caseLib = require('../lib/case');

function pubUser(doc) {
  return caseLib.toPub(doc);
}

/* 静默登录（中间件已 upsert users），返回身份与绑定状态 */
async function login(ctx) {
  return {
    user: pubUser(ctx.user),
    coupleBound: ctx.bound,
    demoMode: ctx.demoMode
  };
}

async function get(ctx) {
  return login(ctx);
}

async function update(ctx, event) {
  const data = {};
  if (typeof event.nickname === 'string') {
    const nick = event.nickname.trim();
    if (!nick) throw errors.biz(40001, '昵称不能是空的哦～');
    data.nickname = nick;
  }
  if (typeof event.avatar === 'string') data.avatar = event.avatar;
  if (typeof event.city === 'string') data.city = event.city.trim();
  if (!Object.keys(data).length) throw errors.biz(40001);
  await ctx.db.collection('users').doc(ctx.openid).update({ data: data });
  const got = await ctx.db.collection('users').doc(ctx.openid).get();
  return { user: pubUser(got.data) };
}

async function reportStatus(ctx, event) {
  const data = {};
  const level = parseInt(event.batteryLevel, 10);
  if (!isNaN(level)) {
    if (level < 0 || level > 100) throw errors.biz(40001, '电量数值不对哦～');
    data.batteryLevel = level;
    data.batteryUpdatedAt = time.now();
  }
  const lat = parseFloat(event.latitude);
  const lng = parseFloat(event.longitude);
  if (!isNaN(lat) && !isNaN(lng)) {
    data.latitude = lat;
    data.longitude = lng;
  }
  if (!Object.keys(data).length) throw errors.biz(40001);
  await ctx.db.collection('users').doc(ctx.openid).update({ data: data });
  const got = await ctx.db.collection('users').doc(ctx.openid).get();
  return { user: pubUser(got.data) };
}

module.exports = { login: login, get: get, update: update, reportStatus: reportStatus };
