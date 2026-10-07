/* 全局配置：演示模式唯一开关。
   演示模式：未绑定情侣的用户，读/写自动落到演示情侣 couple-demo 数据上；
   正式上线前把 DEMO_MODE 置为 false，未绑定用户将收到 40201 引导绑定。 */
module.exports = {
  DEMO_MODE: true,
  DEMO_COUPLE_ID: 'couple-demo',
  DEMO_LIN: 'demo-lin-openid',
  DEMO_SU: 'demo-su-openid',
  REMIND_LIMIT: 3,
  MOOD_TYPES: ['喜悦', '悲伤', '愤怒', '害怕', '喜欢', '平静', '乐观', '兴奋', '焦虑'],
  INTERACTION_TYPES: ['miss_you', 'hug', 'im_here', 'water', 'wake'],
  INTERACTION_TEXT: {
    miss_you: '想你了',
    hug: '抱抱',
    im_here: '我在哦',
    water: '提醒 TA 喝水',
    wake: '明早叫醒 TA'
  },
  DEFAULT_SETTINGS: { shareCity: true, shareDistance: true, mealNotify: true, dateNotify: true, wake: false },
  SETTING_KEYS: ['shareCity', 'shareDistance', 'mealNotify', 'dateNotify', 'wake'],
  /* 邀请码 30 分钟有效 */
  INVITE_TTL: 30 * 60 * 1000
};
