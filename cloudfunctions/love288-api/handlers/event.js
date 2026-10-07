/* 计划事件：list / get / create / update / delete。
   约饭联动事件（mealId 非空）不可编辑，删除时级联删约饭 —— 保持"约饭/月历"不出现孤儿数据。 */
const errors = require('../lib/errors');
const time = require('../lib/time');
const idLib = require('../lib/id');
const caseLib = require('../lib/case');

const EVENT_TYPES = ['date', 'anniversary', 'todo'];

async function fetchEvent(ctx, eventId) {
  let got;
  try {
    got = await ctx.db.collection('calendar_events').doc(eventId).get();
  } catch (e) {
    return null;
  }
  const e = got.data;
  /* 越权防线：by-id 查询必须校验 coupleId，防止跨情侣读写 */
  if (!e || e.coupleId !== ctx.coupleId) return null;
  return e;
}

async function creatorNickname(ctx, creatorId) {
  try {
    const got = await ctx.db.collection('users').doc(creatorId).get();
    return (got.data && got.data.nickname) || '';
  } catch (e) {
    return '';
  }
}

/* 月历：monthEvents（当月全部，画月历标记）+ upcoming（未来非待办，含约饭联动） */
async function list(ctx, event) {
  const month = String(event.month || '');
  if (!/^\d{4}-\d{2}$/.test(month)) throw errors.biz(40001, '月份参数不对哦～');
  const _ = ctx._;
  const db = ctx.db;
  const col = db.collection('calendar_events');

  const [monthR, upcomingR] = await Promise.all([
    col.where({
      coupleId: ctx.coupleId,
      status: 'active',
      date: db.RegExp({ regexp: '^' + month, options: '' })
    }).orderBy('date', 'asc').limit(200).get(),
    col.where({
      coupleId: ctx.coupleId,
      status: 'active',
      eventType: _.neq('todo'),
      date: _.gte(time.today())
    }).orderBy('date', 'asc').orderBy('time', 'asc').limit(50).get()
  ]);
  return {
    monthEvents: monthR.data.map(function (e) { return caseLib.toPub(e); }),
    upcoming: upcomingR.data.map(function (e) { return caseLib.toPub(e); })
  };
}

async function get(ctx, event) {
  const eventId = String(event.eventId || '');
  if (!eventId) throw errors.biz(40001);
  const e = await fetchEvent(ctx, eventId);
  if (!e) throw errors.biz(40401);
  return {
    event: caseLib.toPub(e, {
      creatorNickname: await creatorNickname(ctx, e.creatorId),
      isMine: ctx.isMine(e.creatorId)
    })
  };
}

async function create(ctx, event) {
  const title = String(event.title || '').trim();
  const eventType = String(event.eventType || '').trim();
  const date = String(event.date || '').trim();
  if (!title) throw errors.biz(40001, '名称不能是空的哦～');
  if (EVENT_TYPES.indexOf(eventType) < 0) throw errors.biz(40001, '类型不对哦～');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw errors.biz(40001, '日期不能是空的哦～');
  const timeOfDay = String(event.time || '').trim();
  const city = String(event.city || '').trim();
  const location = String(event.location || '').trim();
  const image = typeof event.image === 'string' ? event.image : '';
  const note = String(event.note || '').trim();

  const now = time.now();
  const eId = idLib.genId('ev');
  const eDoc = {
    _id: eId, coupleId: ctx.coupleId, creatorId: ctx.openid,
    title: title, eventType: eventType, date: date, time: timeOfDay,
    city: city, location: location, image: image, note: note,
    status: 'active', mealId: '', createdAt: now, updatedAt: now
  };
  await ctx.db.collection('calendar_events').doc(eId).set({ data: eDoc });
  return { event: caseLib.toPub(eDoc, { creatorNickname: ctx.user.nickname || '', isMine: true }) };
}

async function update(ctx, event) {
  const eventId = String(event.eventId || '');
  if (!eventId) throw errors.biz(40001);
  const e = await fetchEvent(ctx, eventId);
  if (!e) throw errors.biz(40401);
  if (!ctx.isMine(e.creatorId)) throw errors.biz(40301);
  if (e.mealId) throw errors.biz(40301, '约饭的日期在「好好吃饭」里改哦～');

  const data = {};
  if (typeof event.title === 'string') {
    const t = event.title.trim();
    if (!t) throw errors.biz(40001, '名称不能是空的哦～');
    data.title = t;
  }
  if (typeof event.date === 'string') {
    const d = event.date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw errors.biz(40001, '日期不能是空的哦～');
    data.date = d;
  }
  if (typeof event.time === 'string') data.time = event.time.trim();
  if (typeof event.city === 'string') data.city = event.city.trim();
  if (typeof event.location === 'string') data.location = event.location.trim();
  if (typeof event.note === 'string') data.note = event.note.trim();
  if (!Object.keys(data).length) throw errors.biz(40001);
  data.updatedAt = time.now();

  await ctx.db.collection('calendar_events').doc(eventId).update({ data: data });
  const fresh = await fetchEvent(ctx, eventId);
  return { event: caseLib.toPub(fresh, { creatorNickname: await creatorNickname(ctx, fresh.creatorId), isMine: true }) };
}

async function remove(ctx, event) {
  const eventId = String(event.eventId || '');
  if (!eventId) throw errors.biz(40001);
  const e = await fetchEvent(ctx, eventId);
  if (!e) throw errors.biz(40401);
  if (!ctx.isMine(e.creatorId)) throw errors.biz(40301);
  if (e.mealId) {
    /* 约饭联动事件：级联删除对应约饭 */
    await ctx.db.collection('meal_appointments').doc(e.mealId).remove().catch(function () { /* 约饭已不存在，忽略 */ });
  }
  await ctx.db.collection('calendar_events').doc(eventId).remove();
  return {};
}

module.exports = { list: list, get: get, create: create, update: update, remove: remove };
