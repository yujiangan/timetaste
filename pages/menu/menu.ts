// 菜单管理页面 - 上传菜单图片并识别菜品
Page({
  // 页面数据
  data: {
    pageTitle: '菜单管理',
    menuList: [] as any[],                // 已保存的菜单列表
    showLoading: false,                   // 识别中显示加载
    showResult: false,                    // 显示识别结果
    showPermissionModal: false,           // 权限申请弹窗
    showErrorModal: false,                // 错误弹窗
    showSuccessToast: false,              // 成功提示
    tempImagePath: '',                    // 临时图片路径（识别前）
    resultData: {                         // 识别结果
      restaurantName: '',
      type: 'menu',
      dishes: [] as { name: string }[]
    },
    errorMessage: '',                     // 错误信息
  },

  // 页面加载时触发
  onLoad() {
    this.loadMenuList();
  },

  // 页面显示时触发
  onShow() {
    this.loadMenuList();
  },

  // 加载菜单列表
  loadMenuList() {
    const menuData = wx.getStorageSync('SavedMenuList') || [];
    const formattedData = menuData.map((item: any) => {
      const dishNames = Array.isArray(item.dishNames) ? item.dishNames : [];
      const displayDishes = dishNames.length > 3 
        ? dishNames.slice(0, 3).join(' ') + '...'
        : dishNames.join(' ');
      
      return {
        ...item,
        dishNames: dishNames,
        dishCount: dishNames.length,
        dishDisplay: displayDishes,
        restaurantName: item.restaurantName || '未识别到菜馆',
        menuImage: item.menuImage || ''
      };
    });
    this.setData({ menuList: formattedData });
  },

  // 图片加载失败时触发
  onImageError(e: WechatMiniprogram.ImageError) {
    const index = e.currentTarget.dataset.index;
    if (index !== undefined) {
      const menuList = [...this.data.menuList];
      menuList[index].menuImage = '';
      this.setData({ menuList });
    }
  },

  // 点击上传菜单按钮
  onUploadTap() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum'] || res.authSetting['scope.camera']) {
          this.chooseImageFile();
        } else {
          this.requestPermission();
        }
      },
      fail: () => {
        this.requestPermission();
      }
    });
  },

  // 请求相册权限
  requestPermission() {
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => {
        this.chooseImageFile();
      },
      fail: () => {
        this.setData({ showPermissionModal: true });
      }
    });
  },

  // 选择图片
  chooseImageFile() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.checkImage(tempPath);
      }
    });
  },

  // 检查图片大小
  checkImage(imagePath: string) {
    const fs = wx.getFileSystemManager();
    fs.getFileInfo({
      filePath: imagePath,
      success: (res) => {
        const size = res.size;
        // 如果图片大于 500KB，先压缩
        if (size > 500 * 1024) {
          this.compressImage(imagePath);
        } else {
          this.processImage(imagePath);
        }
      },
      fail: () => {
        this.processImage(imagePath);
      }
    });
  },

  // 压缩图片
  compressImage(imagePath: string) {
    wx.compressImage({
      src: imagePath,
      quality: 70,
      success: (res) => {
        this.checkImage(res.tempFilePath);
      },
      fail: () => {
        // 压缩失败也尝试处理原图
        this.processImage(imagePath);
      }
    });
  },

  // 图片转Base64
  async imageToBase64(imagePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      // 是用的小程序的wx.getFileSystemManager()方法读取图片文件
      fs.readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          const base64Str = `data:image/png;base64,${res.data}`;
          resolve(base64Str);
        },
        fail: (err) => {
          reject(new Error(`转Base64失败：${err.errMsg}`));
        }
      });
    });
  },

  // 处理图片（开始AI识别流程）
  processImage(imagePath: string) {
    this.setData({
      tempImagePath: imagePath,
      showLoading: true
    });

    this.callAIRecognition(imagePath);
  },

  // 调用AI识别菜单图片
  async callAIRecognition(imagePath: string) {
    try {
      const base64Image = await this.imageToBase64(imagePath);
      
      const api = require('../../utils/api.js');
      const result = await api.menuRecognition(base64Image);
      
      if (!result) {
        this.setData({
          showLoading: false,
          showErrorModal: true,
          errorMessage: '未识别到菜品，请重新上传更清晰的图片'
        });
        return;
      }

      let mockResult;
      
      if (result.type === 'dish') {
        // 单一菜品
        mockResult = {
          restaurantName: '未识别到菜馆',
          type: 'dish',
          dishes: [{ name: result.singleDishName || '未知菜品' }]
        };
      } else {
        // 菜单
        if (!result.menuItems || result.menuItems.length === 0) {
          this.setData({
            showLoading: false,
            showErrorModal: true,
            errorMessage: '未识别到菜品，请重新上传更清晰的图片'
          });
          return;
        }
        
        mockResult = {
          restaurantName: result.restaurantName || '未识别到菜馆',
          type: 'menu',
          dishes: result.menuItems.map((item: any) => ({ name: typeof item === 'string' ? item : item.name }))
        };
      }

      this.setData({
        showLoading: false,
        showResult: true,
        resultData: mockResult
      });
    } catch (error: any) {
      console.error('AI识别失败:', error);
      this.setData({
        showLoading: false,
        showErrorModal: true,
        errorMessage: error.message || '识别失败，请重试'
      });
    }
  },

  // 重新上传图片
  onReUploadTap() {
    this.setData({
      showResult: false,
      tempImagePath: ''
    });
    this.chooseImageFile();
  },

  // 确认保存菜单
  onConfirmSaveTap() {
    if (!this.data.resultData || !this.data.resultData.dishes || this.data.resultData.dishes.length === 0) {
      this.setData({
        showErrorModal: true,
        errorMessage: '没有识别到菜品，请重新上传图片'
      });
      return;
    }
    // 提取菜品名称
    const dishNames = this.data.resultData.dishes.map((dish: any) => dish.name || dish);
    // 构建菜单对象
    const newMenu = {
      id: `menu_${Date.now()}_001`,
      restaurantName: this.data.resultData.restaurantName || '未识别到菜馆',
      dishNames: dishNames,
      type: this.data.resultData.type || 'menu',
      savedTime: Date.now(),
      menuImage: this.data.tempImagePath
    };
    // 保存菜单到本地存储
    const menuList = wx.getStorageSync('SavedMenuList') || [];
    const newMenuList = [newMenu, ...menuList];
    wx.setStorageSync('SavedMenuList', newMenuList);
    // 更新页面数据
    this.setData({
      showResult: false,
      showSuccessToast: true,
      menuList: newMenuList
    });

    this.loadMenuList();
    // 3秒后关闭成功提示
    setTimeout(() => {
      this.setData({ showSuccessToast: false });
    }, 3000);
  },

  // 删除菜单
  onDeleteMenu(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id;
    const menuList = wx.getStorageSync('SavedMenuList') || [];
    const newMenuList = menuList.filter((item: any) => item.id !== id);
    wx.setStorageSync('SavedMenuList', newMenuList);
    this.setData({ menuList: newMenuList });
  },

  // 拒绝权限
  onCancelPermissionTap() {
    this.setData({ showPermissionModal: false });
  },

  // 打开系统设置
  onGoSettingsTap() {
    this.setData({ showPermissionModal: false });
    wx.openSetting();
  },

  // 关闭错误弹窗
  onCloseErrorTap() {
    this.setData({ showErrorModal: false });
  },

  // 重试上传
  onRetryTap() {
    this.setData({ showErrorModal: false });
    this.chooseImageFile();
  },

  // 格式化时间显示
  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (targetDate.getTime() === today.getTime()) {
      return '今天';
    } else if (targetDate.getTime() === yesterday.getTime()) {
      return '昨天';
    } else {
      const month = (date.getMonth() + 1).toString();
      const day = date.getDate().toString();
      return `${month}月${day}日`;
    }
  }
});
