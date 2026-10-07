/* 首页 · 情侣状态卡 / 天气 / 电量 / 提醒 / 同步心情 / 想你了
   数据来自 home.overview 云函数（store.fetchHome 快照），互动走 interaction.send */
const store = require('../../utils/store.js');
const api = require('../../utils/api.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');

const ICONS = {
  flower: icons.iconURI('ic-flower', '#806062'),
  cat: icons.iconURI('ic-cat', '#806953'),
  heart: icons.iconURI('ic-heart-fill', '#f0a9b0'),
  heartBtn: icons.iconURI('ic-heart-fill', '#3e3232'),
  pin: icons.iconURI('ic-pin', '#6b676f'),
  arrow: icons.iconURI('ic-arrow-r', '#806953'),
  bell: icons.iconURI('ic-bell', '#806953'),
  sun: icons.iconURI('ic-sun', '#806953'),
  cup: icons.iconURI('ic-cup', '#876057'),
  moon: icons.iconURI('ic-moon', '#876057'),
  sunBlue: icons.iconURI('ic-sun', '#6b676f'),
  cloudBlue: icons.iconURI('ic-cloud', '#6b676f'),
  sunInk: icons.iconURI('ic-sun', '#806953'),
  cloudInk: icons.iconURI('ic-cloud', '#806953')
};

Page({
  data: {
    me: {}, ta: {},
    days: '--', dist: '--',
    battMe: {}, battTa: {},
    weatherMe: {}, weatherTa: {},
    nextDateLine: '',
    moodMe: {}, moodTa: {},
    shake: false,
    remindBusy: false,
    actBusy: false,
    sheetShow: false,
    swWater: false,
    swWake: false,
    icons: ICONS,
    mm_bgColor: '#f5f5f5',  //canvas读取颜色，mood组件使用
    mt_bgColor: '#f5f5f5'
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
        selected: 0 // 当前页面在 list 中的索引值
      });
    }
  },
  onReady() {
    // 页面渲染完成，此时可以拿到 image 节点
    wx.createSelectorQuery()
      .selectAll('.m-pic')
      .fields({ dataset: true })   // 用 dataset 读取 data-src
      .exec((res) => {
        if (!res[0]) return;
        res[0].forEach((item) => {
          const src = item.dataset.src;
          const bgcolor = item.dataset.bgcolor;
          if (!src) return;        // 空地址直接跳过
          this.getMainColor(bgcolor, src);
        });
      });
  },

  reload() {
    store.fetchHome().catch((e) => ui.toast(e.message, '☁️'));
  },

  refresh(st) {
    const w = st.weather || {};
    const batt = (u) => {
      if (!u) return { name: 'TA', pct: null, cls: 'ok' };
      return { name: u.nickname || 'TA', pct: u.batteryLevel, cls: (u.batteryLevel == null || u.batteryLevel < 30) ? 'low' : 'ok' };
    };
    const wxCell = (key, inkIcon) => {
      const c = w[key];
      if (!c) return { city: '——', temp: '--', cond: '', range: '', upd: '', icon: inkIcon.cloud };
      const icon = c.cond === '晴' ? inkIcon.sun : inkIcon.cloud;
      return { city: c.city, temp: c.temp, cond: c.cond, high: c.high + '°', low: c.low + '°', upd: c.updatedAt ? store.fmtRel(c.updatedAt) : '', icon: icon };
    };
    const nextDate = st.nextDate;
    const nextDateLine = nextDate
      ? '下一次见面 · ' + store.countdown(nextDate.date) + ' · ' + nextDate.title
      : '还没有约好下一次见面，去计划里安排吧';
    const moodRow = (u, m) => {
      if (!m || !m.type) {
        return { name: u && u.nickname ? u.nickname : 'TA', face: icons.faceURI('m-none'), tint: 'tint-paper', type: '未同步', at: '' };
      }
      const meta = store.moodMeta(m.type);
      return { name: u && u.nickname ? u.nickname : 'TA', face: icons.faceURI(meta.icon), tint: meta.tint, type: meta.type, at: store.fmtRel(m.at) };
    };
    const me = st.me, ta = st.ta;
    const couple = st.couple || {};
    this.setData({
      me: { name: me ? me.nickname : '我', avatar: icons.avatarURI(me ? me.id : 'lin') },
      ta: { name: ta ? ta.nickname : 'TA', avatar: icons.avatarURI(ta ? ta.id : 'su') },
      days: couple.startDate ? store.daysTogether(couple.startDate) : '--',
      dist: couple.distanceKm == null ? '--' : couple.distanceKm.toFixed(1),
      battMe: batt(me),
      battTa: batt(ta),
      weatherMe: wxCell('me', { sun: ICONS.sunBlue, cloud: ICONS.cloudBlue }),
      weatherTa: wxCell('ta', { sun: ICONS.sunInk, cloud: ICONS.cloudInk }),
      nextDateLine: nextDateLine,
      moodMe: moodRow(me, (st.mood || {}).me),
      moodTa: moodRow(ta, (st.mood || {}).ta)
    });
  },

  heartsBurst(n, e) {
    const t = e && e.changedTouches && e.changedTouches[0];
    const h = this.selectComponent('#hearts');
    if (h) h.burst(n, t ? t.clientX : undefined, t ? t.clientY : undefined);
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  goMood() {
    wx.navigateTo({ url: '/pages/mood/mood' });
  },

  taName() {
    const ta = store.get().ta;
    return ta && ta.nickname ? ta.nickname : 'TA';
  },

  /* 互动：动画先行，接口送达，失败温柔提示 */
  sendInteraction(type, okMsg, emoji) {
    const that = this;
    ui.withSun(this, 'actBusy', 700, function () {
      api.interaction.send({ type: type }).then(function () {
        ui.toast(okMsg, emoji);
      }).catch(function (e) {
        ui.toast(e.message, '💨');
      });
    });
  },

  /* 想你了 */
  onMissYou(e) {
    this.heartsBurst(10, e);
    this.sendInteraction('miss_you', '已告诉 ' + this.taName() + '，TA 收到啦', '❤️');
  },

  /* 抱抱 / 我在哦 */
  onHug(e) {
    this.heartsBurst(6, e);
    this.sendInteraction('hug', '抱抱已送达 ' + this.taName(), '🤗');
  },

  onHere() {
    this.sendInteraction('im_here', '已告诉 ' + this.taName() + '：我在哦', '💛');
  },

  /* 贴心提醒弹层 */
  openRemind() {
    this.setData({ sheetShow: true, swWater: false, swWake: false });
  },

  onRemindClose() {
    this.setData({ sheetShow: false });
  },

  onSwWater(e) {
    this.setData({ swWater: e.detail.value });
  },

  onSwWake(e) {
    this.setData({ swWake: e.detail.value });
  },

  setRemind() {
    const { swWater, swWake } = this.data;
    this.setData({ sheetShow: false });
    if (!swWater && !swWake) {
      ui.toast('先选一个提醒，再点设置哦～', '🌸');
      return;
    }
    const msgs = [];
    if (swWater) msgs.push('提醒 TA 喝水');
    if (swWake) msgs.push('明早叫醒 TA');
    const types = [];
    if (swWater) types.push('water');
    if (swWake) types.push('wake');
    const that = this;
    this.setData({ shake: false }, function () {
      that.setData({ shake: true });
      ui.withSun(that, 'remindBusy', 700, function () {
        Promise.all(types.map(function (t) {
          return api.interaction.send({ type: t }).catch(function () { return null; });
        })).then(function () {
          ui.toast(msgs.join('、') + ' · 已为 TA 设置 ❤️', '🔔');
        });
      });
    });
  },

   // 传入图片路径（网络图或本地路径）
   getMainColor(bgColor, imagePath) {
    const query = wx.createSelectorQuery();
    query.select('#colorCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 设置 Canvas 尺寸（决定采样范围）
        // 建议固定为 40x40 或 64x64，太大影响性能
        const sampleSize = 40;
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        const image = canvas.createImage();
        image.src = imagePath;

        image.onload = () => {
          // 把图片画到 Canvas 上，强制缩放到 sampleSize
          ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
          // 读取像素数据
          try {
            const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
            const mainColor = this.extractDominantColor(imageData.data);
            this.setData({ [bgColor]: mainColor });
            console.log(mainColor)
          } catch (err) {
            console.error('getImageData 失败', err);
          }
        };

        image.onerror = (err) => {
          console.error('图片加载失败', err);
        };
      });
  },

  // 核心：从像素数据中统计出现频率最高的颜色
  extractDominantColor(pixelData) {
    const colorMap = {};
    const data = pixelData;

    // 每 4 个值是一个像素的 RGBA
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // 跳过透明像素
      if (a < 128) continue;

      // 关键：颜色量化，把 0-255 压缩到 0-15（每 16 级算一档）
      // 这样相近的颜色会被归为同一类，避免过于分散
      const qr = Math.min(255, Math.round(r / 16) * 16);
      const qg = Math.min(255, Math.round(g / 16) * 16);
      const qb = Math.min(255, Math.round(b / 16) * 16);

      const key = `${qr},${qg},${qb}`;
      colorMap[key] = (colorMap[key] || 0) + 1;
    }

    // 找出出现次数最多的颜色
    let maxKey = '';
    let maxCount = 0;
    for (const key in colorMap) {
      if (colorMap[key] > maxCount) {
        maxCount = colorMap[key];
        maxKey = key;
      }
    }

    if (!maxKey) return '#f5f5f5'; // 兜底

    const [r, g, b] = maxKey.split(',').map(Number);
    // 转成十六进制
    const hex = '#' + [r, g, b]
      .map(v => Math.min(255, v).toString(16).padStart(2, '0'))
      .join('');
    return hex;
  },
  // 心情状态更新时候调用，更换背景色
  onImgLoad(e) {
    const { bgcolor, src } = e.currentTarget.dataset;
    this.getMainColor(bgcolor, src); // 取色
  },
});
