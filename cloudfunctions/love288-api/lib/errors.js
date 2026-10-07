/* 错误码与温柔文案。biz(code, message) 抛出的 Error 会被 index.js 捕获并转成 fail 响应。 */
const MESSAGES = {
  40001: '参数不对哦，检查一下再试～',
  40101: '还没拿到你的身份信息，重新打开小程序试试吧～',
  40201: '还没有绑定情侣哦，去「我的」页绑定 TA 吧 ❤️',
  40202: '邀请码不对或者已经过期啦，再让 TA 发一个新的吧～',
  40203: '已经绑定啦，先把现在的解除，再绑定新的人哦～',
  40301: '这条不是你的，只能改自己的哦～',
  40401: '这条内容不见啦，可能已经被删掉了～',
  42901: '今天已经提醒 3 次啦，TA 会记得的 ❤️',
  50000: '好像走神了一下，再试一次吧～'
};

function biz(code, message) {
  const e = new Error(message || MESSAGES[code] || MESSAGES[50000]);
  e.code = code;
  return e;
}

module.exports = { biz: biz, MESSAGES: MESSAGES };
