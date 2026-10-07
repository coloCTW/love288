/* 互动：想你了 / 抱抱 / 我在哦 / 喝水 / 叫醒。
   落库留痕（P1 可做"收到的互动"页），订阅消息推送为 P1。 */
const config = require('../lib/config');
const errors = require('../lib/errors');
const time = require('../lib/time');
const idLib = require('../lib/id');

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
  return { delivered: true };
}

module.exports = { send: send };
