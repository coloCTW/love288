Component({
  data: {
    selected: 0,
    color: "#75675c",
    selectedColor: "#ee9a83",
    list: [
      {
        "pagePath": "/pages/home/home",
        "text": "首页",
        "iconPath": "../assets/tab/home.png",
        "selectedIconPath": "../assets/tab/active.png"
      },
      {
        "pagePath": "/pages/eat/eat",
        "text": "好好吃饭",
        "iconPath": "../assets/tab/eat.png",
        "selectedIconPath": "../assets/tab/active.png"
      },
      {
        "pagePath": "/pages/daily/daily",
        "text": "日常",
        "iconPath": "../assets/tab/daily.png",
        "selectedIconPath": "../assets/tab/active.png"
      },
      {
        "pagePath": "/pages/plan/plan",
        "text": "计划",
        "iconPath": "../assets/tab/plan.png",
        "selectedIconPath": "../assets/tab/active.png"
      }
    ]
  },
  attached() {
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path

      console.log(data,url)
      wx.switchTab({url})
      // this.setData({
      //   selected: data.index
      // })
      //switchTab 里的 setData 和 onShow 的 setData 交替执行,如果 switchTab 里先改了 selected，但跳转还没完成，旧页面的 onShow 又触发了一次（某些情况下会），就会出现短暂的“别的图标也 active 一下”。
    }
  }
})