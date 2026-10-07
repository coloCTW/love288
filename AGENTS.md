# AGENTS.md — 开发规范

## 项目简介

《两个人的小世界》——仅供一对情侣使用的微信小程序，基于微信云开发（云函数 + 云数据库 + 云存储）。4 个 Tab：首页 / 好好吃饭 / 日常 / 计划。

## 目录结构

- `weixinapp/` — 设计原型（HTML），**只读，禁止修改**。设计、文案、交互以其为准
- `miniprogram/` — 小程序前端（页面、组件、样式）
- `cloudfunctions/` — 云函数
- `project.config.json` — 根目录已配好，勿动

## 技术约定

- 原生小程序，不引入 npm 依赖；新页面放 `miniprogram/pages/<页面>/` 并在 `app.json` 注册
- 后端只走云开发：云函数用 `wx-server-sdk`，数据存云数据库，图片存云存储
- 前端调用 `wx.cloud.callFunction`，云函数按 `event.type` 分发业务；环境 ID 在 `miniprogram/app.js` 的 `env` 配置
- 数据层存标准时间戳，展示层转本地时间
- 现有 `pages/index`、`pages/example` 及 `quickstartFunctions` 为官方示例，将逐步替换为真实业务

## 数据模型

集合与字段见 `weixinapp/情侣微信小程序_完整PRD_V1.0.md` §20（users / couples / moods / posts / likes / comments / meal_appointments / meal_shares / meal_reminders / calendar_events 等）。

## 视觉与文案（重要）

- 恋爱手账风：纸底 `#F0F0E0`、蜜桃纸卡 `#F0E0D0`、珊瑚粉主按钮 `#F0A090`、深暖灰文字 `#504040`；完整 token 见 `weixinapp/brand-spec.md`
- 纸片卡片：大圆角（16–24px）+ 细描边 + 充足留白；功能色：粉=爱/约会、黄=纪念日、蓝=待办/天气、绿=吃饭
- 标题手写体（楷体回退）；按钮文案口语化（「提醒 TA」「想你了」），**禁用「提交」「确定」等系统腔**
- 错误提示要温柔（如「好像走神了一下，再试一次吧～」），Loading 用小太阳/爱心动效，不用系统转圈

## 业务约束

- 数据只对情侣双方可见；只能删除自己创建的内容
- 一天一个心情（重复选择覆盖）；提醒吃饭每天最多 3 次
- 跨模块联动：约饭 → 计划日历；餐食分享 → 日常动态（`post_type=meal`）；心情 → 首页

## 验收

对照 PRD §28 验收清单，按 §23 的 P0 优先级推进。
