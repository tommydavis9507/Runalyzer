import { useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import AddressInput from './components/AddressInput'
import RuneCard from './components/RuneCard'

// 创建 QueryClient 实例
const queryClient = new QueryClient()

import config from './config';

// 调用UniSat API获取符文数据
const fetchRuneData = async (addresses) => {
  // 检查缓存
  const cacheKey = `runeData-${addresses.join('-')}`;
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    // return JSON.parse(cachedData);
  }

  // 速率控制 - 确保不超过5次/秒
  const delay = 200; // 200ms间隔 = 5次/秒
  const responses = [];
  
  for (const address of addresses) {
    const response = await fetch(`https://open-api.unisat.io/v1/indexer/address/${address}/runes/balance-list`, {
      headers: {
        'Authorization': `Bearer ${config.unisatApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    responses.push(response);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  const data = await Promise.all(responses.map(res => res.json()));
  
  // 转换API响应格式以匹配组件结构
  const runeMap = new Map();
  
  data.forEach((res, index) => {
    if (res.code === 0 && res.data?.detail) {
      res.data.detail.forEach(rune => {
        if (!runeMap.has(rune.spacedRune)) {
          runeMap.set(rune.spacedRune, {
            symbol: rune.spacedRune,
            divisibility: rune.divisibility,
            holdings: []
          });
        }
        runeMap.get(rune.spacedRune).holdings.push({
          address: addresses[index],
          amount: rune.amount,
          divisibility: rune.divisibility
        });
      });
    }
  });
  
  const result = Array.from(runeMap.values());
  // 保存到缓存
  localStorage.setItem(cacheKey, JSON.stringify(result));
  return result;
}

// 获取符文价格
const fetchRunePrice = async (symbol) => {
  const cacheKey = `runePrice-${symbol}`;
  const cachedPrice = localStorage.getItem(cacheKey);
  if (cachedPrice) {
    return JSON.parse(cachedPrice);
  }

  try {
    const response = await fetch('https://open-api.unisat.io/v3/market/runes/auction/runes_types_specified', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.unisatApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        timeType: 'day1',
        tick: symbol
      })
    });

    const data = await response.json();
    if (data.code === 0) {
      const price = data.data.curPrice; // 单位是sat
      localStorage.setItem(cacheKey, JSON.stringify(price));
      return price;
    }
    return 0;
  } catch (error) {
    console.error('获取符文价格失败:', error);
    return 0;
  }
}

function RuneAssetViewer() {
  const [addresses, setAddresses] = useState([])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['runeData', addresses],
    queryFn: () => fetchRuneData(addresses),
    enabled: addresses.length > 0,
    staleTime: 30000 // 30秒内不重新请求
  })

  const handleAddressSubmit = (newAddresses) => {
    setAddresses(newAddresses)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">符文资产查询工具</h1>
          <p className="mt-2 text-gray-600">输入比特币地址，快速查看符文持仓分布</p>
        </div>

        <AddressInput onAddressSubmit={handleAddressSubmit} />

        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">正在查询符文资产...</p>
          </div>
        )}

        {isError && (
          <div className="bg-red-50 p-4 rounded-md my-4">
            <p className="text-red-700">
              查询出错: {error?.message || '请稍后重试'}
            </p>
          </div>
        )}

        {data && (
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((rune, index) => (
                <RuneCard
                  key={index}
                  symbol={rune.symbol}
                  holdings={rune.holdings}
                  divisibility={rune.divisibility}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RuneAssetViewer />
    </QueryClientProvider>
  )
}

export default App
