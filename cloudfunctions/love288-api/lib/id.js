/* 业务文档 id：prefix + 时间 + 随机段（与前端 helpers.uid 同语义） */
function genId(prefix) {
  return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

module.exports = { genId: genId };
