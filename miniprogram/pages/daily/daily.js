/* 日常 · 动态流：点赞（保 heart-pop 动画）/ 评论弹层 / 删除自己的动态 / FAB 发布
   数据来自 post.list（内嵌最新 3 条评论预览），写操作走 post.like 等接口 */
const store = require('../../utils/store.js');
const api = require('../../utils/api.js');
const icons = require('../../utils/icons.js');
const ui = require('../../utils/ui.js');

const ICONS = {
  heart: icons.iconURI('ic-heart', '#75675c'),
  heartFill: icons.iconURI('ic-heart-fill', '#f0a9b0'),
  chat: icons.iconURI('ic-chat', '#75675c'),
  more: icons.iconURI('ic-more', '#75675c'),
  trash: icons.iconURI('ic-trash', '#806062'),
  plus: icons.iconURI('ic-plus', '#fbf6f5'),
  bowlTile: icons.iconURI('ic-bowl', '#6a695d'),
  photoTile: icons.iconURI('ic-photo', '#75675c'),
  meAvatar: icons.avatarURI('lin'),
  taAvatar: icons.avatarURI('su')
};

Page({
  data: {
    posts: [],
    empty: false,
    icons: ICONS,
    /* 评论弹层 */
    cmtShow: false,
    cmtPostId: '',
    cmtIdx: -1,
    cmtList: [],
    cmtValue: '',
    cmtFocus: false,
    /* 删除确认 */
    confirmShow: false,
    confirm: {},
    confirmPostId: ''
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
        selected: 2 // 当前页面在 list 中的索引值
      });
    }
  },

  reload() {
    store.fetchPosts().catch((e) => ui.toast(e.message, '☁️'));
  },

  postModel(p, st, i) {
    let typeTag = null;
    if (p.type === 'meal') typeTag = { label: '好好吃饭', cls: 'green' };
    else if (p.type === 'date') typeTag = { label: '约会记录', cls: 'pink' };
    const photoTiles = (p.images || []).map((f, k) => ({
      k: k, uri: f || (p.type === 'meal' ? ICONS.bowlTile : ICONS.photoTile)
    }));
    const cmts = (p.comments || []).map((c, ci) => ({
      k: ci,
      avatar: c.avatar || icons.avatarURI(c.userId),
      name: c.nickname || '我',
      content: c.content
    }));
    return {
      id: p.id,
      avatar: p.avatar || icons.avatarURI(p.userId),
      name: p.nickname || '我',
      meta: store.fmtRel(p.createdAt) + (p.location ? ' · ' + p.location : ''),
      typeTag: typeTag,
      contentLines: (p.content || '').split('\n').map((t, li) => ({ k: li, t: t })),
      hasText: !!(p.content || '').trim(),
      photoTiles: photoTiles,
      hasPhotos: photoTiles.length > 0,
      photosOne: photoTiles.length === 1,
      tags: p.tags || [],
      liked: !!p.liked,
      likeCount: p.likeCount || 0,
      likeIcon: p.liked ? ICONS.heartFill : ICONS.heart,
      commentCount: p.commentCount || 0,
      comments: cmts,
      isMine: !!p.isMine,
      enter: !this._renderedBefore,
      delay: (Math.min(i * 0.06, 0.3)).toFixed(2) + 's'
    };
  },

  refresh(st) {
    const posts = (st.posts || []).slice().sort((a, b) => b.createdAt - a.createdAt);
    /* 结构键：点赞/评论变化不整卡重绘，保住爱心缩放动画（等价原型 lastKey） */
    const key = JSON.stringify(posts.map((p) => [p.id, p.userId, p.type, p.content, (p.images || []).length, p.tags, p.createdAt]));
    if (this._renderedBefore && key === this._lastKey) return;
    this._lastKey = key;
    const model = posts.map((p, i) => this.postModel(p, st, i));
    this._renderedBefore = true;
    this.setData({ posts: model, empty: model.length === 0 });
  },

  heartsBurst(n, e) {
    const t = e && e.changedTouches && e.changedTouches[0];
    const h = this.selectComponent('#hearts');
    if (h) h.burst(n, t ? t.clientX : undefined, t ? t.clientY : undefined);
  },

  /* 点赞：接口 toggle 后路径式 setData，heart-pop 只播一次 */
  onLike(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const postId = e.currentTarget.dataset.post;
    if (this._likeBusy && this._likeBusy[postId]) return;
    this._likeBusy = this._likeBusy || {};
    this._likeBusy[postId] = true;
    const that = this;
    api.post.like({ postId: postId }).then(function (r) {
      that._likeBusy[postId] = false;
      /* 同步本地快照（结构键不含点赞，不会触发整卡重绘） */
      const st = store.get();
      const p = st.posts.find((x) => x.id === postId);
      if (p) { p.liked = r.liked; p.likeCount = r.likeCount; }
      that.setData({
        ['posts[' + idx + '].liked']: r.liked,
        ['posts[' + idx + '].likeCount']: r.likeCount,
        ['posts[' + idx + '].likeIcon']: r.liked ? ICONS.heartFill : ICONS.heart
      });
      if (r.liked) that.heartsBurst(5, e);
    }).catch(function (err) {
      that._likeBusy[postId] = false;
      ui.toast(err.message, '💔');
    });
  },

  /* 评论弹层：先拉完整列表再打开 */
  onComment(e) {
    const postId = e.currentTarget.dataset.post;
    const idx = Number(e.currentTarget.dataset.idx);
    const that = this;
    api.post.comments({ postId: postId }).then(function (d) {
      const cmts = d.list.map((c, ci) => ({
        k: ci,
        avatar: c.avatar || icons.avatarURI(c.userId),
        name: c.nickname || '我',
        content: c.content
      }));
      that.setData({
        cmtShow: true,
        cmtPostId: postId,
        cmtIdx: idx,
        cmtList: cmts,
        cmtValue: '',
        cmtFocus: true
      });
    }).catch(function (err) {
      ui.toast(err.message, '💬');
    });
  },

  onCmtClose() {
    this.setData({ cmtShow: false, cmtFocus: false });
  },

  onCmtInput(e) {
    this.setData({ cmtValue: e.detail.value });
  },

  sendCmt() {
    const val = this.data.cmtValue.trim();
    if (!val) {
      ui.toast('先写点什么吧～', '💬');
      return;
    }
    const postId = this.data.cmtPostId;
    const idx = this.data.cmtIdx;
    const that = this;
    api.post.commentCreate({ postId: postId, content: val }).then(function (d) {
      /* 同步本地快照（评论计数不进结构键） */
      const st = store.get();
      const p = st.posts.find((x) => x.id === postId);
      if (p) p.commentCount = d.commentCount;
      that.setData({ cmtShow: false, cmtFocus: false });
      ui.toast('评论成功 ❤️', '💬');
      if (idx >= 0 && d.comment) {
        const c = d.comment;
        const item = {
          k: 0,
          avatar: c.avatar || icons.avatarURI(c.userId),
          name: c.nickname || '我',
          content: c.content
        };
        const old = that.data.posts[idx].comments || [];
        that.setData({
          ['posts[' + idx + '].commentCount']: d.commentCount,
          ['posts[' + idx + '].comments']: old.concat([item])
        });
      }
    }).catch(function (err) {
      ui.toast(err.message, '💬');
    });
  },

  /* 删除（仅自己的动态显示入口） */
  onMore(e) {
    const postId = e.currentTarget.dataset.post;
    const st = store.get();
    const p = st.posts.find((x) => x.id === postId);
    if (!p || !p.isMine) return;
    this.setData({
      confirmShow: true,
      confirmPostId: postId,
      confirm: {
        ill: ICONS.trash,
        title: '删除这条日常？',
        sub: '删除后就看不到啦，真的要删吗',
        okText: '删除这条',
        cancelText: '再想想',
        danger: true
      }
    });
  },

  onConfirmOk() {
    const postId = this.data.confirmPostId;
    const that = this;
    if (postId) {
      api.post.delete({ postId: postId }).then(function () {
        ui.toast('已经删除啦', '🍃');
        that.setData({ confirmShow: false });
        store.fetchPosts().catch(function () {});
      }).catch(function (err) {
        that.setData({ confirmShow: false });
        ui.toast(err.message, '🍃');
      });
    } else {
      this.setData({ confirmShow: false });
    }
  },

  onConfirmCancel() {
    this.setData({ confirmShow: false });
  },

  goNewPost() {
    wx.navigateTo({ url: '/pages/new-post/new-post' });
  }
});
