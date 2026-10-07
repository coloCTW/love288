/* 底部弹层：提醒设置 / 评论 / 编辑约会 / 改昵称 共用 */
Component({
  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
    sub: { type: String, value: '' }
  },
  methods: {
    noop() {},
    onMask() {
      this.triggerEvent('close');
    }
  }
});
