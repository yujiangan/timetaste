/**
 * 埋点上报工具
 * 使用微信小程序自带的 wx.reportEvent API
 * 无需服务器，在微信公众平台后台即可查看数据
 */

const EventTypes = {
  // 首页
  HOME_SHAKE: 'home_shake',           // 摇一摇
  HOME_NEXT: 'home_next',             // 换一换
  HOME_ADOPT: 'home_adopt',           // 就这个（采纳推荐）
  HOME_ERROR: 'home_error',           // 推荐失败

  // 菜单页
  MENU_UPLOAD: 'menu_upload',         // 上传菜单
  MENU_RECOGNIZE: 'menu_recognize',  // 识别菜单
  MENU_SAVE: 'menu_save',            // 保存菜单

  // 历史记录
  HISTORY_DELETE: 'history_delete',   // 删除历史

  // 关于页
  ABOUT_FEEDBACK: 'about_feedback',  // 提交反馈
};

/**
 * 埋点上报函数
 * 使用微信小程序自带的 wx.reportEvent API
 * 在微信公众平台后台的"事件分析"中查看
 * 
 * @param {string} event - 事件名称
 * @param {object} params - 事件参数
 */
function track(event, params = {}) {
  if (typeof wx.reportEvent === 'function') {
    wx.reportEvent(event, params);
  }
}

module.exports = {
  track: track,
  EventTypes: EventTypes,
};
