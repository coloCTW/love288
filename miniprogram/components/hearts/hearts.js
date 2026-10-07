/* 飘心动画：想你了 / 点赞 / 创建成功共用
   页面通过 selectComponent('#hearts').burst(count, x, y) 触发 */
const icons = require('../../utils/icons.js');

const HEART_URI = icons.iconURI('ic-heart-fill', '#f0a9b0');

Component({
  data: {
    hearts: []
  },
  methods: {
    burst(count, x, y) {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const cx = typeof x === 'number' ? x : win.windowWidth / 2;
      const cy = typeof y === 'number' ? y : win.windowHeight * 0.55;
      const born = [];
      const n = count || 8;
      for (let i = 0; i < n; i++) {
        const size = 14 + Math.random() * 12;
        born.push({
          id: 'h' + Date.now() + '-' + i,
          left: (cx - size / 2) + 'px',
          top: (cy - size / 2) + 'px',
          dx: Math.round((Math.random() - 0.5) * 130) + 'px',
          dy: -(60 + Math.random() * 90) + 'px',
          rot: Math.round((Math.random() - 0.5) * 40) + 'deg',
          dur: (0.9 + Math.random() * 0.5) + 's',
          sz: Math.round(size) + 'px',
          uri: HEART_URI
        });
      }
      const that = this;
      this.setData({ hearts: this.data.hearts.concat(born) });
      setTimeout(function () {
        that.setData({
          hearts: that.data.hearts.filter(function (h) {
            return born.indexOf(h) === -1;
          })
        });
      }, 1600);
    }
  }
});
