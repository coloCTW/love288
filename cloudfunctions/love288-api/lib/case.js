/* 响应文档转换：
   toPub(doc, extra) — 把数据库文档暴露给前端：_id → id，可附加服务端算好的字段。
   集合字段按 sql.md 已是 camelCase，toCamel 仅作兜底（近似恒等）。 */

function toCamelKey(key) {
  if (key === '_id') return 'id';
  return key.replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); });
}

function toCamel(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj && typeof obj === 'object') {
    const out = {};
    Object.keys(obj).forEach(function (k) { out[toCamelKey(k)] = toCamel(obj[k]); });
    return out;
  }
  return obj;
}

/* 数据库文档 → 前端对象（去掉 _id，换成 id），extra 字段合并进去 */
function toPub(doc, extra) {
  if (!doc) return doc;
  const out = {};
  Object.keys(doc).forEach(function (k) {
    if (k !== '_id') out[toCamelKey(k)] = toCamel(doc[k]);
  });
  out.id = doc._id;
  if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
  return out;
}

module.exports = { toCamel: toCamel, toPub: toPub };
