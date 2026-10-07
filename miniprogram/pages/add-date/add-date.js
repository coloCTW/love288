/* 添加约会 · 约会/纪念日/其他，保存走 event.create，自动出现在计划月历
   图片真实选图 + 云存储上传 */
const store = require('../../utils/store.js');
const api = require('../../utils/api.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');
const upload = require('../../utils/upload.js');

const CITIES = ['上海市', '北京市', '青岛市', '杭州市', '成都市'];

const TYPE_META = {
  date: { label: '约会', icon: icons.iconURI('ic-heart', '#75675c') },
  anniversary: { label: '纪念日', icon: icons.iconURI('ic-star-fill', '#75675c') },
  todo: { label: '其他', icon: icons.iconURI('ic-flower', '#75675c') }
};

Page({
  data: {
    title: '',
    date: '',
    time: '19:00',
    location: '',
    cities: CITIES,
    cityIndex: 0,
    note: '',
    photoFilled: false,
    photoUri: '',
    evType: 'date',
    types: [
      { value: 'date', label: '约会', icon: TYPE_META.date.icon, on: true },
      { value: 'anniversary', label: '纪念日', icon: TYPE_META.anniversary.icon, on: false },
      { value: 'todo', label: '其他', icon: TYPE_META.todo.icon, on: false }
    ],
    errTitle: false,
    errDate: false,
    errLoc: false,
    busy: false,
    today: '',
    maxDate: '',
    icons: {
      photo: icons.iconURI('ic-photo', '#b8aa99'),
      flower: icons.iconURI('ic-flower', '#806062'),
      check: icons.iconURI('ic-check', '#fff7f2'),
      heart: icons.iconURI('ic-heart-fill', '#3e3232'),
      sun: icons.iconURI('ic-sun', '#3e3232')
    }
  },

  onLoad() {
    this._fileID = '';
    this.setData({
      date: store.addDays(7),
      today: store.today(),
      maxDate: store.addDays(3650)
    });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [key]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value });
  },

  onCityChange(e) {
    this.setData({ cityIndex: Number(e.detail.value) });
  },

  onPhotoTap() {
    if (this.data.photoFilled) return;
    const that = this;
    upload.chooseAndUpload(1, 'events/').then(function (files) {
      if (!files || !files.length) return;
      that._fileID = files[0].fileID;
      that.setData({ photoFilled: true, photoUri: files[0].tempPath });
    }).catch(function (e) {
      ui.toast(e.message || upload.FALLBACK_MSG, '📷');
    });
  },

  onPhotoRemove() {
    this._fileID = '';
    this.setData({ photoFilled: false, photoUri: '' });
  },

  onTypeTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      evType: value,
      types: this.data.types.map((t) => ({ value: t.value, label: t.label, icon: t.icon, on: t.value === value }))
    });
  },

  onSubmit() {
    const d = this.data;
    const errTitle = !d.title.trim();
    const errDate = !d.date;
    const errLoc = !d.location.trim();
    this.setData({ errTitle: errTitle, errDate: errDate, errLoc: errLoc });
    if (errTitle || errDate || errLoc) {
      ui.toast('还有必填项没有填哦，检查一下～', '🌷');
      return;
    }
    const evType = d.evType;
    const that = this;
    ui.withSun(this, 'busy', 800, function () {
      api.event.create({
        title: d.title.trim(),
        eventType: evType,
        date: d.date,
        time: d.time,
        city: CITIES[d.cityIndex],
        location: d.location.trim(),
        image: that._fileID || '',
        note: d.note.trim()
      }).then(function () {
        const h = that.selectComponent('#hearts');
        if (h) h.burst(8);
        const msg = evType === 'anniversary' ? '纪念日已收藏 ⭐' : evType === 'todo' ? '已记下这件小事 🌸' : '好啦，约定完成 ❤️';
        ui.toast(msg, evType === 'anniversary' ? '⭐' : '❤️');
        setTimeout(function () { wx.navigateBack(); }, 1200);
      }).catch(function (e) {
        ui.toast(e.message, '💨');
      });
    });
  }
});
