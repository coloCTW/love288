/* ═══════════════════════════════════════════════════════════════════
   两个人的小世界 · 轻交互助手
   toast：wx.showToast(icon:'none')，emoji 放进 title，还原原型药丸 toast
   withSun：按钮内小太阳 loading（busy 标志防连点）
   ═══════════════════════════════════════════════════════════════════ */
function toast(msg, emoji) {
  wx.showToast({
    title: emoji ? emoji + ' ' + msg : msg,
    icon: 'none',
    duration: 2000
  });
}

function withSun(page, busyKey, ms, done) {
  if (page.data[busyKey]) return;
  page.setData({ [busyKey]: true });
  setTimeout(function () {
    page.setData({ [busyKey]: false });
    if (done) done();
  }, ms || 700);
}

module.exports = { toast: toast, withSun: withSun };
