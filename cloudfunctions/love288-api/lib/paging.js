/* 分页参数解析：page 从 1 起，pageSize 默认 20 最大 50 */
function paging(event) {
  let page = parseInt(event && event.page, 10) || 1;
  let pageSize = parseInt(event && event.pageSize, 10) || 20;
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = 20;
  if (pageSize > 50) pageSize = 50;
  return { page: page, pageSize: pageSize, skip: (page - 1) * pageSize };
}

module.exports = { paging: paging };
