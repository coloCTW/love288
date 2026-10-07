/* ═══════════════════════════════════════════════════════════════════
   两个人的小世界 · 共享数据层
   localStorage 持久化 + storage 事件跨页面同步，实现 PRD §18 四 Tab 联动：
   心情 → 首页 / 约饭 → 计划 / 餐食分享 → 日常 / 约会 → 月历
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KEY = 'love288.state.v1';
  var mem = null;

  /* ── 日期工具 ───────────────────────────────────────────────────── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function addDays(offset) {
    var d = new Date();
    d.setDate(d.getDate() + offset);
    return iso(d);
  }
  function hoursAgo(h) { return new Date(Date.now() - h * 3600e3).getTime(); }
  function daysAgo(n) { return hoursAgo(n * 24); }
  function daysTogether(startIso) {
    var s = new Date(startIso + 'T00:00:00');
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((t - s) / 86400e3));
  }
  function fmtDate(isoStr) { // 2026-09-12 → 2026.09.12
    if (!isoStr) return '';
    return isoStr.replace(/-/g, '.');
  }
  function fmtRel(ts) {
    var diff = Date.now() - ts;
    var m = Math.floor(diff / 6e4);
    if (m < 1) return '刚刚';
    if (m < 60) return m + '分钟前';
    var h = Math.floor(m / 60);
    if (h < 24) return h + '小时前';
    var d = Math.floor(h / 24);
    if (d === 1) return '昨天';
    if (d < 7) return d + '天前';
    var dt = new Date(ts);
    return (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
  }
  function countdown(dateIso) {
    var target = new Date(dateIso + 'T00:00:00');
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var diff = Math.round((target - today) / 86400e3);
    if (diff === 0) return '就是今天！';
    if (diff === 1) return '明天见 ❤️';
    if (diff > 1) return diff + '天后';
    return '已经过去啦';
  }
  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  /* ── 种子数据（示例来自 PRD，日期相对今天生成） ──────────────────── */
  function seed() {
    return {
      version: 1,
      me: { id: 'lin', nickname: '林舟', city: '上海市', battery: 45, batteryAt: '09:40' },
      ta: { id: 'su', nickname: '苏棠', city: '北京市', battery: 65, batteryAt: '09:12' },
      couple: {
        start: '2025-11-10',
        distanceKm: 866.9,
        weather: {
          me: { city: '上海市', temp: 26, cond: '多云', high: 28, low: 22, updatedAt: '08:30' },
          ta: { city: '北京市', temp: 21, cond: '晴', high: 24, low: 16, updatedAt: '08:30' }
        }
      },
      mood: {
        me: { type: '平静', at: hoursAgo(1) },
        ta: { type: '喜悦', at: hoursAgo(2) }
      },
      remind: { date: iso(new Date()), count: 1 },
      /* 约饭（好好吃饭模块） */
      meals: [
        {
          id: 'meal-1', creatorId: 'lin', kind: '火锅',
          date: addDays(2), time: '12:30',
          city: '上海市', location: '海底捞（陆家嘴店）',
          note: '和你一起吃饭，真好～ ❤️'
        }
      ],
      /* 计划事件：type = date 约会 / anniversary 纪念日 / todo 待办 / meal 约饭 */
      events: [
        { id: 'ev-1', creatorId: 'lin', title: '看电影', type: 'date', date: addDays(8), time: '19:00', city: '上海市', location: 'CGV影城', note: '记得提前买票哦～' },
        { id: 'ev-2', creatorId: 'su', title: '去看海', type: 'date', date: addDays(16), time: '09:00', city: '青岛市', location: '五四广场', note: '终于可以一起去看海啦～' },
        { id: 'ev-3', creatorId: 'lin', title: '一周年纪念日', type: 'anniversary', date: '2026-11-10', time: '', city: '', location: '', note: '和你在一起一周年 ❤️' },
        { id: 'ev-4', creatorId: 'lin', title: '帮 TA 挑生日礼物', type: 'todo', date: addDays(4), time: '20:00', city: '', location: '', note: '想挑一件 TA 会喜欢的' }
      ],
      posts: [
        {
          id: 'post-1', userId: 'lin', type: 'normal',
          content: '今天和苏棠一起去看了新开的展览～\n好喜欢这幅画！❤️',
          photoCount: 3, location: '上海市',
          tags: ['约会日'],
          at: hoursAgo(2),
          likes: ['lin', 'su'],
          comments: [
            { userId: 'su', content: '下次还要一起去呀～', at: hoursAgo(1) }
          ]
        },
        {
          id: 'post-2', userId: 'su', type: 'meal',
          content: '今天的便当打卡～\n好好吃饭，等我回去一起吃火锅！',
          photoCount: 2, location: '北京市',
          tags: [],
          at: daysAgo(1),
          likes: ['lin'],
          comments: []
        },
        {
          id: 'post-3', userId: 'lin', type: 'normal',
          content: '想到很快就能见到你，工作都有动力了 ☀️',
          photoCount: 0, location: '上海市',
          tags: ['想你'],
          at: daysAgo(3),
          likes: [],
          comments: []
        }
      ],
      mealShares: [
        { id: 'ms-1', userId: 'su', content: '今天也要好好吃饭呀～ ❤️', photoCount: 1, at: daysAgo(1) },
        { id: 'ms-2', userId: 'lin', content: '加班也要认真吃晚饭！', photoCount: 1, at: daysAgo(4) }
      ],
      settings: { shareCity: true, shareDistance: true, mealNotify: true, dateNotify: true, wake: false }
    };
  }

  /* 存储后端：localStorage → sessionStorage → 内存（隐私模式等降级） */
  var backend = null;
  function getBackend() {
    if (backend !== null) return backend;
    backend = false;
    try {
      localStorage.setItem('__love288_test', '1');
      localStorage.removeItem('__love288_test');
      backend = 'local';
    } catch (e) {
      try {
        sessionStorage.setItem('__love288_test', '1');
        sessionStorage.removeItem('__love288_test');
        backend = 'session';
      } catch (e2) { backend = 'mem'; }
    }
    return backend;
  }
  function readRaw() {
    try {
      if (getBackend() === 'local') return localStorage.getItem(KEY);
      if (getBackend() === 'session') return sessionStorage.getItem(KEY);
    } catch (e) { /* noop */ }
    return null;
  }
  function writeRaw(val) {
    try {
      if (getBackend() === 'local') localStorage.setItem(KEY, val);
      else if (getBackend() === 'session') sessionStorage.setItem(KEY, val);
    } catch (e) { /* noop */ }
  }

  function load() {
    if (mem) return mem;
    var raw = readRaw();
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) { mem = parsed; return mem; }
      } catch (e) { /* noop */ }
    }
    mem = seed();
    writeRaw(JSON.stringify(mem));
    return mem;
  }

  function commit(mutator) {
    var s = load();
    mutator(s);
    writeRaw(JSON.stringify(s));
    try { window.dispatchEvent(new CustomEvent('love288:update', { detail: s })); } catch (e) { /* noop */ }
    return s;
  }

  function reset() {
    mem = null;
    try {
      if (getBackend() === 'local') localStorage.removeItem(KEY);
      else if (getBackend() === 'session') sessionStorage.removeItem(KEY);
    } catch (e) { /* noop */ }
    load();
    try { window.dispatchEvent(new CustomEvent('love288:update', { detail: mem })); } catch (e) { /* noop */ }
  }

  /* storage 事件：其他同源页面（总览画廊各画框）实时同步 */
  try {
    window.addEventListener('storage', function (ev) {
      if (ev.key === KEY && ev.newValue) {
        try { mem = JSON.parse(ev.newValue); } catch (e) { /* noop */ }
        try { window.dispatchEvent(new CustomEvent('love288:update', { detail: mem })); } catch (e) { /* noop */ }
      }
    });
  } catch (e) { /* noop */ }

  window.Store = {
    get: load,
    commit: commit,
    reset: reset,
    today: function () { return iso(new Date()); },
    iso: iso,
    addDays: addDays,
    daysTogether: daysTogether,
    fmtDate: fmtDate,
    fmtRel: fmtRel,
    countdown: countdown,
    uid: uid
  };

  /* 9 种心情的展示元数据（PRD §7.2，首页与心情页共用） */
  window.Store.MOODS = [
    { type: '喜悦', icon: 'm-joy',     tint: 'tint-sun' },
    { type: '悲伤', icon: 'm-sad',     tint: 'tint-blue' },
    { type: '愤怒', icon: 'm-angry',   tint: 'tint-peach' },
    { type: '害怕', icon: 'm-fear',    tint: 'tint-blue' },
    { type: '喜欢', icon: 'm-love',    tint: 'tint-pink' },
    { type: '平静', icon: 'm-calm',    tint: 'tint-green' },
    { type: '乐观', icon: 'm-hope',    tint: 'tint-sun' },
    { type: '兴奋', icon: 'm-excite',  tint: 'tint-pink' },
    { type: '焦虑', icon: 'm-anxious', tint: 'tint-blue' }
  ];
  window.Store.moodMeta = function (type) {
    for (var i = 0; i < window.Store.MOODS.length; i++) {
      if (window.Store.MOODS[i].type === type) return window.Store.MOODS[i];
    }
    return { type: type, icon: 'm-calm', tint: 'tint-paper' };
  };
})();
