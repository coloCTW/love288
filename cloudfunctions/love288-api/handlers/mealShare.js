/* 餐食分享：list / create。
   create 联动 posts（type=meal, tags=['好好吃饭']），回填 postId —— 保持
   "餐食分享同步写进日常"的产品逻辑。今天/历史按北京时间零点切分。 */
const errors = require('../lib/errors');
const time = require('../lib/time');
const idLib = require('../lib/id');
const paging = require('../lib/paging');
const caseLib = require('../lib/case');

async function list(ctx, event) {
  const scope = event.scope;
  if (scope !== 'today' && scope !== 'history') throw errors.biz(40001, '范围参数不对哦～');
  const col = ctx.db.collection('meal_shares');
  const pg = paging.paging(event);
  const _ = ctx._;

  let cond, totalR, rowsR;
  if (scope === 'today') {
    cond = { coupleId: ctx.coupleId, createdAt: _.gte(time.todayStart()).and(_.lt(time.tomorrowStart())) };
    totalR = await col.where(cond).count();
    rowsR = await col.where(cond).orderBy('createdAt', 'desc').skip(pg.skip).limit(pg.pageSize).get();
  } else {
    cond = { coupleId: ctx.coupleId, createdAt: _.lt(time.todayStart()) };
    totalR = await col.where(cond).count();
    rowsR = await col.where(cond).orderBy('createdAt', 'desc').skip(pg.skip).limit(pg.pageSize).get();
  }
  return {
    list: rowsR.data.map(function (ms) { return caseLib.toPub(ms); }),
    total: totalR.total,
    hasMore: pg.skip + rowsR.data.length < totalR.total
  };
}

async function create(ctx, event) {
  const content = String(event.content || '').trim();
  const images = Array.isArray(event.images) ? event.images.filter(function (f) { return typeof f === 'string' && f; }) : [];
  if (!content) throw errors.biz(40001, '写一句话再分享吧～');
  if (!images.length || images.length > 9) throw errors.biz(40001, '先选一张照片吧，美食要留影呀～');

  const now = time.now();
  const db = ctx.db;
  const shareId = idLib.genId('ms');
  const postId = idLib.genId('post');
  const shareDoc = {
    _id: shareId, coupleId: ctx.coupleId, userId: ctx.openid,
    content: content, images: images, postId: postId, createdAt: now
  };
  const postDoc = {
    _id: postId, coupleId: ctx.coupleId, userId: ctx.openid, type: 'meal',
    content: content, images: images,
    location: ctx.user.city || '', tags: ['好好吃饭'],
    likeCount: 0, commentCount: 0, deletedAt: null, createdAt: now
  };
  /* 同一事务双写：餐食分享 + 日常动态，中断自动回滚、不留孤儿数据 */
  await db.runTransaction(async function (t) {
    await t.collection('meal_shares').doc(shareId).set({ data: shareDoc });
    await t.collection('posts').doc(postId).set({ data: postDoc });
  });
  return { share: caseLib.toPub(shareDoc), post: caseLib.toPub(postDoc) };
}

module.exports = { list: list, create: create };
