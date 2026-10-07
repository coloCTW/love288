/* 自定义确认弹窗：删动态 / 删约会 / 清空演示数据 / 解除关系 共用 */
Component({
  properties: {
    show: { type: Boolean, value: false },
    ill: { type: String, value: '' },
    title: { type: String, value: '' },
    sub: { type: String, value: '' },
    okText: { type: String, value: '好的' },
    cancelText: { type: String, value: '再想想' },
    danger: { type: Boolean, value: false }
  },
  methods: {
    noop() {},
    onMask() {
      this.triggerEvent('cancel');
    },
    onOk() {
      this.triggerEvent('confirm');
    },
    onCancel() {
      this.triggerEvent('cancel');
    }
  }
});
