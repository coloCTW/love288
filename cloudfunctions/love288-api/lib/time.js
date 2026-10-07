/* 北京时间工具。
   云函数运行环境是 UTC，所有"今天 / 每日限流 / 月份过滤"都必须经过这里：
   统一用 Date.now() + 8 小时后取 UTC getter，得到北京时间的年月日。 */
const BJ_OFFSET = 8 * 3600e3;

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function bjDate(ts) { return new Date((ts || Date.now()) + BJ_OFFSET); }

/* 当前毫秒时间戳 */
function now() { return Date.now(); }

/* 北京今天的 'YYYY-MM-DD' */
function today() {
  const d = bjDate();
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}

/* 北京本月 'YYYY-MM' */
function thisMonth() {
  const d = bjDate();
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1);
}

/* 北京今天零点（毫秒时间戳） */
function todayStart() {
  const d = bjDate();
  const zero = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return zero - BJ_OFFSET;
}

/* 北京明天零点（毫秒时间戳） */
function tomorrowStart() { return todayStart() + 86400e3; }

/* iso 日期字符串加 n 天（日期串无时区，按 UTC 解析偏移即可） */
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}

/* 恋爱天数：两个 'YYYY-MM-DD' 之间的天数（按 +08:00 零点） */
function daysBetween(fromIso, toIso) {
  const a = new Date(fromIso + 'T00:00:00+08:00').getTime();
  const b = new Date(toIso + 'T00:00:00+08:00').getTime();
  return Math.max(0, Math.round((b - a) / 86400e3));
}

/* '2026-09-23' → '2026.09.23'（展示格式） */
function fmtDate(iso) {
  if (!iso) return '';
  return iso.replace(/-/g, '.');
}

module.exports = {
  now: now,
  today: today,
  thisMonth: thisMonth,
  todayStart: todayStart,
  tomorrowStart: tomorrowStart,
  addDays: addDays,
  daysBetween: daysBetween,
  fmtDate: fmtDate
};
