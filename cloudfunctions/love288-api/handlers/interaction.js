/* 互动：想你了 / 抱抱 / 我在哦 / 喝水 / 叫醒。
   落库留痕 + 订阅消息推送（P1，未配置模板静默跳过）；list 为"收到的互动"页数据源。 */
const config = require('../lib/config');
const errors = require('../lib/errors');
const time = require('../lib/time');
const idLib = require('../lib/id');
const paging = require('../lib/paging');
const caseLib = require('../lib/case');
const subscribe = require('../lib/subscribe');

/* 收到的互动（receiverId = 我；演示模式下 demo-lin 也算"我"），倒序分页 */
async function list(ctx, event) {
  const pg = paging.paging(event);
  const _ = ctx._;
  const col = ctx.db.collection('interactions');
  const cond = { coupleId: ctx.coupleId, receiverId: _.in(ctx.selfIds) };
  const [totalR, rowsR] = await Promise.all([
    col.where(cond).count(),
    col.where(cond).orderBy('createdAt', 'desc').skip(pg.skip).limit(pg.pageSize).get()
  ]);
  const senderIds = {};
  rowsR.data.forEach(function (i) { senderIds[i.senderId] = 1; });
  let userMap = {};
  const uidList = Object.keys(senderIds);
  if (uidList.length) {
    const uR = await ctx.db.collection('users').where({ _id: _.in(uidList) }).get();
    uR.data.forEach(function (u) { userMap[u._id] = u; });
  }
  return {
    list: rowsR.data.map(function (i) {
      const u = userMap[i.senderId];
      return caseLib.toPub(i, { nickname: (u && u.nickname) || '', avatar: (u && u.avatar) || '' });
    }),
    total: totalR.total,
    hasMore: pg.skip + rowsR.data.length < totalR.total
  };
}

async function send(ctx, event) {
  const type = String(event.type || '').trim();
  if (config.INTERACTION_TYPES.indexOf(type) < 0) throw errors.biz(40001, '这个互动还没准备好哦～');
  const content = (typeof event.content === 'string' && event.content.trim())
    ? event.content.trim() : config.INTERACTION_TEXT[type];

  const now = time.now();
  await ctx.db.collection('interactions').doc(idLib.genId('it')).set({
    data: {
      coupleId: ctx.coupleId, senderId: ctx.openid, receiverId: ctx.partnerId,
      type: type, content: content, createdAt: now
    }
  });
  /* 尽力推送订阅消息给对方（失败静默，不影响主流程） */
  subscribe.send(ctx.cloud, ctx.partnerId, 'interaction', {
    thing1: content,
    thing2: ctx.user.nickname || 'TA'
  });
  return { delivered: true };
}

module.exports = { list: list, send: send };
