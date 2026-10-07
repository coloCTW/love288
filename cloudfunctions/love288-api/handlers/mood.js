/* 心情：get / update。
   moodPair 供 home.overview 复用：演示模式下"我"的心情优先查真实 openid、
   查不到回退 demo-lin —— 保证「改了心情 → 首页可见」的闭环可验证。 */
const config = require('../lib/config');
const errors = require('../lib/errors');
const time = require('../lib/time');

function fmt(m) {
  return m ? { type: m.moodType, at: m.updatedAt } : null;
}

async function moodPair(ctx, today) {
  const col = ctx.db.collection('moods');
  const myIds = ctx.demoMode ? [ctx.openid, config.DEMO_LIN] : [ctx.openid];
  let me = null;
  for (let i = 0; i < myIds.length && !me; i++) {
    const r = await col.where({ coupleId: ctx.coupleId, userId: myIds[i], date: today }).limit(1).get();
    if (r.data.length) me = r.data[0];
  }
  const taR = await col.where({ coupleId: ctx.coupleId, userId: ctx.partnerId, date: today }).limit(1).get();
  return { me: fmt(me), ta: fmt(taR.data.length ? taR.data[0] : null) };
}

async function get(ctx) {
  return moodPair(ctx, time.today());
}

/* 一天一个心情，随时可改：按 (coupleId, userId, date) upsert */
async function update(ctx, event) {
  const moodType = String(event.moodType || '').trim();
  if (config.MOOD_TYPES.indexOf(moodType) < 0) {
    throw errors.biz(40001, '这个心情不在心情列表里哦～');
  }
  const today = time.today();
  const now = time.now();
  const col = ctx.db.collection('moods');
  const docId = 'mood-' + today + '-' + ctx.openid;
  const exist = await col.where({ coupleId: ctx.coupleId, userId: ctx.openid, date: today }).limit(1).get();
  if (exist.data.length) {
    await col.doc(exist.data[0]._id).update({ data: { moodType: moodType, updatedAt: now } });
  } else {
    await col.doc(docId).set({
      data: {
        coupleId: ctx.coupleId, userId: ctx.openid, date: today,
        moodType: moodType, createdAt: now, updatedAt: now
      }
    });
  }
  return { mood: { type: moodType, at: now } };
}

module.exports = { get: get, update: update, moodPair: moodPair };
