/* ═══════════════════════════════════════════════════════════════════
   两个人的小世界 · 前端共享数据层（云数据快照）
   保留模块单例 + subscribe/notify 模式（页面订阅写法不变），
   数据源从本地 mock 换成云函数：各域 fetch 拉取 → 合并快照 → notify。
   同域请求自动去重（页面 onLoad + onShow 会连发两次）。
   ═══════════════════════════════════════════════════════════════════ */
const api = require('./api.js');
const h = require('./helpers.js');

/* 清掉旧版 mock 的本地缓存（love288.state.v1） */
try { wx.removeStorageSync('love288.state.v1'); } catch (e) { /* noop */ }

var state = {
  ready: false,
  bound: false,
  demoMode: false,
  me: null,
  ta: null,
  couple: null,
  weather: { me: null, ta: null },
  mood: { me: null, ta: null },
  nextDate: null,
  meals: { list: [] },
  remind: { count: 0, limit: 3 },
  mealShares: { today: [], history: [] },
  posts: [],
  events: { month: '', monthEvents: [], upcoming: [] },
  profile: { user: null, couple: null, ta: null, coupleBound: false, demoMode: false }
};

var listeners = [];
var inflight = {};

function notify() {
  for (var i = 0; i < listeners.length; i++) {
    try { listeners[i](state); } catch (e) { /* noop */ }
  }
}

function subscribe(fn) {
  listeners.push(fn);
  return function () {
    var i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function get() { return state; }

/* 局部合并快照并通知（页面写操作成功后同步本地视图用） */
function merge(part) {
  Object.assign(state, part);
  notify();
}

/* 同域并发去重：inflight 中已有 promise 直接复用 */
function once(key, factory) {
  if (inflight[key]) return inflight[key];
  var p = factory().then(function (r) { delete inflight[key]; return r; }, function (e) { delete inflight[key]; throw e; });
  inflight[key] = p;
  return p;
}

/* ── 域 fetch ─────────────────────────────────────────────────── */

function fetchUser() {
  return once('user', function () {
    return api.user.login().then(function (d) {
      merge({ ready: true, me: d.user, bound: !!d.coupleBound, demoMode: !!d.demoMode });
    });
  });
}

function fetchHome() {
  return once('home', function () {
    return api.home.overview().then(function (d) {
      merge({
        ready: true,
        me: d.me, ta: d.ta, couple: d.couple,
        weather: d.weather, mood: d.mood, nextDate: d.nextDate
      });
    });
  });
}

function fetchEat() {
  return once('eat', function () {
    return Promise.all([
      api.meal.list({ scope: 'upcoming' }),
      api.mealShare.list({ scope: 'today' }),
      api.mealShare.list({ scope: 'history' })
    ]).then(function (r) {
      merge({
        meals: { list: r[0].list },
        remind: { count: r[0].remindTodayCount || 0, limit: r[0].remindLimit || 3 },
        mealShares: { today: r[1].list, history: r[2].list }
      });
    });
  });
}

function fetchPosts() {
  return once('posts', function () {
    return api.post.list({ page: 1 }).then(function (d) {
      merge({ posts: d.list });
    });
  });
}

function fetchEvents(month) {
  return once('events:' + month, function () {
    return api.event.list({ month: month }).then(function (d) {
      merge({ events: { month: month, monthEvents: d.monthEvents, upcoming: d.upcoming } });
    });
  });
}

function fetchMoods() {
  return once('moods', function () {
    return api.mood.get().then(function (d) {
      merge({ mood: d });
    });
  });
}

function fetchProfile() {
  return once('profile', function () {
    return Promise.all([
      api.user.get(),
      api.couple.get().catch(function () { return null; })
    ]).then(function (r) {
      var u = r[0], cp = r[1];
      merge({
        profile: {
          user: u.user,
          couple: cp && cp.couple,
          ta: cp && cp.ta,
          coupleBound: u.coupleBound,
          demoMode: u.demoMode
        }
      });
    });
  });
}

/* ── 纯函数再导出（与旧 store 一致，页面零改动） ─────────────── */
module.exports = {
  get: get,
  merge: merge,
  subscribe: subscribe,
  fetchUser: fetchUser,
  fetchHome: fetchHome,
  fetchEat: fetchEat,
  fetchPosts: fetchPosts,
  fetchEvents: fetchEvents,
  fetchMoods: fetchMoods,
  fetchProfile: fetchProfile,
  today: function () { return h.iso(new Date()); },
  iso: h.iso,
  addDays: h.addDays,
  hoursAgo: h.hoursAgo,
  daysAgo: h.daysAgo,
  daysTogether: h.daysTogether,
  fmtDate: h.fmtDate,
  fmtRel: h.fmtRel,
  countdown: h.countdown,
  uid: h.uid,
  MOODS: h.MOODS,
  moodMeta: h.moodMeta
};
