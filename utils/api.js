// AI API 配置文件
const API_CONFIG = {
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  imageBaseUrl:
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
  textModel: "qwen-turbo",
  visionModel: "qwen3-vl-plus",
  imageModel: "z-image-turbo",
  timeout: 15000,
  visionTimeout: 30000,
  imageTimeout: 60000,
};

// 美食推荐系统提示词
const SYSTEM_PROMPT = `你是专业的美食推荐助手。根据用户的历史偏好和当前时间以及地理位置，推荐一道合适的菜品。

输出必须是有效的JSON格式，如：
{"dishName":"宫保鸡丁","dishCategory":"川菜, 麻辣, 下饭菜","recommendReason":"考虑到当前午餐和您的川菜偏好，这道宫保鸡丁是完美选择。美味可口，营养美味"}`;

// 菜单识别系统提示词
const MENU_RECOGNITION_TEXT = `你是菜单识别助手。请仔细识别图片中的内容：

识别规则：
1. 如果图片是一张完整的菜单（包含多个菜品名称），则识别为菜单
2. 如果图片是单一菜品的照片（没有菜单格式），则识别为单一菜品

输出JSON格式：
- 菜单：{"type":"menu","restaurantName":"餐厅名","menuItems":["菜品1","菜品2"]}
- 单一菜品：{"type":"dish","singleDishName":"菜品名称"}

注意：
- restaurantName如果无法识别则为空
- singleDishName填写菜品名称
- 不要识别价格，只提取菜品名称
- 必须返回有效的JSON格式，不要有其他文字`;

// 获取菜品图片URL（备用）
function getDishImageUrl(dishName) {
  return "";
}
// 构建美食推荐上下文（整合用户信息供AI参考）
function buildFoodRecommendContext() {
  const historyData = wx.getStorageSync("RecommendHistory") || [];
  const menuData = wx.getStorageSync("SavedMenuList") || [];
  // 1. 判断当前时间段
  const hour = new Date().getHours();
  let timePeriod = "夜宵";
  if (hour >= 5 && hour < 9) timePeriod = "早餐";
  else if (hour >= 9 && hour < 14) timePeriod = "午餐";
  else if (hour >= 14 && hour < 17) timePeriod = "下午茶";
  else if (hour >= 17 && hour < 21) timePeriod = "晚餐";
  // 2. 获取位置信息
  let locationStatus = "未获取地理位置";
  const location = wx.getStorageSync("userLocation");
  if (location) {
    locationStatus = "已获取地理位置";
  }
  // 3. 用户偏好分析（取最近5条）
  const preferenceText =
    historyData.length > 0
      ? historyData
          .slice(0, 5)
          .map((item, index) => {
            const date = new Date(item.createTime);
            const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
            const action = item.status === "adopted" ? "选择了" : "排除了";
            return `${dateStr}${action}${item.dishName}（${(item.tags || []).join("、")}）`;
          })
          .join("； ")
      : "无历史偏好";
  // 4. 菜单信息
  const menuText =
    menuData.length > 0
      ? menuData
          .map((menu, index) => {
            return `${index + 1}. 餐厅名：${menu.restaurantName}，菜品列表：${(menu.dishNames || []).join("、")}`;
          })
          .join("； ")
      : "无上传菜单";

  return `当前时间：${timePeriod}，${locationStatus}，用户历史偏好： ${preferenceText}； 已上传菜单列表： ${menuText}`;
}

/**
 * 通用AI API调用函数
 *
 * @param {string} model - 使用的模型名称（如 qwen-turbo, qwen3-vl-plus）
 * @param {string} prompt - 系统提示词（设定AI的身份和任务）
 * @param {string} userContent - 用户输入的内容
 * @param {boolean} isVision - 是否是视觉模式（用于图片识别）
 * @param {string|null} imageBase64 - 图片的base64编码（视觉模式必需）
 * @returns {Promise} 返回Promise，成功时resolve AI解析后的JSON结果
 */
function callAI(
  model,
  prompt,
  userContent,
  isVision = false,
  imageBase64 = null,
) {
  const app = getApp();

  let messages = [];

  if (isVision && imageBase64) {
    messages = [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageBase64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ];
  } else {
    messages = [
      { role: "system", content: prompt },
      { role: "user", content: userContent },
    ];
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: API_CONFIG.baseUrl,
      method: "POST",
      header: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${app.globalData.apiKey || ""}`,
      },
      data: {
        model: model,
        messages: messages,
        temperature: isVision ? 0.1 : 0.7,
        stream: false,
      },
      timeout: isVision ? API_CONFIG.visionTimeout : API_CONFIG.timeout,
      success: function (res) {
        // 用过可选链，但是微信小程序真机不支持 ES2020 的可选链 ?. 语法，所以用传统的判断方式
        if (
          res.statusCode === 200 &&
          res.data &&
          res.data.choices &&
          res.data.choices[0]
        ) {
          try {
            let content = res.data.choices[0].message.content;
            content = content
              .replace(/^```json\s*/, "")
              .replace(/```$/, "")
              .trim();
            const result = JSON.parse(content);
            resolve(result);
          } catch (e) {
            // 尝试从响应中提取JSON
            const rawContent = res.data.choices[0].message.content || "";

            // 尝试匹配 JSON 对象
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const result = JSON.parse(jsonMatch[0]);
                resolve(result);
                return;
              } catch (e2) {}
            }

            reject(new Error("AI响应解析失败: " + rawContent));
          }
        } else {
          const errMsg =
            (res.data && res.data.error && res.data.error.message) ||
            "AI调用失败";
          reject(new Error(errMsg));
        }
      },
      fail: function (err) {
        reject(err);
      },
    });
  });
}

// 美食推荐函数 - 调用AI推荐菜品
function foodRecommend() {
  const context = buildFoodRecommendContext();
  return callAI(API_CONFIG.textModel, SYSTEM_PROMPT, context);
}

// 菜单识别函数 - 调用AI识别菜单图片中的菜品
function menuRecognition(imageBase64) {
  return callAI(
    API_CONFIG.visionModel,
    MENU_RECOGNITION_TEXT,
    "",
    true,
    imageBase64,
  );
}

// 菜品图片生成函数 - 调用AI生成菜品图片
function getDishImage(dishName) {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const prompt = `A delicious ${dishName} on a white plate, professional food photography, warm lighting, appetizing, high quality, close-up shot`;

    wx.request({
      url: API_CONFIG.imageBaseUrl,
      method: "POST",
      header: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${app.globalData.apiKey || ""}`,
      },
      data: {
        model: API_CONFIG.imageModel,
        input: { messages: [{ role: "user", content: [{ text: prompt }] }] },
        parameters: {
          size: "1024*1024",
          n: 1,
          prompt_extend: false,
          watermark: false,
        },
      },
      timeout: API_CONFIG.imageTimeout,
      success: (res) => {
        let imageUrl = "";
        if (
          res.data &&
          res.data.output &&
          res.data.output.choices &&
          res.data.output.choices[0] &&
          res.data.output.choices[0].message &&
          res.data.output.choices[0].message.content &&
          res.data.output.choices[0].message.content[0]
        ) {
          imageUrl = res.data.output.choices[0].message.content[0].image || "";
        }
        if (res.statusCode === 200 && imageUrl) {
          resolve({ dishImageUrl: imageUrl });
        } else {
          const errMsg =
            (res.data && (res.data.message || res.data.code)) || "未知错误";
          console.error("图像生成错误:", errMsg);
          resolve({ dishImageUrl: getDishImageUrl(dishName) });
        }
      },
      fail: (err) => {
        console.error("图像生成失败:", err);
        resolve({ dishImageUrl: getDishImageUrl(dishName) });
      },
    });
  });
}

// 构建菜单上下文（用于推荐时参考已保存的菜单）
function buildMenuContext() {
  const menuData = wx.getStorageSync("SavedMenuList") || [];

  const menuText =
    menuData.length > 0
      ? menuData
          .map((menu, index) => {
            return `${index + 1}. 餐厅名：${menu.restaurantName}，菜品列表：${(menu.dishNames || []).join("、")}`;
          })
          .join("； ")
      : "无上传菜单";

  return `已上传菜单列表： ${menuText}`;
}

module.exports = {
  foodRecommend: foodRecommend,
  menuRecognition: menuRecognition,
  getDishImage: getDishImage,
  buildFoodRecommendContext: buildFoodRecommendContext,
  buildMenuContext: buildMenuContext,
};
