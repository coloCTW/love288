/* 统一响应：{ code, message, data }。code = 0 成功，见 errors.js 错误码表。 */
function ok(data) {
  return { code: 0, message: 'ok', data: data || {} };
}

function fail(code, message) {
  return { code: code, message: message || '好像走神了一下，再试一次吧～' };
}

module.exports = { ok: ok, fail: fail };
