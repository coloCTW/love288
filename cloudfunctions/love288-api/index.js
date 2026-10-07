/* ═══════════════════════════════════════════════════════════════════
   两个人的小世界 · 业务云函数
   单个云函数 + event.type 路由（AGENTS.md 约定），统一响应 { code, message, data }。
   接口文档见 docs/api.md，集合设计见 docs/sql.md。
   ═══════════════════════════════════════════════════════════════════ */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const resp = require('./lib/resp');
const errors = require('./lib/errors');
const auth = require('./middleware/auth');

const user = require('./handlers/user');
const couple = require('./handlers/couple');
const home = require('./handlers/home');
const mood = require('./handlers/mood');
const meal = require('./handlers/meal');
const mealShare = require('./handlers/mealShare');
const post = require('./handlers/post');
const event = require('./handlers/event');
const interaction = require('./handlers/interaction');
const reminder = require('./handlers/reminder');
const init = require('./handlers/init');

const ROUTES = {
  'user.login': user.login,
  'user.get': user.get,
  'user.update': user.update,
  'user.reportStatus': user.reportStatus,
  'couple.get': couple.get,
  'couple.genCode': couple.genCode,
  'couple.bind': couple.bind,
  'couple.unpair': couple.unpair,
  'couple.updateSettings': couple.updateSettings,
  'home.overview': home.overview,
  'mood.get': mood.get,
  'mood.update': mood.update,
  'meal.list': meal.list,
  'meal.create': meal.create,
  'mealShare.list': mealShare.list,
  'mealShare.create': mealShare.create,
  'post.list': post.list,
  'post.create': post.create,
  'post.delete': post.remove,
  'post.like': post.like,
  'post.comments': post.comments,
  'post.commentCreate': post.commentCreate,
  'event.list': event.list,
  'event.get': event.get,
  'event.create': event.create,
  'event.update': event.update,
  'event.delete': event.remove,
  'interaction.send': interaction.send,
  'reminder.meal': reminder.meal
};

exports.main = async (event) => {
  const type = event && event.type;
  try {
    /* init.seed 免鉴权、免情侣上下文 */
    if (type === 'init.seed') {
      return resp.ok(await init.run(db, event));
    }
    if (!type || !ROUTES[type]) {
      return resp.fail(40001, '这个功能还没有准备好哦～');
    }
    const ctx = await auth.buildContext(db, _, cloud, event);
    return resp.ok(await ROUTES[type](ctx, event));
  } catch (e) {
    console.error('[love288-api]', type, e);
    return resp.fail(e.code || 50000, e.message || errors.MESSAGES[50000]);
  }
};
