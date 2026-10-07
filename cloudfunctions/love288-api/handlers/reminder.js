/* 吃饭提醒：每日最多 3 次，限流在服务端按 senderId + date（北京时间）统计。
   演示模式下 demo-lin 种子的提醒也计入"我"的当日次数。 */
const config = require('../lib/config');
const errors = require('../lib/errors');
const time = require('../lib/time');
const idLib = require('../lib/id');
const subscribe = require('../lib/subscribe');

/* 文案池：原 eat.js 的 REMIND_POOL 迁入 */
const REMIND_POOL = [
  '记得好好吃饭呀～',
  '到饭点啦，别饿到自己哦 ❤️',
  '宝宝，去吃饭啦～',
  '我提醒你吃饭啦，快去～'
];

async function meal(ctx) {
  const today = time.today();
  const _ = ctx._;
  const col = ctx.db.collection('meal_reminders');
  const countR = await col
    .where({ coupleId: ctx.coupleId, date: today, senderId: _.in(ctx.selfIds) })
    .count();
  const count = countR.total;
  if (count >= config.REMIND_LIMIT) throw errors.biz(42901);

  const content = REMIND_POOL[Math.floor(Math.random() * REMIND_POOL.length)];
  await col.doc(idLib.genId('mr')).set({
    data: {
      coupleId: ctx.coupleId, senderId: ctx.openid, receiverId: ctx.partnerId,
      date: today, content: content, createdAt: time.now()
    }
  });
  /* 尽力推送订阅消息给对方（失败静默） */
  subscribe.send(ctx.cloud, ctx.partnerId, 'mealReminder', {
    thing1: content,
    thing2: ctx.user.nickname || 'TA'
  });
  return { todayCount: count + 1, limit: config.REMIND_LIMIT, content: content };
}

module.exports = { meal: meal };
