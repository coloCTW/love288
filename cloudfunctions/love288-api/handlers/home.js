/* 首页聚合：双方状态卡 / 天气 / 电量 / 今日心情 / 恋爱天数 / 下次见面 */
const config = require('../lib/config');
const time = require('../lib/time');
const mood = require('./mood');
const weatherLib = require('../lib/weather');

const BATTERY_STALE = 24 * 3600e3;

function pubUser(doc) {
  if (!doc) return null;
  const level = (!doc.batteryUpdatedAt || time.now() - doc.batteryUpdatedAt > BATTERY_STALE)
    ? null : doc.batteryLevel;
  return {
    id: doc._id,
    nickname: doc.nickname || '',
    avatar: doc.avatar || '',
    city: doc.city || '',
    batteryLevel: level,
    batteryUpdatedAt: doc.batteryUpdatedAt || null
  };
}

/* 下次见面：upcoming 约饭 ∪ 非待办事件，按日期取最近 */
async function nextDateFor(db, _, ctx, today) {
  const mealR = await db.collection('meal_appointments')
    .where({ coupleId: ctx.coupleId, status: 'upcoming', date: _.gte(today) })
    .orderBy('date', 'asc').limit(1).get();
  const evR = await db.collection('calendar_events')
    .where({ coupleId: ctx.coupleId, status: 'active', eventType: _.neq('todo'), date: _.gte(today) })
    .orderBy('date', 'asc').limit(1).get();
  let pick = null;
  if (mealR.data.length) {
    const m = mealR.data[0];
    pick = { type: 'meal', title: m.title, date: m.date, time: m.time, location: m.location };
  }
  if (evR.data.length && (!pick || evR.data[0].date < pick.date)) {
    const e = evR.data[0];
    pick = { type: e.eventType, title: e.title, date: e.date, time: e.time, location: e.location };
  }
  return pick;
}

async function overview(ctx) {
  const db = ctx.db;
  const _ = ctx._;
  const today = time.today();

  /* 双方用户：演示模式读演示情侣原样返回 */
  const meId = ctx.demoMode ? config.DEMO_LIN : ctx.openid;
  const taId = ctx.demoMode ? config.DEMO_SU : ctx.partnerId;
  const [meDoc, taDoc, coupleDoc, moodPair, nextDate] = await Promise.all([
    db.collection('users').doc(meId).get().catch(() => null),
    db.collection('users').doc(taId).get().catch(() => null),
    db.collection('couples').doc(ctx.coupleId).get().catch(() => null),
    mood.moodPair(ctx, today),
    nextDateFor(db, _, ctx, today)
  ]);

  const me = pubUser(meDoc && meDoc.data);
  const ta = pubUser(taDoc && taDoc.data);
  const cp = coupleDoc && coupleDoc.data;
  const settings = cp ? cp.settings : Object.assign({}, config.DEFAULT_SETTINGS);

  /* 天气（30 分钟缓存 + 和风 API）与距离（城市坐标表），并行拉取 */
  const shareCity = settings.shareCity !== false;
  const shareDistance = settings.shareDistance !== false;
  const [meWeather, taWeather, distanceKm] = await Promise.all([
    weatherLib.weatherFor(db, me && me.city),
    shareCity ? weatherLib.weatherFor(db, ta && ta.city) : Promise.resolve(null),
    shareDistance && me && ta ? weatherLib.distanceKm(me.city, ta.city) : Promise.resolve(null)
  ]);

  return {
    me: me,
    ta: ta,
    couple: {
      startDate: cp ? cp.startDate : '',
      daysTogether: cp && cp.startDate ? time.daysBetween(cp.startDate, today) : 0,
      distanceKm: distanceKm
    },
    weather: { me: meWeather, ta: taWeather },
    mood: moodPair,
    nextDate: nextDate
  };
}

module.exports = { overview: overview };
