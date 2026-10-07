/* 添加约饭 · 保存走 meal.create，服务端联动写入计划月历
   封面图真实选图 + 云存储上传 */
const store = require('../../utils/store.js');
const api = require('../../utils/api.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');
const upload = require('../../utils/upload.js');

const CITIES = ['上海市', '北京市', '青岛市', '杭州市', '成都市'];

Page({
  data: {
    kind: '',
    date: '',
    time: '12:30',
    location: '',
    cities: CITIES,
    cityIndex: 0,
    note: '',
    photoFilled: false,
    photoUri: '',
    errDate: false,
    errTime: false,
    errLoc: false,
    busy: false,
    today: '',
    maxDate: '',
    icons: {
      photo: icons.iconURI('ic-photo', '#b8aa99'),
      bowl: icons.iconURI('ic-bowl', '#6a695d'),
      check: icons.iconURI('ic-check', '#fff7f2'),
      heart: icons.iconURI('ic-heart-fill', '#3e3232'),
      sun: icons.iconURI('ic-sun', '#3e3232')
    }
  },

  onLoad() {
    this._coverFileID = '';
    this.setData({
      date: store.addDays(2),
      today: store.today(),
      maxDate: store.addDays(365)
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

  /* 封面图：真实选图 + 上传云存储 */
  onPhotoTap() {
    if (this.data.photoFilled) return;
    const that = this;
    upload.chooseAndUpload(1, 'meals/').then(function (files) {
      if (!files || !files.length) return;
      that._coverFileID = files[0].fileID;
      that.setData({ photoFilled: true, photoUri: files[0].tempPath });
    }).catch(function (e) {
      ui.toast(e.message || upload.FALLBACK_MSG, '📷');
    });
  },

  onPhotoRemove() {
    this._coverFileID = '';
    this.setData({ photoFilled: false, photoUri: '' });
  },

  onSubmit() {
    const d = this.data;
    const errDate = !d.date;
    const errTime = !d.time;
    const errLoc = !d.location.trim();
    this.setData({ errDate: errDate, errTime: errTime, errLoc: errLoc });
    if (errDate || errTime || errLoc) {
      ui.toast('还有必填项没有填哦，检查一下～', '🌷');
      return;
    }
    const kind = d.kind.trim() || '约会吃饭';
    const city = CITIES[d.cityIndex];
    const note = d.note.trim();
    const that = this;
    ui.withSun(this, 'busy', 800, function () {
      api.meal.create({
        title: kind,
        date: d.date,
        time: d.time,
        city: city,
        location: d.location.trim(),
        coverImage: that._coverFileID || '',
        note: note
      }).then(function () {
        const h = that.selectComponent('#hearts');
        if (h) h.burst(8);
        ui.toast('好啦，约定完成 ❤️', '🥢');
        setTimeout(function () { wx.navigateBack(); }, 1200);
      }).catch(function (e) {
        ui.toast(e.message, '🥢');
      });
    });
  }
});
