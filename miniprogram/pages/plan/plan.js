/* 计划 · 月历（周一开头，约会/纪念日/待办标记）+ 即将到来的约会堆叠
   数据来自 event.list（store.fetchEvents 快照）：monthEvents 画月历、upcoming 直接展示 */
const store = require('../../utils/store.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');

const KINDS = { date: 'card-pink', meal: 'card-green', anniversary: 'card-sun', todo: 'card-blue' };

/* 待办标记：单个实心圆（ic-dots 是三点菜单图标，不能直接用） */
const DOT_MK = 'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#a9c1de"/></svg>');

const ICONS = {
  back: icons.iconURI('ic-back', '#75675c'),
  next: icons.iconURI('ic-arrow-r', '#75675c'),
  clockSoon: icons.iconURI('ic-clock', '#876057'),
  clockLater: icons.iconURI('ic-clock', '#75675c'),
  calendar: icons.iconURI('ic-calendar', '#75675c'),
  pin: icons.iconURI('ic-pin', '#75675c'),
  plus: icons.iconURI('ic-plus', '#876057'),
  heartMk: icons.iconURI('ic-heart-fill', '#f0a9b0'),
  starMk: icons.iconURI('ic-star-fill', '#efc97e'),
  dotMk: DOT_MK,
  avLin: icons.avatarURI('lin'),
  avSu: icons.avatarURI('su')
};

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function markOf(ev) {
  if (ev.eventType === 'anniversary') return ICONS.starMk;
  if (ev.eventType === 'todo') return ICONS.dotMk;
  return ICONS.heartMk;
}

Page({
  data: {
    icons: ICONS,
    calTitle: '',
    cells: [],
    calAnimCls: '',
    selectedDate: '',
    upcomingTitle: '即将到来的约会',
    hintVisible: false,
    hintText: '',
    upcoming: [],
    emptyTitle: '',
    showAllBtn: null
  },

  onLoad() {
    const now = new Date();
    this.viewY = now.getFullYear();
    this.viewM = now.getMonth();
    this._unsub = store.subscribe(() => this.renderAll());
    this.renderAll();
  },

  onUnload() {
    if (this._unsub) this._unsub();
  },

  onShow() {
    this.reload();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3 // 当前页面在 list 中的索引值
      });
    }
  },

  monthKey() {
    return this.viewY + '-' + pad2(this.viewM + 1);
  },

  reload() {
    const that = this;
    store.fetchEvents(this.monthKey()).then(function () {
      that.renderAll(that._animNext);
      that._animNext = false;
    }).catch((e) => ui.toast(e.message, '☁️'));
  },

  buildCells(evByDate, todayIso) {
    const viewY = this.viewY, viewM = this.viewM;
    const cells = [];
    const lead = (new Date(viewY, viewM, 1).getDay() + 6) % 7; /* 周一开头 */
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const prevDays = new Date(viewY, viewM, 0).getDate();
    for (let i = lead - 1; i >= 0; i--) {
      cells.push({ k: 'p' + i, num: prevDays - i, iso: '', cls: 'cal-cell other', marks: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isoStr = viewY + '-' + pad2(viewM + 1) + '-' + pad2(d);
      let cls = 'cal-cell';
      if (isoStr === todayIso) cls += ' today';
      if (isoStr === this.data.selectedDate) cls += ' selected';
      cells.push({ k: isoStr, num: d, iso: isoStr, cls: cls, marks: (evByDate[isoStr] || []).map(markOf) });
    }
    const tail = (7 - ((lead + daysInMonth) % 7)) % 7;
    for (let t = 1; t <= tail; t++) {
      cells.push({ k: 'n' + t, num: t, iso: '', cls: 'cal-cell other', marks: [] });
    }
    return cells;
  },

  renderAll(anim) {
    const st = store.get();
    const evByDate = {};
    (st.events.monthEvents || []).forEach((e) => {
      (evByDate[e.date] = evByDate[e.date] || []).push(e);
    });

    const selectedDate = this.data.selectedDate;
    let upcoming;
    if (selectedDate) {
      /* 只看某一天：用当月事件过滤（含过去日期与待办），能完整还原这一天 */
      upcoming = (st.events.monthEvents || []).filter((e) => e.date === selectedDate);
    } else {
      upcoming = (st.events.upcoming || []).slice(); /* 服务端已升序、已剔除待办 */
    }
    let upcomingTitle = '即将到来的约会';
    let hintVisible = false;
    let hintText = '';
    if (selectedDate) {
      upcomingTitle = '这一天 · ' + store.fmtDate(selectedDate);
      hintVisible = true;
      hintText = '正在只看这一天，点同一日期或「查看全部」回到所有约会';
    }
    const shown = this.data.showAll ? upcoming : upcoming.slice(0, 3);
    const model = shown.map((e, i) => ({
      id: e.id,
      kind: KINDS[e.eventType] || 'card-pink',
      title: e.title,
      when: store.countdown(e.date),
      whenCls: e.date === store.today() ? 'when-soon' : 'when-later',
      whenIcon: e.date === store.today() ? ICONS.clockSoon : ICONS.clockLater,
      dateLine: store.fmtDate(e.date) + (e.time ? ' ' + e.time : ''),
      locLine: e.location ? (e.city ? e.city + ' · ' + e.location : e.location) : '',
      note: e.note || '',
      delay: (i * 0.06).toFixed(2) + 's'
    }));

    this.setData({
      calTitle: this.viewY + ' 年 ' + (this.viewM + 1) + ' 月',
      cells: this.buildCells(evByDate, store.today()),
      upcomingTitle: upcomingTitle,
      hintVisible: hintVisible,
      hintText: hintText,
      upcoming: model,
      emptyTitle: selectedDate ? '这一天还没有安排' : '还没有约好的日子',
      showAllBtn: upcoming.length > 3 ? { label: this.data.showAll ? '收起' : '查看全部' } : null
    });

    if (anim) {
      /* 两段式重触发月份切换滑动 */
      this.setData({ calAnimCls: '' }, () => this.setData({ calAnimCls: 'slide-in' }));
    }
  },

  onPrevMonth() {
    this.viewM--;
    if (this.viewM < 0) { this.viewM = 11; this.viewY--; }
    this._animNext = true;
    this.reload();
  },

  onNextMonth() {
    this.viewM++;
    if (this.viewM > 11) { this.viewM = 0; this.viewY++; }
    this._animNext = true;
    this.reload();
  },

  onDayTap(e) {
    const d = e.currentTarget.dataset.date;
    if (!d) return;
    const selectedDate = this.data.selectedDate === d ? '' : d;
    this.setData({ selectedDate: selectedDate }, () => this.renderAll());
  },

  onToggleAll() {
    this.setData({ showAll: !this.data.showAll }, () => this.renderAll());
  },

  onCardTap(e) {
    wx.navigateTo({ url: '/pages/date-detail/date-detail?id=' + encodeURIComponent(e.currentTarget.dataset.id) });
  },

  goAddDate() {
    wx.navigateTo({ url: '/pages/add-date/add-date' });
  }
});
