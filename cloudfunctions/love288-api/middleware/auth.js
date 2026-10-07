/* ═══════════════════════════════════════════════════════════════════
   请求上下文（中间件）：
   1. 从 getWXContext 取 openid（前端不传任何身份信息）
   2. upsert users（_id = openid，首次登录即注册）
   3. 解析 active 情侣关系；未绑定时按 DEMO_MODE 决定：
      true  → 兜底演示情侣 couple-demo（读原样返回演示数据，写落真实 openid）
      false → 抛 40201 引导绑定
   ═══════════════════════════════════════════════════════════════════ */
const config = require('../lib/config');
const errors = require('../lib/errors');
const time = require('../lib/time');

/* users 集合可能尚未创建（init.seed 未跑过），也可能文档不存在：
   对不同 SDK 版本行为差异做兜底 —— update 失败则自愈建集合 + add，
   add 撞 _id 则说明文档已存在，补一次 update。 */
async function upsertUser(db, _, openid, now) {
  const users = db.collection('users');
  const freshDoc = {
    _id: openid, nickname: '', avatar: '', city: '',
    lastActiveAt: now, createdAt: now
  };
  try {
    const upd = await users.doc(openid).update({ data: { lastActiveAt: now } });
    if (upd.stats && upd.stats.updated === 0) {
      await users.add({ data: freshDoc });
    }
  } catch (e) {
    try { await db.createCollection('users'); } catch (e2) { /* 已存在，忽略 */ }
    try {
      await users.add({ data: freshDoc });
    } catch (e3) {
      /* 文档已存在：补一次活跃时间刷新 */
      await users.doc(openid).update({ data: { lastActiveAt: now } });
    }
  }
  const got = await users.doc(openid).get();
  return got.data;
}

async function resolveCouple(db, openid) {
  const col = db.collection('couples');
  const asA = await col.where({ userAId: openid, status: 'active' }).limit(1).get();
  if (asA.data.length) {
    return { coupleId: asA.data[0]._id, bound: true, demoMode: false, couple: asA.data[0] };
  }
  const asB = await col.where({ userBId: openid, status: 'active' }).limit(1).get();
  if (asB.data.length) {
    return { coupleId: asB.data[0]._id, bound: true, demoMode: false, couple: asB.data[0] };
  }
  if (config.DEMO_MODE) {
    return { coupleId: config.DEMO_COUPLE_ID, bound: false, demoMode: true, couple: null };
  }
  throw errors.biz(40201);
}

/* 伴侣 openid：演示模式恒为 demo-su；已绑定取对方 */
function partnerIdOf(couple, openid, demoMode) {
  if (demoMode) return config.DEMO_SU;
  if (couple.userAId === openid) return couple.userBId;
  return couple.userAId;
}

async function buildContext(db, _, cloud, event) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) throw errors.biz(40101);
  const now = time.now();

  const user = await upsertUser(db, _, openid, now);

  let rel;
  try {
    rel = await resolveCouple(db, openid);
  } catch (e) {
    /* couples 集合不存在等基础设施问题：按未绑定兜底（演示模式）或原样抛 40201 */
    if (e.code === 40201) throw e;
    if (config.DEMO_MODE) rel = { coupleId: config.DEMO_COUPLE_ID, bound: false, demoMode: true, couple: null };
    else throw e;
  }

  const partnerId = partnerIdOf(rel.couple, openid, rel.demoMode);
  const selfIds = rel.demoMode ? [openid, config.DEMO_LIN] : [openid];

  return {
    db: db,
    _: _,
    openid: openid,
    user: user,
    coupleId: rel.coupleId,
    couple: rel.couple,
    bound: rel.bound,
    demoMode: rel.demoMode,
    partnerId: partnerId,
    selfIds: selfIds,
    /* 演示模式：demo-lin 种子的内容也归"我"（可编辑可删） */
    isMine: function (ownerId) { return selfIds.indexOf(ownerId) >= 0; }
  };
}

module.exports = { buildContext: buildContext };
