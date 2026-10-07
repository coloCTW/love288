/* ═══════════════════════════════════════════════════════════════════
   演示数据种子（与 docs/sql.md §6 一致，但日期相对"运行当天"生成，
   保证演示数据永远新鲜——语义与原 mock utils/store.js 的 seed() 相同：
   约饭 +2 天、约会 +8/+16 天、待办 +4 天、纪念日 +34 天）。
   修改数据请同步 docs/sql.md。
   ═══════════════════════════════════════════════════════════════════ */
const time = require('./lib/time');
const config = require('./lib/config');

const NOW = time.now();
const H = 3600e3;
const D = 24 * H;
const today = time.today();
const ago = (ms) => NOW - ms;
const addD = (n) => time.addDays(today, n);

const COLLECTIONS = [
  'users', 'couples', 'moods', 'meal_reminders', 'meal_appointments',
  'calendar_events', 'posts', 'likes', 'comments', 'meal_shares',
  'interactions', 'weather_cache'
];

const SEED = {
  /* 用户（_id = openid；真实登录用户由中间件自动 upsert） */
  users: [
    {
      _id: config.DEMO_LIN, nickname: '大头仔', avatar: '', city: '上海市',
      batteryLevel: 45, batteryUpdatedAt: ago(40 * 60000),
      lastActiveAt: ago(5 * 60000), createdAt: ago(6 * D)
    },
    {
      _id: config.DEMO_SU, nickname: '宝宝', avatar: '', city: '北京市',
      batteryLevel: 65, batteryUpdatedAt: ago(68 * 60000),
      lastActiveAt: ago(10 * 60000), createdAt: ago(6 * D)
    }
  ],

  /* 情侣关系 */
  couples: [
    {
      _id: config.DEMO_COUPLE_ID, userAId: config.DEMO_LIN, userBId: config.DEMO_SU,
      startDate: '2016-11-19', inviteCode: '', status: 'active',
      settings: Object.assign({}, config.DEFAULT_SETTINGS),
      createdAt: ago(6 * D), updatedAt: ago(5 * 60000)
    }
  ],

  /* 今天双方心情各一条 */
  moods: [
    { _id: 'mood-' + today + '-' + config.DEMO_LIN, coupleId: config.DEMO_COUPLE_ID, userId: config.DEMO_LIN, date: today, moodType: '平静', createdAt: ago(1 * H), updatedAt: ago(1 * H) },
    { _id: 'mood-' + today + '-' + config.DEMO_SU, coupleId: config.DEMO_COUPLE_ID, userId: config.DEMO_SU, date: today, moodType: '喜悦', createdAt: ago(2 * H), updatedAt: ago(2 * H) }
  ],

  /* 今天已提醒 1 次（配合演示模式计数口径：sender ∈ [真实openid, demo-lin]） */
  meal_reminders: [
    { _id: 'mr-1', coupleId: config.DEMO_COUPLE_ID, senderId: config.DEMO_LIN, receiverId: config.DEMO_SU, date: today, content: '记得好好吃饭呀～', createdAt: ago(2 * H) }
  ],

  /* 最近约饭：+2 天 */
  meal_appointments: [
    {
      _id: 'meal-1', coupleId: config.DEMO_COUPLE_ID, creatorId: config.DEMO_LIN,
      title: '火锅', date: addD(2), time: '12:30',
      city: '上海市', location: '海底捞（陆家嘴店）',
      coverImage: '', note: '和你一起吃饭，真好～ ❤️',
      status: 'upcoming', eventId: 'ev-meal-1',
      createdAt: ago(1 * D), updatedAt: ago(1 * D)
    }
  ],

  /* 计划事件：约会 +8/+16 天、纪念日（固定日期）、待办 +4 天、约饭联动 */
  calendar_events: [
    { _id: 'ev-1', coupleId: config.DEMO_COUPLE_ID, creatorId: config.DEMO_LIN, title: '看电影', eventType: 'date', date: addD(8), time: '19:00', city: '上海市', location: 'CGV影城', image: '', note: '记得提前买票哦～', status: 'active', createdAt: ago(1 * D), updatedAt: ago(1 * D) },
    { _id: 'ev-2', coupleId: config.DEMO_COUPLE_ID, creatorId: config.DEMO_SU, title: '去看海', eventType: 'date', date: addD(16), time: '09:00', city: '青岛市', location: '五四广场', image: '', note: '终于可以一起去看海啦～', status: 'active', createdAt: ago(3 * D), updatedAt: ago(3 * D) },
    { _id: 'ev-3', coupleId: config.DEMO_COUPLE_ID, creatorId: config.DEMO_LIN, title: '一周年纪念日', eventType: 'anniversary', date: addD(34), time: '', city: '', location: '', image: '', note: '和你在一起一周年 ❤️', status: 'active', createdAt: ago(6 * D), updatedAt: ago(6 * D) },
    { _id: 'ev-4', coupleId: config.DEMO_COUPLE_ID, creatorId: config.DEMO_LIN, title: '帮 TA 挑生日礼物', eventType: 'todo', date: addD(4), time: '20:00', city: '', location: '', image: '', note: '想挑一件 TA 会喜欢的', status: 'active', createdAt: ago(1 * D), updatedAt: ago(1 * D) },
    { _id: 'ev-meal-1', coupleId: config.DEMO_COUPLE_ID, creatorId: config.DEMO_LIN, title: '火锅', eventType: 'meal', date: addD(2), time: '12:30', city: '上海市', location: '海底捞（陆家嘴店）', image: '', note: '和你一起吃饭，真好～ ❤️', status: 'active', mealId: 'meal-1', createdAt: ago(1 * D), updatedAt: ago(1 * D) }
  ],

  /* 日常动态 3 条（images 为空数组，无真实图片） */
  posts: [
    { _id: 'post-1', coupleId: config.DEMO_COUPLE_ID, userId: config.DEMO_LIN, type: 'normal', content: '今天和苏棠一起去看了新开的展览～\n好喜欢这幅画！❤️', images: [], location: '上海市', tags: ['约会日'], likeCount: 2, commentCount: 1, deletedAt: null, createdAt: ago(2 * H) },
    { _id: 'post-2', coupleId: config.DEMO_COUPLE_ID, userId: config.DEMO_SU, type: 'meal', content: '今天的便当打卡～\n好好吃饭，等我回去一起吃火锅！', images: [], location: '北京市', tags: [], likeCount: 1, commentCount: 0, deletedAt: null, createdAt: ago(1 * D) },
    { _id: 'post-3', coupleId: config.DEMO_COUPLE_ID, userId: config.DEMO_LIN, type: 'normal', content: '想到很快就能见到你，工作都有动力了 ☀️', images: [], location: '上海市', tags: ['想你'], likeCount: 0, commentCount: 0, deletedAt: null, createdAt: ago(3 * D) }
  ],

  /* 点赞（与 posts 的 likeCount 一致） */
  likes: [
    { _id: 'like-1', postId: 'post-1', userId: config.DEMO_LIN, createdAt: ago(2 * H) },
    { _id: 'like-2', postId: 'post-1', userId: config.DEMO_SU, createdAt: ago(1 * H) },
    { _id: 'like-3', postId: 'post-2', userId: config.DEMO_LIN, createdAt: ago(1 * D) }
  ],

  /* 评论 */
  comments: [
    { _id: 'cmt-1', postId: 'post-1', userId: config.DEMO_SU, content: '下次还要一起去呀～', createdAt: ago(1 * H) }
  ],

  /* 餐食分享 2 条（历史；postId 为空表示旧数据未联动） */
  meal_shares: [
    { _id: 'ms-1', coupleId: config.DEMO_COUPLE_ID, userId: config.DEMO_SU, content: '今天也要好好吃饭呀～ ❤️', images: [], postId: '', createdAt: ago(1 * D) },
    { _id: 'ms-2', coupleId: config.DEMO_COUPLE_ID, userId: config.DEMO_LIN, content: '加班也要认真吃晚饭！', images: [], postId: '', createdAt: ago(4 * D) }
  ],

  /* 互动事件示例 */
  interactions: [
    { _id: 'it-1', coupleId: config.DEMO_COUPLE_ID, senderId: config.DEMO_LIN, receiverId: config.DEMO_SU, type: 'miss_you', content: '想你了', createdAt: ago(2 * H) },
    { _id: 'it-2', coupleId: config.DEMO_COUPLE_ID, senderId: config.DEMO_LIN, receiverId: config.DEMO_SU, type: 'water', content: '提醒 TA 喝水', createdAt: ago(1 * H) }
  ],

  /* 天气缓存（首页天气卡数据源；第三方 API 为 P1） */
  weather_cache: [
    { _id: '上海市', city: '上海市', temp: 26, cond: '多云', high: 28, low: 22, updatedAt: ago(5 * 60000) },
    { _id: '北京市', city: '北京市', temp: 21, cond: '晴', high: 24, low: 16, updatedAt: ago(5 * 60000) }
  ]
};

module.exports = { COLLECTIONS: COLLECTIONS, SEED: SEED };
