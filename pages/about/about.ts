// ===== 关于页面 - 常见问题与反馈 =====
Page({
  // ===== 页面数据 =====
  data: {
    pageTitle: '关于',
    currentIndex: -1, // 当前展开的FAQ索引
    faqList: [
      {
        question: 'AI推荐是如何工作的？',
        answer: 'AI会综合考虑多个因素：当前时间（早餐、午餐、晚餐）、您的历史选择偏好、菜品特色标签等，从数据库中选择最适合的菜品推荐给您。'
      },
      {
        question: '如何提高推荐的准确性？',
        answer: '多使用应用，让AI了解您的偏好选择。每次推荐后点击"就这个"或"下一个"，系统会学习您的喜好，推荐会越来越精准。'
      },
      {
        question: '上传的菜单信息安全吗？',
        answer: '所有数据都存储在您的本地设备上，不会上传到服务器。您的个人信息和菜单数据都是安全的。'
      },
      {
        question: '如何删除历史记录？',
        answer: '在历史记录页面，点击右上角的删除图标即可清空所有历史记录。请注意，此操作无法撤销。'
      },
      {
        question: '支持哪些类型的菜品？',
        answer: '目前支持中式、西式、日式、韩式、泰式等多种菜系，涵盖主食、小吃、甜点等各类美食。我们会持续扩充菜品数据库。'
      }
    ]
  },

  // ===== 生命周期 =====
  onLoad() {
  },

  // ===== FAQ交互 =====
  onFaqTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentIndex: this.data.currentIndex === index ? -1 : index,
    });
  },
});
