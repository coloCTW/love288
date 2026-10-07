/* 餐食分享 · 1–9 张照片 + 一句话；走 mealShare.create，服务端联动写入日常动态 */
const api = require('../../utils/api.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');
const upload = require('../../utils/upload.js');

const MAX = 9;

Page({
  data: {
    slots: [],
    picked: 0,
    content: '今天也要好好吃饭呀～ ❤️',
    busy: false,
    icons: {
      photo: icons.iconURI('ic-photo', '#b8aa99'),
      bowl: icons.iconURI('ic-bowl', '#6a695d'),
      check: icons.iconURI('ic-check', '#fff7f2'),
      heart: icons.iconURI('ic-heart-fill', '#3e3232'),
      sun: icons.iconURI('ic-sun', '#3e3232')
    }
  },

  onLoad() {
    const slots = [];
    for (let i = 0; i < MAX; i++) slots.push({ k: i, filled: false, uri: '', fileID: '' });
    this.setData({ slots: slots });
  },

  /* 点格子：已填移除；未填选图上传 */
  onSlotTap(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const slots = this.data.slots;
    if (slots[idx].filled) {
      this.setData({
        ['slots[' + idx + '].filled']: false,
        ['slots[' + idx + '].uri']: '',
        ['slots[' + idx + '].fileID']: '',
        picked: this.data.picked - 1
      });
      return;
    }
    const that = this;
    upload.chooseAndUpload(1, 'meal-shares/').then(function (files) {
      if (!files || !files.length) return;
      const cur = that.data.slots;
      if (cur[idx].filled) return;
      that.setData({
        ['slots[' + idx + '].filled']: true,
        ['slots[' + idx + '].uri']: files[0].tempPath,
        ['slots[' + idx + '].fileID']: files[0].fileID,
        picked: that.data.picked + 1
      });
    }).catch(function (err) {
      ui.toast(err.message || upload.FALLBACK_MSG, '📷');
    });
  },

  onContent(e) {
    this.setData({ content: e.detail.value });
  },

  onSend() {
    const picked = this.data.picked;
    if (picked === 0) {
      ui.toast('先选一张照片吧，美食要留影呀～', '🍜');
      return;
    }
    const content = this.data.content.trim() || '今天也要好好吃饭呀～ ❤️';
    const images = this.data.slots.filter((s) => s.filled && s.fileID).map((s) => s.fileID);
    const that = this;
    ui.withSun(this, 'busy', 800, function () {
      api.mealShare.create({ content: content, images: images }).then(function () {
        const h = that.selectComponent('#hearts');
        if (h) h.burst(8);
        ui.toast('已分享给 TA，也写进日常啦 ❤️', '🥢');
        setTimeout(function () { wx.navigateBack(); }, 1300);
      }).catch(function (e) {
        ui.toast(e.message, '🥢');
      });
    });
  }
});
