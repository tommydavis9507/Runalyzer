import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { ArrowPathIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  const cacheExpiry = localStorage.getItem(`${cacheKey}-expiry`);
  
  if (cachedData && cacheExpiry && Date.now() < Number(cacheExpiry)) {
    console.log('使用缓存的符文资产数据');
    return JSON.parse(cachedData);
  }
  console.log('获取符文资产数据');

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
  localStorage.setItem(`${cacheKey}-expiry`, Date.now() + config.runeAssetCacheDuration);
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
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [sortedRunes, setSortedRunes] = useState([]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['runeData', addresses],
    queryFn: () => fetchRuneData(addresses),
    enabled: addresses.length > 0,
    staleTime: config.runeAssetCacheDuration,
    cacheTime: config.runeAssetCacheDuration,
    refetchOnMount: true
  })

  // 显示缓存状态
  const [assetCacheTimeLeft, setAssetCacheTimeLeft] = useState(0);
  const [priceCacheTimeLeft, setPriceCacheTimeLeft] = useState(0);

  const processRunes = async () => {
    const runeData = data || initialData;
    if (!runeData) return;

    const processed = await Promise.all(
      runeData.map(async (rune) => {
        const price = await fetchRunePrice(rune.symbol);
        const totalValue = rune.holdings.reduce((sum, holding) => {
          const amount = holding.amount / Math.pow(10, holding.divisibility || 0);
          return sum + amount * (price || 0) / 100000000 * (currency === 'USDT' ? btcRate : 1);
        }, 0);
        return { ...rune, totalValue };
      })
    );
    
    const sorted = [...processed].sort((a, b) => 
      sortOrder === 'desc' ? b.totalValue - a.totalValue : a.totalValue - b.totalValue
    );
    setSortedRunes(sorted);
  };
  
  useEffect(() => {
    if (data) {
      const cacheKey = `runeData-${addresses.join('-')}`;
      const cacheExpiry = localStorage.getItem(`${cacheKey}-expiry`);
      
      const updateAssetCacheTimeLeft = () => {
        if (!cacheExpiry || Date.now() >= Number(cacheExpiry)) {
          setAssetCacheTimeLeft(0);
          return;
        }
        const timeLeft = Math.floor((Number(cacheExpiry) - Date.now()) / 1000);
        setAssetCacheTimeLeft(timeLeft > 0 ? timeLeft : 0);
      };
      
      updateAssetCacheTimeLeft();
      const timer = setInterval(updateAssetCacheTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [data, addresses]);
  
  useEffect(() => {
    const updatePriceCacheTimeLeft = () => {
      const keys = Object.keys(localStorage);
      const priceExpiryKeys = keys.filter(key => key.startsWith('runePrice-') && key.endsWith('-expiry'));
      
      if (priceExpiryKeys.length === 0) {
        setPriceCacheTimeLeft(0);
        return;
      }
      
      const minExpiry = Math.min(...priceExpiryKeys.map(key => Number(localStorage.getItem(key))));
      if (Date.now() >= minExpiry) {
        setPriceCacheTimeLeft(0);
        return;
      }
      
      const timeLeft = Math.floor((minExpiry - Date.now()) / 1000);
      setPriceCacheTimeLeft(timeLeft > 0 ? timeLeft : 0);
    };
    
    updatePriceCacheTimeLeft();
    const timer = setInterval(updatePriceCacheTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    processRunes();
  }, [data, initialData, currency, btcRate, sortOrder])

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

  const handleAddressSubmit = (newAddresses) => {
    // 第一步：更新地址状态
    setAddresses(newAddresses);
    
    // 第二步：如果地址不为空，立即触发数据获取
    if (newAddresses.length > 0) {
      queryClient.invalidateQueries(['runeData', newAddresses]);
    }
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
                    toast.error('获取BTC汇率失败，请检查网络连接后重试');
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
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="p-2 rounded-md hover:bg-gray-200 flex items-center"
              title="切换排序顺序"
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
              <span className="ml-1">{sortOrder === 'desc' ? '降序' : '升序'}</span>
            </button>
            <button 
              onClick={() => {
                // 清除符文价格缓存
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                  if (key.startsWith('runePrice-')) {
                    localStorage.removeItem(key);
                  }
                });
                localStorage.removeItem('runePriceExpiry');
                
                // 重新加载符文数据以更新价格
                processRunes();
                toast.success('符文价格缓存已清除，正在获取最新价格');
              }}
              className="p-2 rounded-md hover:bg-gray-200 flex items-center"
              title="刷新符文价格"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span className="ml-1">刷新价格</span>
            </button>
            <button 
              onClick={() => {
                // 清除所有缓存，除了runeQueryAddresses
                // localStorage.removeItem('runeQueryAddresses');
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
                toast.success('缓存已清除，可以查询最新数据');
              }}
              className="p-2 rounded-md hover:bg-gray-200 flex items-center"
              title="清除缓存"
            >
              清除缓存
            </button>
          </div>
        </div>

        <AddressInput onAddressSubmit={handleAddressSubmit} />

        {(assetCacheTimeLeft > 0 || priceCacheTimeLeft > 0) && (
          <div className="text-center mb-4">
            {assetCacheTimeLeft > 0 && (
              <p className="text-sm text-gray-500">使用缓存的符文资产数据，{assetCacheTimeLeft}秒后更新</p>
            )}
            {priceCacheTimeLeft > 0 && (
              <p className="text-sm text-gray-500">使用缓存的符文价格数据，{priceCacheTimeLeft}秒后更新</p>
            )}
          </div>
        )}

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

        {sortedRunes.length > 0 && (
          <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedRunes.map((rune, index) => (
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
      <ToastContainer 
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </QueryClientProvider>
  )
}

export default App
