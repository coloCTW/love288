/* 发布日常 · 文字 + 最多 9 张照片 + 标签；走 post.create，发布后出现在日常流 */
const api = require('../../utils/api.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');
const upload = require('../../utils/upload.js');

const MAX = 9;
const TAGS = ['约会日', '想你', '好好吃饭', '小确幸'];

Page({
  data: {
    content: '',
    slots: [],
    photoCount: 0,
    tags: [],
    busy: false,
    icons: {
      photo: icons.iconURI('ic-photo', '#b8aa99'),
      flower: icons.iconURI('ic-flower', '#806953'),
      check: icons.iconURI('ic-check', '#fff7f2'),
      camera: icons.iconURI('ic-camera', '#504040'),
      photoBtn: icons.iconURI('ic-photo', '#504040'),
      heart: icons.iconURI('ic-heart-fill', '#3e3232'),
      sun: icons.iconURI('ic-sun', '#3e3232')
    }
  },

  onLoad() {
    const slots = [];
    for (let i = 0; i < MAX; i++) slots.push({ k: i, filled: false, uri: '', fileID: '' });
    const tags = TAGS.map((t) => ({ label: t, on: false }));
    this.setData({ slots: slots, tags: tags });
  },

  onContent(e) {
    this.setData({ content: e.detail.value });
  },

  /* 把上传结果按顺序填进空槽 */
  fillSlots(files) {
    const updates = {};
    let next = 0;
    const slots = this.data.slots;
    for (let i = 0; i < slots.length && next < files.length; i++) {
      if (!slots[i].filled) {
        updates['slots[' + i + '].filled'] = true;
        updates['slots[' + i + '].uri'] = files[next].tempPath;
        updates['slots[' + i + '].fileID'] = files[next].fileID;
        next++;
      }
    }
    if (next) {
      updates.photoCount = this.data.photoCount + next;
      this.setData(updates);
    }
  },

  onSlotTap(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const slots = this.data.slots;
    if (slots[idx].filled) {
      this.setData({
        ['slots[' + idx + '].filled']: false,
        ['slots[' + idx + '].uri']: '',
        ['slots[' + idx + '].fileID']: '',
        photoCount: this.data.photoCount - 1
      });
      return;
    }
    this.pickMore(1);
  },

  pickMore(limit) {
    if (this.data.photoCount >= MAX) {
      ui.toast('最多 9 张照片哦～', '📷');
      return;
    }
    const that = this;
    upload.chooseAndUpload(Math.min(limit, MAX - this.data.photoCount), 'posts/').then(function (files) {
      if (files && files.length) that.fillSlots(files);
    }).catch(function (err) {
      ui.toast(err.message || upload.FALLBACK_MSG, '📷');
    });
  },

  /* 拍一张 / 从相册选择：落到同一个照片格流 */
  onCamera() {
    this.pickMore(MAX);
  },

  onAlbum() {
    this.pickMore(MAX);
  },

  onTagTap(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    this.setData({ ['tags[' + idx + '].on']: !this.data.tags[idx].on });
  },

  onPublish() {
    const content = this.data.content.trim();
    const photoCount = this.data.photoCount;
    if (!content && photoCount === 0) {
      ui.toast('写点什么，或者放一张照片吧～', '🌷');
      return;
    }
    const pickedTags = this.data.tags.filter((t) => t.on).map((t) => t.label);
    const images = this.data.slots.filter((s) => s.filled && s.fileID).map((s) => s.fileID);
    const that = this;
    ui.withSun(this, 'busy', 800, function () {
      api.post.create({
        content: content || '今天也在一起 ❤️',
        images: images,
        tags: pickedTags
      }).then(function () {
        const h = that.selectComponent('#hearts');
        if (h) h.burst(8);
        ui.toast('发布啦，TA 会看到的 ❤️', '✨');
        setTimeout(function () { wx.navigateBack(); }, 1300);
      }).catch(function (e) {
        ui.toast(e.message, '✨');
      });
    });
  }
});
