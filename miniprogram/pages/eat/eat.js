/* 好好吃饭 · 一键提醒 / 最近约饭 / 今日分享 / 历史餐食
   数据来自 meal.list + mealShare.list（store.fetchEat 快照），
   提醒走 reminder.meal（每日 3 次限流在服务端） */
const store = require('../../utils/store.js');
const api = require('../../utils/api.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');

const ICONS = {
  bell: icons.iconURI('ic-bell', '#6a695d'),
  btnBell: icons.iconURI('ic-bell', '#3e3232'),
  sun: icons.iconURI('ic-sun', '#3e3232'),
  flower: icons.iconURI('ic-flower', '#806953'),
  bowl: icons.iconURI('ic-bowl', '#806953'),
  bowlTile: icons.iconURI('ic-bowl', '#6a695d'),
  calendar: icons.iconURI('ic-calendar', '#75675c'),
  clock: icons.iconURI('ic-clock', '#75675c'),
  pin: icons.iconURI('ic-pin', '#75675c'),
  plus: icons.iconURI('ic-plus', '#e6a65b'),
  camera: icons.iconURI('ic-camera', '#876057'),
  photo: icons.iconURI('ic-photo', '#b8aa99'),
  avLin: icons.avatarURI('lin'),
  avSu: icons.avatarURI('su')
};

Page({
  data: {
    icons: ICONS,
    remindBtn: { cls: 'btn-primary', label: '提醒 TA' },
    remindText: '',
    shake: false,
    remindBusy: false,
    meal: null,
    hasTodayShare: false,
    todayShares: [],
    history: [],
    historyCount: 0
  },

  onLoad() {
    this._unsub = store.subscribe((s) => this.refresh(s));
    this.refresh(store.get());
  },

  onUnload() {
    if (this._unsub) this._unsub();
  },

  onShow() {
    this.reload();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1 // 当前页面在 list 中的索引值
      });
    }
  },

  reload() {
    store.fetchEat().catch((e) => ui.toast(e.message, '☁️'));
  },

  refresh(st) {
    const count = st.remind.count;
    const limit = st.remind.limit;
    let remindBtn, remindText;
    if (count >= limit) {
      remindBtn = { cls: 'btn-soft', label: '今天已提醒 ' + count + ' 次啦' };
      remindText = '明天再提醒 TA 吧，今天已经很温柔了 ';
    } else if (count > 0) {
      remindBtn = { cls: 'btn-primary', label: '已提醒 TA ❤️' };
      remindText = '今天已提醒 ' + count + '/' + limit + ' 次';
    } else {
      remindBtn = { cls: 'btn-primary', label: '提醒 TA' };
      remindText = '今天还没有提醒过，每天最多 ' + limit + ' 次哦';
    }

    /* 最近一次约饭（服务端已按日期升序取第一） */
    let meal = null;
    const m = st.meals.list[0];
    if (m) {
      meal = {
        chip: store.countdown(m.date),
        kind: m.title,
        coverImage: m.coverImage,
        dateLine: store.fmtDate(m.date),
        timeLine: m.time,
        locLine: m.location,
        note: m.note || ''
      };
    }

    /* 今日餐食分享 */
    const todayShares = st.mealShares.today.map((ms) => ({
      id: ms.id,
      tiles: (ms.images || []).map((f, i) => ({ k: i, uri: f })),
      content: ms.content,
      meta: store.fmtRel(ms.createdAt) + ' · 已同步到日常'
    }));

    /* 历史餐食（今天之前，倒序） */
    const history = st.mealShares.history.map((ms) => ({
      id: ms.id,
      cap: ms.content,
      at: store.fmtRel(ms.createdAt),
      photo: (ms.images && ms.images[0]) || ''
    }));

    this.setData({
      remindBtn: remindBtn,
      remindText: remindText,
      meal: meal,
      hasTodayShare: todayShares.length > 0,
      todayShares: todayShares,
      history: history,
      historyCount: history.length
    });
  },

  onRemind() {
    const that = this;
    this.setData({ shake: false }, function () {
      that.setData({ shake: true });
      ui.withSun(that, 'remindBusy', 600, function () {
        api.reminder.meal().then(function (d) {
          store.merge({ remind: { count: d.todayCount, limit: d.limit } });
          ui.toast('已发送：' + d.content, '🔔');
        }).catch(function (e) {
          ui.toast(e.message, '🔔');
        });
      });
    });
  },

  goAddMeal() {
    wx.navigateTo({ url: '/pages/add-meal/add-meal' });
  },

  goShare() {
    wx.navigateTo({ url: '/pages/meal-share/meal-share' });
  }
});
