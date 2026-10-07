# 后端接口设计 ·《两个人的小世界》

> 技术栈：微信云开发 · 云函数 + 云数据库 + 云存储。
> 数据库集合设计见 [sql.md](./sql.md)。本文档只做接口设计，不含实现代码。

---

## 1. 总体约定

### 1.1 云函数与路由

- 全部接口收敛到**一个云函数** `love288-api`，按 `event.type` 分发（沿用 `quickstartFunctions` 的 `switch(event.type)` 模式，符合 AGENTS.md 约定）。
- 前端调用方式：

```js
wx.cloud.callFunction({
  name: 'love288-api',
  data: { type: 'home.overview', month: '2026-09' }  // type + 接口参数
}).then(res => res.result)
```

- `type` 命名：`域名.动作`，如 `home.overview`、`post.like`。

### 1.2 响应格式

所有接口统一返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": { }
}
```

`code = 0` 表示成功；非 0 为错误，`message` 为可直接 toast 给用户的文案。

### 1.3 错误码

| code | 含义 | 前端处理建议 |
|---|---|---|
| 0 | 成功 | — |
| 40001 | 参数缺失或非法 | toast message |
| 40101 | 未获取到 openid（身份信息缺失） | toast message |
| 40201 | 尚未绑定情侣 | 引导去绑定流程（P0 功能，目前无页面） |
| 40202 | 邀请码无效或已过期 | toast，提示重新输入 |
| 40203 | 情侣关系冲突（已绑定 / 重复操作） | toast message |
| 40301 | 无权操作该数据（非创建者） | toast message |
| 40401 | 数据不存在 | toast message |
| 42901 | 超出每日限制（吃饭提醒） | toast message |
| 50000 | 服务器内部错误 | toast "出错了，稍后再试" |

### 1.4 认证与关系校验（云函数中间件）

- **身份**：openid 由云函数 `cloud.getWXContext()` 自动获取，**前端不需要传任何 token/userId**。每次调用云函数自动 upsert `users`（首次登录即注册，昵称为空串）。
- **情侣上下文**：需要情侣关系的接口，自动按 openid 查 `couples`（`status=active` 且 `userAId` 或 `userBId` 命中），拿不到返回 `40201`。coupleId 一律从服务端取，**前端不传**（防串数据）。
- **本人校验**：删除/编辑类接口校验 `creatorId === openid`，否则 `40301`。

### 1.5 字段命名转换

- 集合字段按 sql.md 已是 **camelCase**，数据库与 API 同构，云函数出口的 `toCamel` 仅作兜底（近似恒等）。
- 例外：`_id` 在响应中统一暴露为 `id`。

### 1.6 分页约定

- 请求：`page`（从 1 起，默认 1）、`pageSize`（默认 20，最大 50）。
- 响应：`{ list: [...], total: 总条数, hasMore: 是否还有下一页 }`。

### 1.7 图片上传（云存储）

- **不需要接口**：前端直接 `wx.cloud.uploadFile` 上传到云存储，拿到 `fileID` 后随业务接口提交（如 `post.create` 的 `images` 数组）。
- 云存储目录建议：`avatars/`（头像）、`posts/`、`meal-shares/`、`meals/`、`events/`。
- 上传失败或未上传完就不调业务接口，天然避免"孤儿图片"。

### 1.8 订阅消息

互动类接口在落库后**尽力发送**微信订阅消息给对方（模板 ID 配置为云函数环境变量 `SUBSCRIBE_TEMPLATE_IDS`，发送失败静默跳过，不影响主流程）：

| 场景 | 触发接口 | 接收方 | 模板示例 |
|---|---|---|---|
| 想你了 / 抱抱 / 我在哦 | `interaction.send` | 对方 | 恋爱互动提醒 |
| 提醒喝水 / 叫醒 | `interaction.send` | 对方 | 关怀提醒 |
| 吃饭提醒 | `reminder.meal` | 对方 | 吃饭提醒 |
| 心情同步 | `mood.update` | 对方 | 心情更新提醒 |
| 新约饭 / 新约会 | `meal.create` / `event.create` | 对方 | 新计划提醒 |
| 餐食分享 / 新动态 | `mealShare.create` / `post.create` | 对方 | 新动态提醒 |
| 新评论 | `post.commentCreate` | 帖子作者（非本人时） | 评论提醒 |

前端需在对应操作按钮上先调 `wx.requestSubscribeMessage` 请求授权（用户拒绝则只落库不推送，对方打开小程序仍能看到数据变化——双人数据本来就存在云端）。

**云函数配置**（已实现，`lib/subscribe.js`）：

- `config.json` 已加 `permissions.openapi: ["subscribeMessage.send"]`
- 环境变量 `SUBSCRIBE_TEMPLATE_IDS`：JSON 对象，键为 `interaction / mealReminder / mood / plan / post / comment`，值为各模板 ID；未配置时所有推送静默跳过
- 环境变量 `MINIPROGRAM_STATE`：`developer`（默认）/ `trial` / `formal`，发布后改 `formal`
- 模板字段名按公众平台申请到的实际模板调整（当前占位 `thing1/thing2/time3`）

---

## 2. 接口文档

> 每个接口给出：type 名、请求参数（camelCase）、关键业务规则、响应 `data` 结构或示例。

### A. 用户与关系

#### `user.login` — 静默登录（app.js onLaunch 调用）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| 无 | — | — | 身份由 openid 自动识别 |

**规则**：upsert `users`；刷新 `lastActiveAt`；返回是否已绑定情侣。

**响应**：

```json
{
  "code": 0, "message": "ok",
  "data": {
    "user": { "id": "demo-lin-openid", "nickname": "大头仔", "avatar": "", "city": "上海市", "createdAt": 1789516800000 },
    "coupleBound": true
  }
}
```

#### `user.get` — 我的资料（profile 页）

无参数。响应同 `user.login`。

#### `user.update` — 修改资料

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `nickname` | string | | 非空校验 |
| `avatar` | string | | 云存储 fileID |
| `city` | string | | |

**规则**：部分更新，返回新 `user`。

#### `user.reportStatus` — 上报电量/定位

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `batteryLevel` | number | | 0–100 |
| `latitude` / `longitude` | number | | 可选定位 |

**规则**：写 `batteryLevel` + `batteryUpdatedAt = 当前时间`；定位可用来推断城市、算距离。

#### `couple.get` — 情侣信息（profile 页）

无参数。

**响应**：

```json
{
  "code": 0, "message": "ok",
  "data": {
    "couple": {
      "startDate": "2016-11-19",
      "daysTogether": 3597,
      "settings": { "shareCity": true, "shareDistance": true, "mealNotify": true, "dateNotify": true, "wake": false }
    },
    "me": { "id": "demo-lin-openid", "nickname": "大头仔", "avatar": "", "city": "上海市" },
    "ta": { "id": "demo-su-openid", "nickname": "宝宝", "avatar": "", "city": "北京市" }
  }
}
```

#### `couple.genCode` — 生成绑定邀请码

无参数。

**规则**：已绑定 → `40203`；否则 upsert `couples` 一条 `status=waiting`（`userAId`=自己），生成 6 位数字码，30 分钟有效。

**响应**：`{ "inviteCode": "382617", "expiresAt": 1789950600000 }`

#### `couple.bind` — 输入邀请码完成绑定

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `inviteCode` | string | ✓ | 6 位码 |
| `startDate` | string | | 恋爱起始日 YYYY-MM-DD，不传默认今天 |

**规则**：查 `inviteCode` 命中且 `status=waiting` 且未过期且 `userAId != 自己` → 填 `userBId`、置 `active`；否则 `40202`。已绑定 → `40203`。

**响应**：`{ "couple": { "id": "couple-xxx", "startDate": "...", "status": "active" } }`

#### `couple.unpair` — 解除情侣关系

无参数。

**规则**：删除 `couples` 文档。历史业务数据保留在库中（所有查询都按 coupleId 过滤，解绑后自然不可见）。前端清空本地缓存后回到未绑定态。

#### `couple.updateSettings` — 更新设置开关

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `settings` | object | ✓ | 部分字段即可，如 `{ "wake": true }` |

**规则**：仅允许 `shareCity / shareDistance / mealNotify / dateNotify / wake` 五个键，合并写入。返回新 `settings`。

---

### B. 首页与互动

#### `home.overview` — 首页聚合（核心接口）

无参数（一切由 openid 推导）。

**规则**：
1. 未绑定 → `40201`。
2. 并行取：双方 `users`、`couples`、双方今日 `moods`、未来 `meal_appointments` + `calendar_events`、天气缓存。
3. **天气**：读 `weather_cache`（30 分钟内有效），过期则调第三方天气 API（按双方 `city`）并回写缓存；未配置第三方或未填城市 → 对应侧天气为 `null`（前端隐藏该卡）。
4. **恋爱天数**：服务端按 `startDate` 计算（服务端时间，避免手机时间不准）。
5. **距离**：`settings.shareDistance=false` 或双方无城市/定位 → `null`；否则用城市坐标表计算直线距离。
6. **电量**：`batteryUpdatedAt` 超过 24 小时 → 该侧电量返回 `null`（前端显示"未同步"）。
7. **下次见面**：`meal_appointments(status=upcoming, date>=今天)` ∪ `calendar_events(eventType≠todo, date>=今天)`，按日期取最近一条。

**响应**：

```json
{
  "code": 0, "message": "ok",
  "data": {
    "me": { "id": "demo-lin-openid", "nickname": "大头仔", "avatar": "", "city": "上海市",
            "batteryLevel": 45, "batteryUpdatedAt": 1789954800000 },
    "ta": { "id": "demo-su-openid", "nickname": "宝宝", "avatar": "", "city": "北京市",
            "batteryLevel": 65, "batteryUpdatedAt": 1789953120000 },
    "couple": { "startDate": "2016-11-19", "daysTogether": 3597, "distanceKm": 866.9 },
    "weather": {
      "me": { "city": "上海市", "temp": 26, "cond": "多云", "high": 28, "low": 22, "updatedAt": 1789948800000 },
      "ta": { "city": "北京市", "temp": 21, "cond": "晴", "high": 24, "low": 16, "updatedAt": 1789948800000 }
    },
    "mood": {
      "me": { "type": "平静", "at": 1789945200000 },
      "ta": { "type": "喜悦", "at": 1789941600000 }
    },
    "nextDate": { "type": "meal", "title": "火锅", "date": "2026-09-23", "time": "12:30", "location": "海底捞（陆家嘴店）" }
  }
}
```

> 前端保留 `utils/helpers.js` 做倒计时文案（"2天后"、"明天见 ❤️"）——文案是纯展示逻辑，不需要后端算。

#### `interaction.send` — 发送互动（想你了/抱抱/我在哦/喝水/叫醒）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | string | ✓ | `miss_you` / `hug` / `im_here` / `water` / `wake` |
| `content` | string | | 自定义文案，不传用云函数内置默认文案 |

**规则**：写 `interactions`；触发订阅消息（§1.8）；返回 `{ "delivered": true }`。

#### `interaction.list` — 收到的互动（"收到的互动"页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `page` / `pageSize` | number | | 分页 |

**规则**：`receiverId=我`（演示模式含 demo-lin）、`coupleId=我的情侣`，按 `createdAt` 倒序分页；联表 `users` 冗余发送方昵称/头像。

**响应**：

```json
{
  "code": 0, "message": "ok",
  "data": {
    "list": [
      { "id": "it-2", "senderId": "demo-lin-openid", "nickname": "大头仔", "avatar": "",
        "type": "water", "content": "提醒 TA 喝水", "createdAt": 1789945200000 }
    ],
    "total": 2,
    "hasMore": false
  }
}
```

#### `reminder.meal` — 吃饭提醒（好好吃饭页"提醒 TA"）

无参数。

**规则**：
1. 服务端统计 `meal_reminders` 中 `senderId=我, date=今天(北京时间)` 条数，≥ 3 → `42901`（**限流必须在服务端**，否则双端各计各的）。演示模式下 demo-lin 种子的提醒也计入"我"的当日次数。
2. 通过后写入一条，`content` 从文案池随机（文案池 = 现有 eat.js `REMIND_POOL` 移到云函数）。
3. 触发订阅消息（P1）。

**响应**：`{ "todayCount": 2, "limit": 3, "content": "宝宝，去吃饭啦～" }`（前端据此渲染"今天已提醒 2/3 次"，toast 用返回的 content）

---

### C. 心情

#### `mood.get` — 双方今日心情（首页/心情页）

无参数。

**响应**：

```json
{ "code": 0, "message": "ok",
  "data": {
    "me": { "type": "平静", "at": 1789945200000 },
    "ta": { "type": "喜悦", "at": 1789941600000 }
  }
}
```

未设置的一侧返回 `null`（前端显示"还没同步"占位）。

#### `mood.update` — 同步我的心情

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `moodType` | string | ✓ | 9 种枚举之一（喜悦/悲伤/愤怒/害怕/喜欢/平静/乐观/兴奋/焦虑），服务端白名单校验 |

**规则**：按 `(coupleId, userId, date=今天)` upsert（一天一条，随时可改）；触发订阅消息。

**响应**：`{ "mood": { "type": "喜悦", "at": 1789950000000 } }`

---

### D. 约饭与餐食分享

#### `meal.list` — 约饭列表（好好吃饭页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `scope` | string | | `upcoming`（今天及以后，升序，默认）/ `all`（历史倒序） |
| `page` / `pageSize` | number | | 分页 |

**规则**：响应顺带返回今日提醒计数，避免页面多一次请求（好好吃饭页按钮态用）。

**响应**：`{ "list": [ { "id": "meal-1", "title": "火锅", "date": "2026-09-23", "time": "12:30", "city": "上海市", "location": "海底捞（陆家嘴店）", "note": "...", "creatorId": "demo-lin-openid", "createdAt": 1789862400000 } ], "total": 1, "hasMore": false, "remindTodayCount": 1, "remindLimit": 3 }`

#### `meal.create` — 添加约饭（add-meal 页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | ✓ | 吃什么，如"火锅" |
| `date` | string | ✓ | YYYY-MM-DD |
| `time` | string | ✓ | HH:mm |
| `city` | string | ✓ | |
| `location` | string | ✓ | |
| `coverImage` | string | | fileID |
| `note` | string | | |

**规则**：写入 `meal_appointments`，**同一事务联动**写入 `calendar_events`（`eventType=meal`，双向记录 `eventId`/`mealId`，保持"约饭同时出现在计划月历"的产品逻辑）；触发订阅消息。

**响应**：`{ "meal": { "id": "meal-2", ... }, "event": { "id": "ev-meal-2", ... } }`

#### `mealShare.list` — 餐食分享列表（好好吃饭页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `scope` | string | ✓ | `today`（今天的分享，按北京时间）/ `history`（今天之前，倒序） |
| `page` / `pageSize` | number | | 分页 |

**响应**：`{ "list": [ { "id": "ms-1", "userId": "demo-su-openid", "content": "...", "images": [], "createdAt": 1789862400000 } ], "total": 2, "hasMore": false }`

#### `mealShare.create` — 餐食分享（meal-share 页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `content` | string | ✓ | 一句话 |
| `images` | string[] | ✓ | fileID 数组，1–9 张 |

**规则**：写入 `meal_shares`，**同一事务联动**写入 `posts`（`type=meal`、`tags=["好好吃饭"]`、`location=我的城市`，并回填 `meal_shares.postId`）；触发订阅消息。

**响应**：`{ "share": { "id": "ms-3", ... }, "post": { "id": "post-5", ... } }`

---

### E. 日常动态

#### `post.list` — 动态流（daily 页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `page` / `pageSize` | number | | 分页 |

**规则**：
1. `coupleId=我的情侣` 且 `deletedAt=null`，按 `createdAt` 倒序分页。
2. 联表 `users` 冗余昵称/头像；`likeCount/commentCount` 直接读冗余字段。
3. `liked`：一次 in 查询 `likes`（`postId` 在结果集内、`userId=我`）得出，避免逐帖查询。
4. **内嵌每帖最新 3 条评论预览**（`comments` 字段，升序）：卡片内联展示评论的交互保持原样，完整评论列表走 `post.comments`。
5. `isMine` 由服务端判定（演示模式下 demo-lin 种子的内容也归"我"）。

**响应**：

```json
{
  "code": 0, "message": "ok",
  "data": {
    "list": [
      {
        "id": "post-1",
        "userId": "demo-lin-openid",
        "nickname": "大头仔",
        "avatar": "",
        "type": "normal",
        "content": "今天和苏棠一起去看了新开的展览～\n好喜欢这幅画！❤️",
        "images": [],
        "location": "上海市",
        "tags": ["约会日"],
        "likeCount": 2,
        "commentCount": 1,
        "liked": true,
        "isMine": true,
        "comments": [
          { "id": "cmt-1", "userId": "demo-su-openid", "nickname": "宝宝", "avatar": "", "content": "下次还要一起去呀～", "createdAt": 1789945200000 }
        ],
        "createdAt": 1789941600000
      }
    ],
    "total": 3,
    "hasMore": false
  }
}
```

#### `post.create` — 发布日常（new-post 页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `content` | string | | 与 images 至少其一 |
| `images` | string[] | | 最多 9 张 |
| `location` | string | | 不传默认我的 city |
| `tags` | string[] | | |

**规则**：`likeCount/commentCount` 初始 0；触发订阅消息。

**响应**：`{ "post": { "id": "post-6", ... } }`

#### `post.delete` — 删除动态（仅本人）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `postId` | string | ✓ | |

**规则**：非本人 → `40301`；软删（写 `deletedAt`），不级联删 likes/comments。

#### `post.like` — 点赞 / 取消点赞（toggle）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `postId` | string | ✓ | |

**规则**：`likes` 中已存在 `(postId, 我)` → 删除并 `likeCount-1`；否则插入并 `+1`（原子更新，防双端并发计数错乱）。

**响应**：`{ "liked": true, "likeCount": 3 }`

#### `post.comments` — 评论列表

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `postId` | string | ✓ | |
| `page` / `pageSize` | number | | |

**响应**：`{ "list": [ { "id": "cmt-1", "userId": "demo-su-openid", "nickname": "宝宝", "avatar": "", "content": "下次还要一起去呀～", "createdAt": 1789945200000 } ], "total": 1, "hasMore": false }`

#### `post.commentCreate` — 发表评论

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `postId` | string | ✓ | |
| `content` | string | ✓ | 非空校验 |

**规则**：写入 + `commentCount+1`；评论者 ≠ 帖子作者时触发订阅消息。

**响应**：`{ "comment": { "id": "cmt-2", ... }, "commentCount": 2 }`

---

### F. 计划

#### `event.list` — 月历事件（plan 页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `month` | string | ✓ | `YYYY-MM`，如 `2026-09` |

**规则**：
1. `monthEvents`：`date` 以 `month` 为前缀的全部事件（月历打标记用，含 todo）。
2. `upcoming`：`date>=今天` 且 `eventType≠todo` 且 `status=active`，升序（"即将到来的约会"列表用，跨月）。

**响应**：

```json
{
  "code": 0, "message": "ok",
  "data": {
    "monthEvents": [
      { "id": "ev-1", "title": "看电影", "eventType": "date", "date": "2026-09-29", "time": "19:00", "city": "上海市", "location": "CGV影城", "note": "...", "creatorId": "demo-lin-openid", "createdAt": 1789862400000 }
    ],
    "upcoming": [
      { "id": "ev-meal-1", "title": "火锅", "eventType": "meal", "date": "2026-09-23", "time": "12:30", "city": "上海市", "location": "海底捞（陆家嘴店）", "note": "...", "creatorId": "demo-lin-openid", "createdAt": 1789862400000 },
      { "id": "ev-1", "title": "看电影", "eventType": "date", "date": "2026-09-29", "time": "19:00", "city": "上海市", "location": "CGV影城", "note": "...", "creatorId": "demo-lin-openid", "createdAt": 1789862400000 }
    ]
  }
}
```

> 前端保留现有 `plan.js` 的 `buildCells()` 纯函数画月历；点击某天只看该天、展开/收起等交互全部是前端过滤，无需额外接口。

#### `event.get` — 约会详情（date-detail 页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `eventId` | string | ✓ | |

**规则**：不存在 → `40401`。返回事件全字段 + `creatorNickname` + `isMine`。

**响应**：

```json
{
  "code": 0, "message": "ok",
  "data": {
    "event": {
      "id": "ev-1", "title": "看电影", "eventType": "date", "date": "2026-09-29", "time": "19:00",
      "city": "上海市", "location": "CGV影城", "image": "", "note": "记得提前买票哦～",
      "creatorNickname": "大头仔", "isMine": true, "createdAt": 1789862400000
    }
  }
}
```

#### `event.create` — 添加约会/纪念日/待办（add-date 页）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | ✓ | |
| `eventType` | string | ✓ | `date` / `anniversary` / `todo` |
| `date` | string | ✓ | YYYY-MM-DD |
| `time` | string | | 纪念日/待办可空 |
| `city` / `location` | string | | 约会必填；纪念日/待办可空 |
| `image` | string | | fileID |
| `note` | string | | |

**规则**：`status=active`；`eventType=date` 时触发订阅消息。

**响应**：`{ "event": { "id": "ev-5", ... } }`

#### `event.update` — 编辑（date-detail 编辑弹层）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `eventId` | string | ✓ | |
| `title` / `date` / `time` / `city` / `location` / `note` | | | 传什么改什么；`title` 和 `date` 至少传一个 |

**规则**：仅创建者可改（`40301`）。注意：`eventType=meal` 的联动事件（`mealId` 非空）**不允许改日期/时间**（以约饭为准，要改去约饭侧改），只允许改 note 等弱字段——MVP 阶段可在前端隐藏编辑入口简化处理。

#### `event.delete` — 删除（仅创建者）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `eventId` | string | ✓ | |

**规则**：非创建者 → `40301`。若 `mealId` 非空（约饭联动事件）：**同时删除对应 `meal_appointments`**，反之亦然——保持"约饭/月历"两处不出现孤儿数据。

---

## 3. 页面 → 接口映射总表

| 页面 | 加载时调用 | 交互时调用 |
|---|---|---|
| app.js（启动） | `user.login` | — |
| 首页 home | `home.overview` | `interaction.send`（想你了/抱抱/我在哦/喝水/叫醒） |
| 好好吃饭 eat | `reminder.meal` 结果渲染在 `meal.list(upcoming)` + `mealShare.list(today)` + `mealShare.list(history)` 三连中；实际为 `meal.list` + `mealShare.list(today)` + `mealShare.list(history)`（提醒按钮态由 `meal.list` 响应中的 todayCount 或单独请求） | `reminder.meal` |
| 日常 daily | `post.list` | `post.like` / `post.comments` / `post.commentCreate` / `post.delete` |
| 计划 plan | `event.list(month)` | 翻月 → 再调 `event.list` |
| 同步心情 mood | `mood.get` | `mood.update` |
| 添加约饭 add-meal | —（城市列表可保留前端常量或后端配置） | `meal.create`（照片先 `wx.cloud.uploadFile`） |
| 餐食分享 meal-share | — | `mealShare.create`（照片先上传） |
| 发布日常 new-post | —（标签可保留前端常量） | `post.create`（照片先上传） |
| 添加约会 add-date | — | `event.create`（照片先上传） |
| 约会详情 date-detail | `event.get(eventId)` | `event.update` / `event.delete` |
| 我的 profile | `user.get` + `couple.get` | `user.update` / `user.reportStatus` / `couple.updateSettings` / `couple.genCode` / `couple.bind` / `couple.unpair` |

> 说明：好好吃饭页的"今日已提醒 N 次"状态，建议 `meal.list` 响应里顺带返回 `remindTodayCount`（避免多一次请求），实现时合并处理即可。

## 4. 数据联动规则汇总

| 联动 | 实现位置 | 说明 |
|---|---|---|
| 新建约饭 → 月历事件 | `meal.create` | 写 `meal_appointments` + `calendar_events(eventType=meal)`，双向关联 `eventId`/`mealId` |
| 删除约饭事件 → 删约饭 | `event.delete` | `mealId` 非空时级联删 `meal_appointments` |
| 餐食分享 → 日常动态 | `mealShare.create` | 写 `meal_shares` + `posts(type=meal)`，回填 `postId` |
| 点赞/评论 → 计数 | `post.like` / `post.commentCreate` | 原子更新 `posts.likeCount/commentCount` |
| 心情 → 对方可见 | `mood.update` | 落库即同步（双方共享同一 coupleId，查询天然共享） |
| 互动/提醒 → 对方收到 | `interaction.send` / `reminder.meal` | 落库 + 订阅消息推送 |

## 5. 建议开发顺序

| 阶段 | 内容 | 对应文档 |
|---|---|---|
| P0 | 云函数骨架（中间件 + 响应/错误码约定）、`user.login`、`couple.*`（绑定流程）、`user.get/update` | §A |
| P0 | `home.overview`（先不含天气/距离，数据为 null 也不崩） | §B |
| P0 | `mood.get/update`、`reminder.meal`（限流）、`interaction.send` | §B §C |
| P0 | `event.*`（月历 + 详情 + 编辑删除）、`meal.*`（联动） | §D §F |
| P0 | `post.*`（动态流 + 点赞 + 评论 + 删除）、`mealShare.*`（联动）、云存储上传 | §D §E |
| P1 | 天气缓存 + 第三方天气 API、距离计算 ✅（和风 API，环境变量 `QWEATHER_KEY`；城市坐标表 `config.CITIES`） | §B |
| P1 | 订阅消息 ✅ 后端发送已接入全部触发点（`lib/subscribe.js`）；模板申请 + 前端 `wx.requestSubscribeMessage` 授权待办 | §1.8 |
| P1 | `interaction.list` ✅ 后端已实现；「收到的互动」新页面待前端 | — |

---

## 附：与现有 quickstartFunctions 的关系

现有 [cloudfunctions/quickstartFunctions](../cloudfunctions/quickstartFunctions/index.js) 是官方模板 demo（sales 集合），与业务无关。业务云函数**新建**为 `cloudfunctions/love288-api` 按本文档实现（`event.type` 路由），模板函数可删除或保留作参考。

另：云函数内 `init.seed` 动作可一键创建 12 个集合并写入演示数据（幂等，重跑还原初始状态；仅演示模式可执行），演示数据日期相对运行当天生成，比 sql.md §6 的固定日期更耐用。
