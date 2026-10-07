/* 同步心情 · 9 选 1，一天一个心情，随时可改
   当前心情来自 mood.get，提交走 mood.update（服务端按天 upsert） */
const store = require('../../utils/store.js');
const api = require('../../utils/api.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');

Page({
  data: {
    moods: [],
    selected: '',
    busy: false,
    checkIcon: icons.iconURI('ic-check', '#fff7f2'),
    sunIcon: icons.iconURI('ic-sun', '#3e3232')
  },

  onLoad() {
    this.buildList('');
    api.mood.get().then((d) => {
      const current = (d.me && d.me.type) || '';
      this.buildList(current);
    }).catch(() => { /* 拉取失败不打扰，列表仍可选择提交 */ });
  },

  buildList(current) {
    const moods = store.MOODS.map((m) => ({
      type: m.type,
      face: icons.faceURI(m.icon),
      tint: m.tint,
      selected: m.type === current,
      bounce: false
    }));
    this.setData({ moods: moods, selected: current });
  },

  onPick(e) {
    const type = e.currentTarget.dataset.type;
    const idx = this.data.moods.findIndex((m) => m.type === type);
    if (idx < 0) return;
    if (type === this.data.selected) {
      /* 重选同一项：两段式重触发弹跳动画 */
      this.setData({ ['moods[' + idx + '].bounce']: false }, () => {
        this.setData({ ['moods[' + idx + '].bounce']: true });
      });
      return;
    }
    const moods = this.data.moods.map((m) => ({
      type: m.type, face: m.face, tint: m.tint,
      selected: m.type === type,
      bounce: m.type === type
    }));
    this.setData({ moods: moods, selected: type });
  },

  onConfirm() {
    const selected = this.data.selected;
    if (!selected) {
      ui.toast('先选一个心情哦～', '🌸');
      return;
    }
    const that = this;
    ui.withSun(this, 'busy', 700, function () {
      api.mood.update({ moodType: selected }).then(function () {
        const h = that.selectComponent('#hearts');
        if (h) h.burst(8);
        ui.toast('好啦，已同步给 TA ❤️', '💌');
        setTimeout(function () {
          if (getCurrentPages().length > 1) wx.navigateBack();
          else wx.switchTab({ url: '/pages/home/home' });
        }, 1300);
      }).catch(function (e) {
        ui.toast(e.message, '💨');
      });
    });
  }
});
