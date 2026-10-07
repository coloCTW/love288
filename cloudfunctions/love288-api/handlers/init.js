/* 初始化演示数据：创建 12 个集合 + 覆盖插入种子文档（幂等，重跑即还原演示初始状态）。
   仅在 DEMO_MODE=true 时可执行。 */
const config = require('../lib/config');
const errors = require('../lib/errors');
const seed = require('../seed');

async function seedCollection(db, name) {
  const docs = seed.SEED[name] || [];
  const col = db.collection(name);
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const id = doc._id;
    const data = {};
    Object.keys(doc).forEach(function (k) {
      if (k !== '_id') data[k] = doc[k];
    });
    await col.doc(id).set({ data: data });
  }
  return docs.length;
}

async function run(db, event) {
  if (!config.DEMO_MODE) {
    throw errors.biz(40301, '演示模式已关闭，不能初始化演示数据哦～');
  }
  let seeded = 0;
  for (let i = 0; i < seed.COLLECTIONS.length; i++) {
    const name = seed.COLLECTIONS[i];
    try {
      await db.createCollection(name);
    } catch (e) { /* 集合已存在，忽略 */ }
  }
  for (let i = 0; i < seed.COLLECTIONS.length; i++) {
    seeded += await seedCollection(db, seed.COLLECTIONS[i]);
  }
  return { collections: seed.COLLECTIONS.length, seeded: seeded };
}

module.exports = { run: run };
