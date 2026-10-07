/* 日常动态：list / create / delete / like / comments / commentCreate。
   list 一次性联查 users（昵称头像）与 likes（我是否已赞），并内嵌每帖最新 3 条
   评论预览 —— 卡片内联展示评论的交互保持原样；完整评论走 comments 接口。 */
const errors = require('../lib/errors');
const time = require('../lib/time');
const idLib = require('../lib/id');
const paging = require('../lib/paging');
const caseLib = require('../lib/case');
const subscribe = require('../lib/subscribe');

const PREVIEW_COMMENTS = 3;

async function fetchPost(ctx, postId) {
  let got;
  try {
    got = await ctx.db.collection('posts').doc(postId).get();
  } catch (e) {
    return null;
  }
  const p = got.data;
  /* 越权防线：by-id 查询必须校验 coupleId，防止跨情侣读写 */
  if (!p || p.coupleId !== ctx.coupleId) return null;
  return p;
}

async function list(ctx, event) {
  const _ = ctx._;
  const db = ctx.db;
  const pg = paging.paging(event);
  const cond = { coupleId: ctx.coupleId, deletedAt: _.eq(null) };

  const [totalR, rowsR] = await Promise.all([
    db.collection('posts').where(cond).count(),
    db.collection('posts').where(cond)
      .orderBy('createdAt', 'desc')
      .skip(pg.skip).limit(pg.pageSize).get()
  ]);
  const posts = rowsR.data;
  const postIds = posts.map(function (p) { return p._id; });

  /* 评论预览（升序取末 3 条），同时收集评论者 id 一起联查 */
  let commentMap = {};
  if (postIds.length) {
    const cR = await db.collection('comments')
      .where({ postId: _.in(postIds) })
      .orderBy('createdAt', 'asc').get();
    cR.data.forEach(function (c) {
      (commentMap[c.postId] = commentMap[c.postId] || []).push(c);
    });
    Object.keys(commentMap).forEach(function (pid) {
      if (commentMap[pid].length > PREVIEW_COMMENTS) {
        commentMap[pid] = commentMap[pid].slice(-PREVIEW_COMMENTS);
      }
    });
  }

  /* 用户昵称头像（发帖人 + 评论者） */
  const userIds = {};
  posts.forEach(function (p) { userIds[p.userId] = 1; });
  Object.keys(commentMap).forEach(function (pid) {
    commentMap[pid].forEach(function (c) { userIds[c.userId] = 1; });
  });
  let userMap = {};
  const uidList = Object.keys(userIds);
  if (uidList.length) {
    const uR = await db.collection('users').where({ _id: _.in(uidList) }).get();
    uR.data.forEach(function (u) { userMap[u._id] = u; });
  }

  /* 我赞过的帖子（演示模式下 demo-lin 的赞也算"我"，与 isMine 口径一致） */
  let likedSet = {};
  if (postIds.length) {
    const lR = await db.collection('likes').where({ postId: _.in(postIds), userId: _.in(ctx.selfIds) }).get();
    lR.data.forEach(function (l) { likedSet[l.postId] = true; });
  }

  const listData = posts.map(function (p) {
    const u = userMap[p.userId];
    const cmts = (commentMap[p._id] || []).map(function (c) {
      const cu = userMap[c.userId];
      return caseLib.toPub(c, {
        nickname: (cu && cu.nickname) || '',
        avatar: (cu && cu.avatar) || ''
      });
    });
    return caseLib.toPub(p, {
      nickname: (u && u.nickname) || '',
      avatar: (u && u.avatar) || '',
      liked: !!likedSet[p._id],
      isMine: ctx.isMine(p.userId),
      comments: cmts
    });
  });

  return {
    list: listData,
    total: totalR.total,
    hasMore: pg.skip + posts.length < totalR.total
  };
}

async function create(ctx, event) {
  const content = String(event.content || '').trim();
  const images = Array.isArray(event.images) ? event.images.filter(function (f) { return typeof f === 'string' && f; }) : [];
  if (!content && !images.length) throw errors.biz(40001, '写点什么，或者放一张照片吧～');
  if (images.length > 9) throw errors.biz(40001, '最多 9 张照片哦～');
  const tags = Array.isArray(event.tags)
    ? event.tags.filter(function (t) { return typeof t === 'string' && t.trim(); }).slice(0, 5).map(function (t) { return t.trim(); })
    : [];
  const location = typeof event.location === 'string' && event.location.trim()
    ? event.location.trim() : (ctx.user.city || '');

  const now = time.now();
  const postId = idLib.genId('post');
  const postDoc = {
    _id: postId, coupleId: ctx.coupleId, userId: ctx.openid, type: 'normal',
    content: content, images: images, location: location, tags: tags,
    likeCount: 0, commentCount: 0, deletedAt: null, createdAt: now
  };
  await ctx.db.collection('posts').doc(postId).set({ data: postDoc });
  /* 尽力推送订阅消息给对方（失败静默） */
  subscribe.send(ctx.cloud, ctx.partnerId, 'post', {
    thing1: content || '发了一张照片',
    thing2: ctx.user.nickname || 'TA'
  });
  return { post: caseLib.toPub(postDoc, { nickname: ctx.user.nickname || '', avatar: ctx.user.avatar || '', liked: false, isMine: true, comments: [] }) };
}

/* 软删，仅本人（演示模式下 demo-lin 种子也算"我"） */
async function remove(ctx, event) {
  const postId = String(event.postId || '');
  if (!postId) throw errors.biz(40001);
  const post = await fetchPost(ctx, postId);
  if (!post || post.deletedAt) throw errors.biz(40401);
  if (!ctx.isMine(post.userId)) throw errors.biz(40301, '这条不是你的日常哦，只能删自己的～');
  await ctx.db.collection('posts').doc(postId).update({ data: { deletedAt: time.now() } });
  return {};
}

/* 点赞 / 取消（toggle），原子更新冗余计数。
   _id 用确定性 like-{postId}-{userId}：并发双击时 add 因主键冲突失败，
   兜底转为取消 —— 双端并发不会双插、计数不会错乱。 */
async function like(ctx, event) {
  const postId = String(event.postId || '');
  if (!postId) throw errors.biz(40001);
  const post = await fetchPost(ctx, postId);
  if (!post || post.deletedAt) throw errors.biz(40401);

  const _ = ctx._;
  const col = ctx.db.collection('likes');
  const likeId = 'like-' + postId + '-' + ctx.openid;
  const exist = await col.where({ postId: postId, userId: ctx.openid }).limit(1).get();
  let liked;
  let inc = 1;
  if (exist.data.length) {
    await col.doc(exist.data[0]._id).remove();
    inc = -1;
    liked = false;
  } else {
    try {
      await col.add({ data: { _id: likeId, postId: postId, userId: ctx.openid, createdAt: time.now() } });
      liked = true;
    } catch (dup) {
      /* 并发兜底：同一条赞已存在（对方刚点），按取消处理 */
      await col.doc(likeId).remove().catch(function () { /* 已不存在则忽略 */ });
      inc = -1;
      liked = false;
    }
  }
  await ctx.db.collection('posts').doc(postId).update({ data: { likeCount: _.inc(inc) } });
  const fresh = await fetchPost(ctx, postId);
  return { liked: liked, likeCount: fresh ? fresh.likeCount : (post.likeCount + inc) };
}

async function comments(ctx, event) {
  const postId = String(event.postId || '');
  if (!postId) throw errors.biz(40001);
  const post = await fetchPost(ctx, postId);
  if (!post || post.deletedAt) throw errors.biz(40401);

  const pg = paging.paging(event);
  const _ = ctx._;
  const col = ctx.db.collection('comments');
  const cond = { postId: postId };
  const [totalR, rowsR] = await Promise.all([
    col.where(cond).count(),
    col.where(cond).orderBy('createdAt', 'asc').skip(pg.skip).limit(pg.pageSize).get()
  ]);

  const userIds = {};
  rowsR.data.forEach(function (c) { userIds[c.userId] = 1; });
  let userMap = {};
  const uidList = Object.keys(userIds);
  if (uidList.length) {
    const uR = await ctx.db.collection('users').where({ _id: _.in(uidList) }).get();
    uR.data.forEach(function (u) { userMap[u._id] = u; });
  }
  return {
    list: rowsR.data.map(function (c) {
      const u = userMap[c.userId];
      return caseLib.toPub(c, {
        nickname: (u && u.nickname) || '',
        avatar: (u && u.avatar) || ''
      });
    }),
    total: totalR.total,
    hasMore: pg.skip + rowsR.data.length < totalR.total
  };
}

async function commentCreate(ctx, event) {
  const postId = String(event.postId || '');
  const content = String(event.content || '').trim();
  if (!postId) throw errors.biz(40001);
  if (!content) throw errors.biz(40001, '先写点什么吧～');
  const post = await fetchPost(ctx, postId);
  if (!post || post.deletedAt) throw errors.biz(40401);

  const now = time.now();
  const cId = idLib.genId('cmt');
  const cDoc = { _id: cId, postId: postId, userId: ctx.openid, content: content, createdAt: now };
  await ctx.db.collection('comments').doc(cId).set({ data: cDoc });
  await ctx.db.collection('posts').doc(postId).update({ data: { commentCount: ctx._.inc(1) } });

  /* 评论者不是帖子作者时，尽力推送订阅消息给作者（失败静默） */
  if (post.userId !== ctx.openid) {
    subscribe.send(ctx.cloud, post.userId, 'comment', {
      thing1: content,
      thing2: ctx.user.nickname || 'TA'
    });
  }

  const fresh = await fetchPost(ctx, postId);
  return {
    comment: caseLib.toPub(cDoc, { nickname: ctx.user.nickname || '', avatar: ctx.user.avatar || '' }),
    commentCount: fresh ? fresh.commentCount : (post.commentCount + 1)
  };
}

module.exports = {
  list: list,
  create: create,
  remove: remove,
  like: like,
  comments: comments,
  commentCreate: commentCreate
};
