/* 我的 · 情侣设置：资料 / 绑定情侣 / 位置共享 / 通知 / 数据与隐私
   数据来自 user.get + couple.get（store.fetchProfile 快照），
   绑定流程接 couple.genCode / couple.bind，解绑接 couple.unpair */
const store = require('../../utils/store.js');
const api = require('../../utils/api.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');

const ICONS = {
  pin: icons.iconURI('ic-pin', '#876057'),
  heart: icons.iconURI('ic-heart-fill', '#806062'),
  heartSmall: icons.iconURI('ic-heart-fill', '#806062'),
  bell: icons.iconURI('ic-bell', '#876057'),
  calendar: icons.iconURI('ic-calendar', '#876057'),
  moon: icons.iconURI('ic-moon', '#876057'),
  edit: icons.iconURI('ic-edit', '#75675c'),
  trash: icons.iconURI('ic-trash', '#fff7f2'),
  editIll: icons.iconURI('ic-edit', '#806062'),
  trashIll: icons.iconURI('ic-trash', '#806062'),
  sun: icons.iconURI('ic-sun', '#3e3232')
};

const DEFAULT_SW = { shareCity: true, shareDistance: true, mealNotify: true, dateNotify: true, wake: false };

Page({
  data: {
    icons: ICONS,
    me: {},
    bound: false,
    demoMode: false,
    cpMe: {},
    cpTa: {},
    cpStart: '',
    cpDays: 0,
    sw: DEFAULT_SW,
    /* 编辑昵称 */
    sheetShow: false,
    nick: '',
    nickBusy: false,
    /* 绑定 */
    genBusy: false,
    bindShow: false,
    bindCode: '',
    bindStart: '',
    bindMax: '',
    bindBusy: false,
    /* 确认弹窗 */
    confirmShow: false,
    confirm: {}
  },

  onLoad() {
    this._unsub = store.subscribe(() => this.render());
    this.render();
  },

  onUnload() {
    if (this._unsub) this._unsub();
  },

  onShow() {
    this.reload();
  },

  reload() {
    store.fetchProfile().catch((e) => ui.toast(e.message, '☁️'));
  },

  render() {
    const st = store.get();
    const u = st.profile.user;
    const cp = st.profile.couple;
    const ta = st.profile.ta;
    if (!u) return;
    let cityLine = '还没有设置城市';
    if (u.city) {
      if (u.batteryLevel != null && u.batteryUpdatedAt) {
        cityLine = u.city + ' · 电量 ' + u.batteryLevel + '%（' + store.fmtRel(u.batteryUpdatedAt) + ' 更新）';
      } else {
        cityLine = u.city + ' · 电量未同步';
      }
    }
    const bound = !!st.profile.coupleBound;
    const set = {
      me: {
        avatar: u.avatar || icons.avatarURI(u.id),
        name: u.nickname || '我',
        cityLine: cityLine
      },
      bound: bound,
      demoMode: !!st.profile.demoMode
    };
    if (cp) {
      set.cpMe = { avatar: icons.avatarURI(u.id), name: u.nickname || '我' };
      set.cpTa = { avatar: icons.avatarURI(ta ? ta.id : 'su'), name: ta ? ta.nickname : 'TA' };
      set.cpStart = store.fmtDate(cp.startDate);
      set.cpDays = store.daysTogether(cp.startDate);
      set.sw = Object.assign({}, DEFAULT_SW, cp.settings || {});
    } else {
      set.sw = Object.assign({}, DEFAULT_SW);
    }
    this.setData(set);
  },

  /* 开关：乐观更新 + 失败回滚 */
  onSwitch(e) {
    const key = e.currentTarget.dataset.key;
    const msg = e.currentTarget.dataset.msg;
    const value = e.detail.value;
    const before = this.data.sw[key];
    this.setData({ ['sw.' + key]: value });
    api.couple.updateSettings({ settings: { [key]: value } }).then(function () {
      ui.toast(msg, '✅');
    }).catch(function (err) {
      this.setData({ ['sw.' + key]: before });
      ui.toast(err.message, '💨');
    }.bind(this));
  },

  /* 编辑昵称 */
  openNick() {
    const u = store.get().profile.user;
    this.setData({ sheetShow: true, nick: u ? (u.nickname || '') : '' });
  },

  onSheetClose() {
    this.setData({ sheetShow: false });
  },

  onNickInput(e) {
    this.setData({ nick: e.detail.value });
  },

  saveNick() {
    const v = this.data.nick.trim();
    if (!v) {
      ui.toast('昵称不能是空的哦～', '🌷');
      return;
    }
    const that = this;
    ui.withSun(this, 'nickBusy', 600, function () {
      api.user.update({ nickname: v }).then(function (d) {
        store.merge({ profile: Object.assign({}, store.get().profile, { user: d.user }) });
        that.setData({ sheetShow: false });
        ui.toast('昵称改好啦 ❤️', '✏️');
        that.render();
      }).catch(function (e) {
        ui.toast(e.message, '✏️');
      });
    });
  },

  /* 绑定：生成邀请码（复制到剪贴板） */
  onGenCode() {
    const that = this;
    ui.withSun(this, 'genBusy', 600, function () {
      api.couple.genCode().then(function (d) {
        wx.setClipboardData({
          data: d.inviteCode,
          success: function () {
            ui.toast('邀请码 ' + d.inviteCode + ' 已复制，30 分钟内有效哦 ❤️', '💌');
          }
        });
      }).catch(function (e) {
        ui.toast(e.message, '💌');
      });
    });
  },

  /* 绑定：输入邀请码 */
  openBind() {
    this.setData({ bindShow: true, bindCode: '', bindStart: store.today(), bindMax: store.today() });
  },

  onBindClose() {
    this.setData({ bindShow: false });
  },

  onBindInput(e) {
    this.setData({ bindCode: e.detail.value });
  },

  onBindStart(e) {
    this.setData({ bindStart: e.detail.value });
  },

  onBindOk() {
    const code = this.data.bindCode.trim();
    if (!/^\d{6}$/.test(code)) {
      ui.toast('邀请码是 6 位数字哦～', '💌');
      return;
    }
    const that = this;
    ui.withSun(this, 'bindBusy', 700, function () {
      api.couple.bind({ inviteCode: code, startDate: that.data.bindStart }).then(function () {
        that.setData({ bindShow: false });
        ui.toast('绑定成功啦，我们的小世界上线 ❤️', '💌');
        that.reload();
      }).catch(function (e) {
        ui.toast(e.message, '💌');
      });
    });
  },

  /* 解除情侣关系 */
  onUnpair() {
    this.setData({
      confirmShow: true,
      confirm: {
        ill: ICONS.trashIll,
        title: '解除情侣关系？',
        sub: '解除后历史数据还在云端，但你们俩都看不到啦',
        okText: '解除',
        cancelText: '再想想',
        danger: true
      }
    });
  },

  onConfirmOk() {
    const that = this;
    api.couple.unpair().then(function () {
      that.setData({ confirmShow: false });
      ui.toast('关系已解除，我们还会再遇见的', '💔');
      setTimeout(function () { wx.switchTab({ url: '/pages/home/home' }); }, 1100);
    }).catch(function (e) {
      that.setData({ confirmShow: false });
      ui.toast(e.message, '💔');
    });
  },

  onConfirmCancel() {
    this.setData({ confirmShow: false });
  }
});
