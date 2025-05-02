// 示例配置文件 - 请复制为config.js并填写真实信息
const config = {
  unisatApiKey: '在此填写您的API密钥',
  rateLimit: {
    perSecond: 5, // 每秒最多5次请求
    perDay: 2000 // 每天最多2000次请求
  },
  runeAssetCacheDuration: 30 * 60000, // 符文资产数据缓存时间，单位：分钟
  runePriceCacheDuration: 1 * 60000 // 符文价格缓存时间，单位：分钟
};

export default config;