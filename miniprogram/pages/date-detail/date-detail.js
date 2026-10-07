/* 约会详情 · 读取 ?id=，编辑弹层 / 删除确认（仅创建者可删）
   数据走 event.get / event.update / event.delete；约饭联动事件不可编辑 */
const api = require('../../utils/api.js');
const store = require('../../utils/store.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');

const TYPE_META = {
  date: { label: '约会', icon: 'ic-heart', tint: 'paper-pink', ink: '#806062' },
  meal: { label: '约饭', icon: 'ic-bowl', tint: 'paper-green', ink: '#6a695d' },
  anniversary: { label: '纪念日', icon: 'ic-star-fill', tint: 'paper-sun', ink: '#806953' },
  todo: { label: '待办', icon: 'ic-flower', tint: 'paper-blue', ink: '#6b676f' }
};

const ICONS = {
  calendar: icons.iconURI('ic-calendar', '#75675c'),
  pin: icons.iconURI('ic-pin', '#75675c'),
  journal: icons.iconURI('ic-journal', '#75675c'),
  edit: icons.iconURI('ic-edit', '#876057'),
  trash: icons.iconURI('ic-trash', '#fff7f2'),
  trashIll: icons.iconURI('ic-trash', '#806062'),
  sun: icons.iconURI('ic-sun', '#3e3232'),
  avLin: icons.avatarURI('lin'),
  avSu: icons.avatarURI('su')
};

Page({
  data: {
    icons: ICONS,
    notFound: false,
    ev: null,
    /* 编辑弹层 */
    sheetShow: false,
    edTitle: '',
    edDate: '',
    edTime: '19:00',
    edLoc: '',
    edNote: '',
    edBusy: false,
    /* 删除确认 */
    confirmShow: false,
    confirm: {}
  },

  onLoad(query) {
    this.id = query.id || '';
    this.reload();
  },

  reload() {
    const that = this;
    api.event.get({ eventId: this.id }).then(function (d) {
      that._ev = d.event;
      that.render(d.event);
    }).catch(function (e) {
      if (e.code === 40401) {
        that.setData({ notFound: true, ev: null });
      } else {
        ui.toast(e.message, '💨');
      }
    });
  },

  render(e) {
    const meta = TYPE_META[e.eventType] || TYPE_META.date;
    const past = e.date < store.today();
    this.setData({
      notFound: false,
      ev: {
        id: e.id,
        title: e.title,
        illIcon: icons.iconURI(meta.icon, meta.ink),
        illTint: meta.tint,
        typeLabel: meta.label,
        countdownLine: past ? '这个日子已经过去啦，去创造新的吧' : '距离今天：' + store.countdown(e.date),
        dateLine: store.fmtDate(e.date) + (e.time ? '　' + e.time : ''),
        locLine: (e.city ? e.city + ' · ' : '') + (e.location || '待定'),
        note: e.note || '',
        creatorName: e.creatorNickname || (e.isMine ? '我' : 'TA'),
        isMine: e.isMine
      }
    });
  },

  goBackPlan() {
    if (getCurrentPages().length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/plan/plan' });
  },

  /* 编辑弹层 */
  openEdit() {
    const e = this._ev;
    if (!e) return;
    if (e.eventType === 'meal') {
      ui.toast('约饭的日期在「好好吃饭」里改哦～', '🥢');
      return;
    }
    this.setData({
      sheetShow: true,
      edTitle: e.title,
      edDate: e.date,
      edTime: e.time || '19:00',
      edLoc: e.location || '',
      edNote: e.note || ''
    });
  },

  onSheetClose() {
    this.setData({ sheetShow: false });
  },

  onEdInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [key]: e.detail.value });
  },

  onEdDate(e) {
    this.setData({ edDate: e.detail.value });
  },

  onEdTime(e) {
    this.setData({ edTime: e.detail.value });
  },

  saveEdit() {
    const d = this.data;
    const title = d.edTitle.trim();
    if (!title || !d.edDate) {
      ui.toast('名称和日期不能空哦～', '🌷');
      return;
    }
    const that = this;
    ui.withSun(this, 'edBusy', 700, function () {
      api.event.update({
        eventId: that.id,
        title: title,
        date: d.edDate,
        time: d.edTime,
        location: d.edLoc.trim(),
        note: d.edNote.trim()
      }).then(function () {
        that.setData({ sheetShow: false });
        ui.toast('修改好啦 ❤️', '✏️');
        that.reload();
      }).catch(function (e) {
        ui.toast(e.message, '✏️');
      });
    });
  },

  /* 删除（仅创建者可见入口） */
  onDelete() {
    const e = this._ev;
    if (!e) return;
    this.setData({
      confirmShow: true,
      confirm: {
        ill: ICONS.trashIll,
        title: '删除「' + e.title + '」？',
        sub: '月历上的标记也会一起消失哦',
        okText: '删除',
        cancelText: '再想想',
        danger: true
      }
    });
  },

  onConfirmOk() {
    const that = this;
    api.event.delete({ eventId: this.id }).then(function () {
      that.setData({ confirmShow: false });
      ui.toast('已经删除啦', '🍃');
      setTimeout(function () { that.goBackPlan(); }, 900);
    }).catch(function (e) {
      that.setData({ confirmShow: false });
      ui.toast(e.message, '🍃');
    });
  },

  onConfirmCancel() {
    this.setData({ confirmShow: false });
  }
});
