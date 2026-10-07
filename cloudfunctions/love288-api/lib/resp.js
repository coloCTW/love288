/* 统一响应：{ code, message, data }。code = 0 成功，见 errors.js 错误码表。 */
function ok(data) {
  return { code: 0, message: 'ok', data: data || {} };
}

function fail(code, message) {
  /* 统一响应格式 { code, message, data }（docs/api.md §1.2），失败时 data 为 null */
  return { code: code, message: message || '好像走神了一下，再试一次吧～', data: null };
}

module.exports = { ok: ok, fail: fail };
