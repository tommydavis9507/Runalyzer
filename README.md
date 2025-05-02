# 符文资产查询工具

一个基于React的Web应用，用于查询比特币地址的符文资产分布情况。

## 功能特性

- 支持输入多个比特币地址查询符文资产
- 自动验证比特币地址格式（支持bech32、segwit和legacy格式）
- 显示符文资产总量和总价值（支持BTC和USDT计价）
- 资产按价值排序（升序/降序）
- 智能缓存机制减少API调用
- 响应式设计，适配各种设备

## 安装指南

1. 克隆仓库
```bash
git clone <仓库地址>
```

2. 安装依赖
```bash
npm install
```

3. 配置API密钥
复制`config.example.js`为`config.js`并填写UniSat API密钥

## 使用方法

1. 启动开发服务器
```bash
npm run dev
```

2. 在浏览器中访问`http://localhost:5174`

3. 输入比特币地址（每行一个）并点击查询

## 技术栈

- React
- Tailwind CSS
- @tanstack/react-query
- UniSat API

## 许可证

MIT
