/* 情侣：get / genCode / bind / unpair / updateSettings */
const config = require('../lib/config');
const errors = require('../lib/errors');
const time = require('../lib/time');
const idLib = require('../lib/id');
const caseLib = require('../lib/case');

function genCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function pubUser(doc) {
  if (!doc) return null;
  return {
    id: doc._id,
    nickname: doc.nickname || '',
    avatar: doc.avatar || '',
    city: doc.city || ''
  };
}

/* 情侣信息（profile 页）；未绑定 40201；演示模式返回演示情侣（与首页演示体验一致） */
async function get(ctx) {
  if (!ctx.bound && !ctx.demoMode) throw errors.biz(40201);
  const col = ctx.db.collection('users');
  const meId = ctx.demoMode ? config.DEMO_LIN : ctx.openid;
  const taId = ctx.demoMode ? config.DEMO_SU : ctx.partnerId;
  const [meDoc, taDoc, cpDoc] = await Promise.all([
    col.doc(meId).get().catch(() => null),
    col.doc(taId).get().catch(() => null),
    ctx.bound ? Promise.resolve(null)
      : ctx.db.collection('couples').doc(ctx.coupleId).get().catch(() => null)
  ]);
  const cp = ctx.bound ? ctx.couple : (cpDoc && cpDoc.data);
  return {
    couple: cp ? {
      startDate: cp.startDate,
      daysTogether: time.daysBetween(cp.startDate, time.today()),
      settings: cp.settings || Object.assign({}, config.DEFAULT_SETTINGS)
    } : null,
    me: pubUser(meDoc && meDoc.data),
    ta: pubUser(taDoc && taDoc.data)
  };
}

/* 生成绑定邀请码：waiting 文档复用刷新，30 分钟有效 */
async function genCode(ctx) {
  if (ctx.bound) throw errors.biz(40203);
  const col = ctx.db.collection('couples');
  const now = time.now();
  const code = genCode6();
  const expiresAt = now + config.INVITE_TTL;

  const exist = await col.where({ userAId: ctx.openid, status: 'waiting' }).limit(1).get();
  if (exist.data.length) {
    await col.doc(exist.data[0]._id).update({
      data: { inviteCode: code, inviteExpiresAt: expiresAt, updatedAt: now }
    });
  } else {
    await col.add({
      data: {
        _id: idLib.genId('couple'),
        userAId: ctx.openid, userBId: '', startDate: '',
        inviteCode: code, inviteExpiresAt: expiresAt, status: 'waiting',
        settings: Object.assign({}, config.DEFAULT_SETTINGS),
        createdAt: now, updatedAt: now
      }
    });
  }
  return { inviteCode: code, expiresAt: expiresAt };
}

/* 输入邀请码完成绑定 */
async function bind(ctx, event) {
  if (ctx.bound) throw errors.biz(40203);
  const code = String(event.inviteCode || '').trim();
  if (!/^\d{6}$/.test(code)) throw errors.biz(40001, '邀请码是 6 位数字哦～');

  let startDate = String(event.startDate || '').trim();
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw errors.biz(40001, '恋爱起始日格式不对哦～');
  }
  if (!startDate) startDate = time.today();

  const col = ctx.db.collection('couples');
  const now = time.now();
  const found = await col.where({ inviteCode: code, status: 'waiting' }).limit(1).get();
  if (!found.data.length) throw errors.biz(40202);
  const doc = found.data[0];
  if (doc.userAId === ctx.openid) throw errors.biz(40202, '不能和自己绑定哦，把码发给 TA 吧～');
  if (!doc.inviteExpiresAt || doc.inviteExpiresAt < now) throw errors.biz(40202);

  await col.doc(doc._id).update({
    data: {
      userBId: ctx.openid, status: 'active',
      startDate: startDate, inviteCode: '', inviteExpiresAt: null,
      updatedAt: now
    }
  });
  return {
    couple: {
      id: doc._id,
      startDate: startDate,
      status: 'active'
    }
  };
}

/* 解除情侣关系：物理删除 couple 文档（历史业务数据按 coupleId 隔离，自然不可见） */
async function unpair(ctx) {
  if (!ctx.bound) throw errors.biz(40201);
  await ctx.db.collection('couples').doc(ctx.coupleId).remove();
  return {};
}

/* 更新设置开关（仅白名单键） */
async function updateSettings(ctx, event) {
  if (!ctx.bound) throw errors.biz(40201);
  const settings = event.settings;
  if (!settings || typeof settings !== 'object') throw errors.biz(40001);
  const patch = {};
  config.SETTING_KEYS.forEach(function (k) {
    if (typeof settings[k] === 'boolean') patch[k] = settings[k];
  });
  if (!Object.keys(patch).length) throw errors.biz(40001);
  const merged = Object.assign({}, ctx.couple.settings || {}, patch);
  await ctx.db.collection('couples').doc(ctx.coupleId).update({
    data: { settings: merged, updatedAt: time.now() }
  });
  return { settings: merged };
}

module.exports = { get: get, genCode: genCode, bind: bind, unpair: unpair, updateSettings: updateSettings };
