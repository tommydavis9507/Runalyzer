// 配置文件 - 请勿提交到版本控制
const config = {
  unisatApiKey: '92f3756c67c4fa5b43bb9f84bcd52e89237b1fcc589904656aa093c2cd84cb70',
  rateLimit: {
    perSecond: 5, // 每秒最多5次请求
    perDay: 2000 // 每天最多2000次请求
  },
  runeAssetCacheDuration: 60 * 60000, // 符文资产数据缓存时间，单位：分钟
  runePriceCacheDuration: 60 * 60000 // 符文价格缓存时间，单位：分钟
};

export default config;