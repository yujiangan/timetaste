// 首页 - AI美食推荐页面
Page({
  // 页面数据
  data: {
    pageTitle: '首页',                       // 页面标题
    isAnimating: false,                     // 骰子是否正在动画中（防止重复点击）
    showLoading: false,                     // 是否显示加载动画
    showImageLoading: false,                // 图片加载中状态
    showResult: false,                      // 是否显示推荐结果
    showError: false,                       // 是否显示错误提示
    isCardVisible: true,                    // 结果卡片是否可见
    loadingText: '',                         // 加载动画显示的文字
    resultImage: '',                         // 推荐菜品的图片URL
    resultName: '',                          // 菜品名称
    resultCategory: '',                      // 菜品分类（如川菜、粤菜）
    resultTaste: '',                        // 口味标签（如麻辣、清淡）
    resultReason: '',                       // 推荐理由
    errorTitle: '',                         // 错误标题
    errorDesc: '',                          // 错误描述
    locationAuthorized: false,              // 地理位置是否已授权
    historyList: [],                        // 历史记录列表
    excludeDishes: [] as string[],         // 本次推荐中已出现的菜品（用于换一换时排除）
  },

  // 页面加载时触发
  onLoad() {
    this.loadHistoryData();
  },

  // 页面显示时触发
  onShow() {
    this.loadHistoryData();
  },

  // 图片加载失败时触发
  onImageError() {
    this.setData({ resultImage: '' });
  },

  // 加载历史记录数据
  loadHistoryData() {
    const historyData = wx.getStorageSync('RecommendHistory') || [];
    const formattedData = historyData.map((item: any) => ({
      ...item,
      name: item.dishName,
      time: this.formatTime(item.createTime || Date.now()),
      imageUrl: this.getDishImageForHistory(item.emoji)
    }));
    this.setData({ historyList: formattedData });
  },

  // 获取历史记录中的菜品图片
  getDishImageForHistory(savedEmoji: string): string {
    if (savedEmoji && (savedEmoji.startsWith('http') || savedEmoji.startsWith('https'))) {
      return savedEmoji;
    }
    return '';
  },

  // 格式化时间显示
  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (targetDate.getTime() === today.getTime()) {
      return `${hours}:${minutes}`;
    } else if (targetDate.getTime() === yesterday.getTime()) {
      return '昨天';
    } else {
      const month = (date.getMonth() + 1).toString();
      const day = date.getDate().toString();
      return `${month}月${day}日`;
    }
  },

  // 根据当前时间获取用餐时段
  getCurrentTimePeriod(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return '早餐';
    if (hour >= 9 && hour < 14) return '午餐';
    if (hour >= 17 && hour < 21) return '晚餐';
    return '夜宵';
  },

  // 点击骰子/摇一摇触发推荐
  onDiceTap() {
    if (this.data.isAnimating || this.data.showLoading || this.data.showResult || this.data.showError) return;
    
    // 埋点：摇一摇
    const track = require('../../utils/track.js');
    track.track(track.EventTypes.HOME_SHAKE, {});
    
    this.setData({ isAnimating: true });
    
    this.getLocation();
  },

  // 获取用户地理位置
  getLocation() {
    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        wx.setStorageSync('userLocation', { lat: res.latitude, lng: res.longitude });
        this.setData({ locationAuthorized: true });
        this.startLoadingFlow(true);
      },
      fail: () => {
        this.setData({ locationAuthorized: false });
        this.startLoadingFlow(false);
      }
    });
  },

  // 开始加载动画流程
  startLoadingFlow(locationAuthorized: boolean) {
    this.setData({ showLoading: true });
    
    const hasPreference = this.checkPreference();
    const hasMenu = this.checkMenu();
    
    const finalLoadingText = 'AI 正在思考推荐方案～';
    
    // 第1步：分析时间
    this.setData({ loadingText: '正在分析当前时间...' });
    
    setTimeout(() => {
      // 第2步：获取位置
      if (locationAuthorized) {
        this.setData({ loadingText: '正在获取地理位置...' });
      } else {
        this.setData({ loadingText: '未获取地理位置，忽略地域维度' });
      }
      
      setTimeout(() => {
        // 第3步：读取偏好
        if (hasPreference) {
          this.setData({ loadingText: '正在读取您的偏好...' });
        } else {
          this.setData({ loadingText: '未发现历史偏好，推荐热门菜品' });
        }
        
        setTimeout(() => {
          // 第4步：匹配菜单
          if (hasMenu) {
            this.setData({ loadingText: '正在匹配菜单数据...' });
          } else {
            this.setData({ loadingText: '未上传菜单，使用通用推荐' });
          }
        }, 500);
        
        setTimeout(() => {
          // 第5步：保持最后文案，等AI返回
          // 如果AI已经返回，会自动隐藏loading显示结果
          // 如果AI还在处理，会保持这个文案
          this.setData({ loadingText: finalLoadingText });
        }, 1000);
        
      }, 500);
    }, 500);
    
    // 立即调用AI，和动画并行执行
    this.setData({ excludeDishes: [] });
    this.callAIRecommend([]);
  },

  // 检查是否有历史偏好
  checkPreference(): boolean {
    const historyData = wx.getStorageSync('RecommendHistory') || [];
    return historyData.length > 0;
  },

  // 检查是否上传了菜单
  checkMenu(): boolean {
    const menuData = wx.getStorageSync('SavedMenuList') || [];
    return menuData.length > 0;
  },

  // 调用AI获取美食推荐
  // excludeDishes: 需要排除的菜品数组
  async callAIRecommend(excludeDishes: string[] = []) {
    try {
      const app = getApp() as any;
      const api = require('../../utils/api.js');
      const result = await api.foodRecommend(excludeDishes);
      if (!result || !result.dishName) {
        this.handleError('推荐获取失败', '暂无合适的推荐，请重试');
        return;
      }
      let imageUrl = '';
      try {
        const imageResult = await api.getDishImage(result.dishName);
        imageUrl = imageResult.dishImageUrl || '';
      } catch (err: any) {
        console.error('获取菜品图片失败:', err);
      }
      const tags: string[] = result.dishCategory ? result.dishCategory.split(/[,、/]/) : [];
      const uniqueTags = [...new Set(tags)] as string[];
      this.setData({
        showLoading: false,
        isAnimating: false,
        showResult: true,
        isCardVisible: true,
        resultImage: imageUrl,
        resultName: result.dishName,
        resultCategory: uniqueTags[0] || '',
        resultTaste: uniqueTags[1] || '',
        resultReason: result.recommendReason || '',
      });
    } catch (error: any) {
      this.handleError('推荐获取失败', error.message || '网络异常，请重试');
    }
  },

  // 处理错误显示
  handleError(title: string, desc: string) {
    // 埋点：推荐失败
    const track = require('../../utils/track.js');
    track.track(track.EventTypes.HOME_ERROR, {
      errorTitle: title,
      errorDesc: desc
    });

    this.setData({
      showLoading: false,
      isAnimating: false,
      showError: true,
      errorTitle: title,
      errorDesc: desc,
    });
  },

  // 确认推荐结果
  onConfirmTap() {
    // 埋点：就这个（采纳推荐）
    const track = require('../../utils/track.js');
    track.track(track.EventTypes.HOME_ADOPT, {
      dishName: this.data.resultName,
      category: this.data.resultCategory,
      taste: this.data.resultTaste
    });

    const historyData = wx.getStorageSync('RecommendHistory') || [];
    const newHistory = {
      id: `reco_${Date.now()}_001`,
      dishName: this.data.resultName,
      emoji: this.data.resultImage,
      tags: [this.data.resultCategory, this.data.resultTaste].filter(Boolean),
      status: 'adopted' as const,
      createTime: Date.now()
    };
    historyData.unshift(newHistory);
    wx.setStorageSync('RecommendHistory', historyData);
    
    this.loadHistoryData();
    
    this.setData({ 
      showResult: false,
      isCardVisible: false 
    });
    
    wx.showToast({
      title: '已确认',
      icon: 'success',
    });
  },

  // 换一个推荐
  onNextTap() {
    if (this.data.isAnimating || this.data.showLoading) {
      return;
    }

    // 埋点：换一换
    const track = require('../../utils/track.js');
    track.track(track.EventTypes.HOME_NEXT, {
      skippedDish: this.data.resultName
    });

    const historyData = wx.getStorageSync('RecommendHistory') || [];
    const newHistory = {
      id: `reco_${Date.now()}_001`,
      dishName: this.data.resultName,
      emoji: this.data.resultImage,
      tags: [this.data.resultCategory, this.data.resultTaste].filter(Boolean),
      status: 'skipped' as const,
      createTime: Date.now()
    };
    historyData.unshift(newHistory);
    wx.setStorageSync('RecommendHistory', historyData);
    
    this.loadHistoryData();
    
    const newExcludeDishes = [...this.data.excludeDishes, this.data.resultName];
    this.setData({ 
      isCardVisible: false,
      showResult: false,
      excludeDishes: newExcludeDishes
    });
    
    setTimeout(() => {
      this.setData({ showLoading: true });
      this.callAIRecommend(newExcludeDishes);
    }, 350);
  },

  // 重试推荐
  onRetryTap() {
    this.setData({ showError: false });
    this.onDiceTap();
  },
});
