  // ===== 历史记录页面 =====
Page({
  // ===== 页面数据 =====
  data: {
    pageTitle: '历史记录',
    historyList: [] as any[], // 原始历史记录列表
    groupedHistory: [] as any[], // 按日期分组后的历史记录
    showDeleteModal: false, // 删除确认弹窗
  },

  // ===== 生命周期 =====
  // 页面加载时触发
  onLoad() {
    this.loadHistoryData();
  },

  // 页面显示时触发
  onShow() {
    this.loadHistoryData();
  },

  // ===== 数据加载 =====
  /**
   * 加载历史记录
   * 读取本地存储并按日期分组
   */
  loadHistoryData() {
    const historyData = wx.getStorageSync('RecommendHistory') || [];
    const grouped = this.groupByDate(historyData);
    this.setData({
      historyList: historyData,
      groupedHistory: grouped,
    });
  },

  // ===== 数据处理 =====
  /**
   * 按日期分组历史记录
   * 分组：今天、昨天、前天、更早
   *
   * @param {any[]} historyData - 原始历史记录数组
   * @returns {any[]} 分组后的数据
   */
  groupByDate(historyData: any[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const dayBeforeYesterday = new Date(
      today.getTime() - 2 * 24 * 60 * 60 * 1000,
    );

    // 初始化分组
    const groups: any = {
      today: { label: '刚刚', items: [] },
      yesterday: { label: '昨天', items: [] },
      dayBeforeYesterday: { label: '前天', items: [] },
      older: { label: '', items: [] },
    };

    // 遍历每条记录，判断属于哪个分组
    historyData.forEach((item: any) => {
      const timestamp = item.createTime || Date.now();
      const date = new Date(timestamp);
      const targetDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );

      // 格式化时间为 "14:30"
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      // 格式化记录项
      const formattedItem = {
        ...item,
        name: item.dishName,
        time: timeStr,
        imageUrl: this.getDishImageForHistory(item.dishName, item.emoji),
      };

      // 判断日期分组
      if (targetDate.getTime() === today.getTime()) {
        groups.today.items.push(formattedItem);
      } else if (targetDate.getTime() === yesterday.getTime()) {
        groups.yesterday.items.push(formattedItem);
      } else if (targetDate.getTime() === dayBeforeYesterday.getTime()) {
        groups.dayBeforeYesterday.items.push(formattedItem);
      } else {
        // 更早的记录，标记具体日期
        const month = (date.getMonth() + 1).toString();
        const day = date.getDate().toString();
        groups.older.label = `${month}月${day}日`;
        groups.older.items.push(formattedItem);
      }
    });

    // 只返回有数据的分组
    const result: { label: string; items: any[] }[] = [];
    if (groups.today.items.length > 0) {
      result.push({ label: '刚刚', items: groups.today.items });
    }
    if (groups.yesterday.items.length > 0) {
      result.push({ label: '昨天', items: groups.yesterday.items });
    }
    if (groups.dayBeforeYesterday.items.length > 0) {
      result.push({ label: '前天', items: groups.dayBeforeYesterday.items });
    }
    if (groups.older.items.length > 0) {
      result.push({ label: groups.older.label, items: groups.older.items });
    }

    return result;
  },

  /**
   * 获取历史记录中的图片
   */
  getDishImageForHistory(dishName: string, savedEmoji: string): string {
    if (
      savedEmoji &&
      (savedEmoji.startsWith('http') || savedEmoji.startsWith('https'))
    ) {
      return savedEmoji;
    }
    return '';
  },

  // ===== 删除操作 =====
  /**
   * 点击删除按钮
   */
  onDeleteTap() {
    if (this.data.historyList.length === 0) return;
    this.setData({ showDeleteModal: true });
  },

  /**
   * 取消删除
   */
  onCancelDeleteTap() {
    this.setData({ showDeleteModal: false });
  },

  /**
   * 确认删除
   * 清空所有历史记录
   */
  onConfirmDeleteTap() {
    wx.setStorageSync('RecommendHistory', []); // 清空本地存储
    this.setData({
      showDeleteModal: false,
      historyList: [],
      groupedHistory: [],
    });
  },
});
