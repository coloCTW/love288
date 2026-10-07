/* 约饭：list / create。
   create 联动 calendar_events（eventType=meal），双向 eventId/mealId —— 保持
   "约饭同时出现在计划月历"的产品逻辑。list 顺带返回今日提醒计数，免前端多一次请求。 */
const config = require('../lib/config');
const errors = require('../lib/errors');
const time = require('../lib/time');
const idLib = require('../lib/id');
const paging = require('../lib/paging');
const caseLib = require('../lib/case');

async function remindCount(ctx, today) {
  const r = await ctx.db.collection('meal_reminders')
    .where({ coupleId: ctx.coupleId, date: today, senderId: ctx._.in(ctx.selfIds) })
    .count();
  return r.total;
}

async function list(ctx, event) {
  const scope = event.scope === 'all' ? 'all' : 'upcoming';
  const today = time.today();
  const col = ctx.db.collection('meal_appointments');
  const pg = paging.paging(event);

  let cond, order, totalR, rowsR;
  if (scope === 'upcoming') {
    cond = { coupleId: ctx.coupleId, status: 'upcoming', date: ctx._.gte(today) };
    totalR = await col.where(cond).count();
    rowsR = await col.where(cond)
      .orderBy('date', 'asc').orderBy('time', 'asc')
      .skip(pg.skip).limit(pg.pageSize).get();
  } else {
    cond = { coupleId: ctx.coupleId };
    totalR = await col.where(cond).count();
    rowsR = await col.where(cond)
      .orderBy('date', 'desc')
      .skip(pg.skip).limit(pg.pageSize).get();
  }

  const remind = await remindCount(ctx, today);
  return {
    list: rowsR.data.map(function (m) { return caseLib.toPub(m); }),
    total: totalR.total,
    hasMore: pg.skip + rowsR.data.length < totalR.total,
    remindTodayCount: remind,
    remindLimit: config.REMIND_LIMIT
  };
}

async function create(ctx, event) {
  const title = String(event.title || '').trim();
  const date = String(event.date || '').trim();
  const timeOfDay = String(event.time || '').trim();
  const city = String(event.city || '').trim();
  const location = String(event.location || '').trim();
  const coverImage = typeof event.coverImage === 'string' ? event.coverImage : '';
  const note = String(event.note || '').trim();
  if (!title || !date || !timeOfDay || !city || !location) {
    throw errors.biz(40001, '还有必填项没有填哦，检查一下～');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw errors.biz(40001, '日期格式不对哦～');

  const now = time.now();
  const db = ctx.db;
  const mealId = idLib.genId('meal');
  const eventId = idLib.genId('ev');
  const mealDoc = {
    _id: mealId, coupleId: ctx.coupleId, creatorId: ctx.openid,
    title: title, date: date, time: timeOfDay,
    city: city, location: location, coverImage: coverImage, note: note,
    status: 'upcoming', eventId: eventId,
    createdAt: now, updatedAt: now
  };
  const eventDoc = {
    _id: eventId, coupleId: ctx.coupleId, creatorId: ctx.openid,
    title: title, eventType: 'meal',
    date: date, time: timeOfDay, city: city, location: location,
    image: coverImage, note: note, status: 'active', mealId: mealId,
    createdAt: now, updatedAt: now
  };
  /* 顺序双写（数据量极小，P1 可换事务） */
  await db.collection('meal_appointments').doc(mealId).set({ data: mealDoc });
  await db.collection('calendar_events').doc(eventId).set({ data: eventDoc });
  return { meal: caseLib.toPub(mealDoc), event: caseLib.toPub(eventDoc) };
}

module.exports = { list: list, create: create };
