import { useState, useEffect } from 'react'
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
  const [currency, setCurrency] = useState('BTC'); // 'BTC' or 'USDT'
  const [btcRate, setBtcRate] = useState(0);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [initialData, setInitialData] = useState(null);

  // 加载缓存的符文数据
  useEffect(() => {
    const cachedAddresses = localStorage.getItem('runeQueryAddresses');
    if (cachedAddresses) {
      const addressList = cachedAddresses.split('\n').filter(addr => addr.length > 0);
      if (addressList.length > 0) {
        const cacheKey = `runeData-${addressList.join('-')}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          setInitialData(JSON.parse(cachedData));
        }
      }
    }
  }, []);

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
        <div className="text-center mb-8 relative">
          <h1 className="text-3xl font-bold text-gray-900">符文资产查询工具</h1>
          <p className="mt-2 text-gray-600">输入比特币地址，快速查看符文持仓分布</p>
          <div className="absolute top-0 right-0 flex space-x-2">
            <button 
              onClick={() => {
                setIsRateLoading(true);
                fetch('/api/gateio/spot/tickers?currency_pair=BTC_USDT')
                  .then(res => {
                    if (!res.ok) {
                      throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                  })
                  .then(data => {
                    if (data && data.length > 0) {
                      setBtcRate(Number(data[0].last));
                      setCurrency(currency === 'BTC' ? 'USDT' : 'BTC');
                    } else {
                      throw new Error('Invalid API response format');
                    }
                    setIsRateLoading(false);
                  })
                  .catch(error => {
                    console.error('获取BTC汇率失败:', error);
                    setIsRateLoading(false);
                    alert('获取BTC汇率失败，请检查网络连接后重试');
                  });
              }}
              className="p-2 rounded-md hover:bg-gray-200 flex items-center"
              title="切换计价单位"
            >
              {isRateLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <span>{currency === 'BTC' ? 'USDT' : 'BTC'}</span>
              )}
            </button>
            <button 
              onClick={() => {
                // 清除所有缓存
                localStorage.removeItem('runeQueryAddresses');
                localStorage.removeItem('runePriceExpiry');
                
                // 清除符文数据缓存
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                  if (key.startsWith('runeData-') || key.startsWith('runePrice-')) {
                    localStorage.removeItem(key);
                  }
                });
                
                // 重置状态
                setInitialData(null);
                setAddresses([]);
                alert('缓存已清除，可以查询最新数据');
              }}
              className="p-2 rounded-md hover:bg-gray-200 flex items-center"
              title="清除缓存"
            >
              清除缓存
            </button>
          </div>
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

        {(data || initialData) && (
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(data || initialData).map((rune, index) => (
                <RuneCard
                  key={index}
                  symbol={rune.symbol}
                  holdings={rune.holdings}
                  divisibility={rune.divisibility}
                  currency={currency}
                  btcRate={btcRate}
                  isRateLoading={isRateLoading}
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
