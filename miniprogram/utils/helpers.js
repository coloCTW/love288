/* ═══════════════════════════════════════════════════════════════════
   两个人的小世界 · 日期/文案纯函数
   移植自原型 shared/js/store.js，语义保持一致
   ═══════════════════════════════════════════════════════════════════ */
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
  if (diff === 1) return '明天见';
  if (diff > 1) return diff + '天后';
  return '已经过去啦';
}

function uid(prefix) {
  return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

/* 9 种心情的展示元数据（PRD §7.2，首页与心情页共用） */
var MOODS = [
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

function moodMeta(type) {
  for (var i = 0; i < MOODS.length; i++) {
    if (MOODS[i].type === type) return MOODS[i];
  }
  return { type: type, icon: 'm-calm', tint: 'tint-paper' };
}

module.exports = {
  pad: pad,
  iso: iso,
  addDays: addDays,
  hoursAgo: hoursAgo,
  daysAgo: daysAgo,
  daysTogether: daysTogether,
  fmtDate: fmtDate,
  fmtRel: fmtRel,
  countdown: countdown,
  uid: uid,
  MOODS: MOODS,
  moodMeta: moodMeta
};
