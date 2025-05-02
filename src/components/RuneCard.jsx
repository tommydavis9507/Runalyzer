import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ArrowPathIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import config from '../config';

// 请求队列系统
const requestQueue = {
  queue: [],
  inProgress: false,
  delay: 300, // 请求间隔300ms
  
  addRequest: (fn) => {
    return new Promise((resolve, reject) => {
      requestQueue.queue.push({ fn, resolve, reject });
      if (!requestQueue.inProgress) {
        requestQueue.processNext();
      }
    });
  },
  
  processNext: () => {
    if (requestQueue.queue.length === 0) {
      requestQueue.inProgress = false;
      return;
    }
    
    requestQueue.inProgress = true;
    const { fn, resolve, reject } = requestQueue.queue.shift();
    
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        setTimeout(() => {
          requestQueue.processNext();
        }, requestQueue.delay);
      });
  }
};

const RuneCard = ({ symbol, holdings, currency, btcRate, isRateLoading }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [price, setPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef(null);
  
  // 计算实际持仓量（考虑精度）
  const calculateActualAmount = (amount, divisibility) => {
    return amount / Math.pow(10, divisibility);
  };
  
  const totalAmount = holdings.reduce((sum, holding) => 
    sum + calculateActualAmount(Number(holding.amount), holding.divisibility || 0), 0);
  
  // 获取符文价格（带队列、缓存和重试机制）
  useEffect(() => {
    const fetchPrice = async () => {
      // 检查缓存
      const cacheKey = `runePrice-${symbol}`;
      const cachedPrice = localStorage.getItem(cacheKey);
      const priceExpiry = localStorage.getItem(`${cacheKey}-expiry`);
      
      if (cachedPrice && priceExpiry && Date.now() < Number(priceExpiry)) {
        setPrice(Number(cachedPrice));
        return;
      }
      
      // 如果缓存过期，清除相关缓存
      if (cachedPrice || priceExpiry) {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`${cacheKey}-expiry`);
      }
      
      setIsLoading(true);
      
      try {
        const priceData = await requestQueue.addRequest(async () => {
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
            // 使用配置的缓存时间
            localStorage.setItem(cacheKey, data.data.curPrice);
            localStorage.setItem(`${cacheKey}-expiry`, Date.now() + config.runePriceCacheDuration);

            return data.data.curPrice;
          }
          throw new Error(data.message || '获取符文价格失败');
        });
        
        if (priceData) {
          setPrice(priceData);
        }
      } catch (error) {
        console.error('获取符文价格失败:', error);
        setPrice(null);
        
        // 重试机制
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(fetchPrice, 1000);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrice();
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [symbol]);





  // 格式化显示价值
  const formatValue = (amount) => {
    if (currency === 'BTC') {
      return `${(amount * price / 100000000).toFixed(8)} BTC`;
    } else {
      return `${(amount * price / 100000000 * btcRate).toFixed(2)} USDT`;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-4">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">{symbol}</h3>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">总量: {totalAmount.toFixed(4)}</span>
            <span className="text-sm text-green-600">
              {isLoading || isRateLoading ? (
                <div className="flex items-center">
                  <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                  加载中...
                </div>
              ) : price === null ? (
                <span className="text-red-600">价格查询失败</span>
              ) : (
                <div>
                  {`总价值: ${formatValue(totalAmount)}`}
                </div>
              )}
            </span>

          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="space-y-2">
            {holdings.map((holding, index) => (
              <div 
                key={index}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <div className="font-mono text-sm text-gray-600 break-all">
                  {holding.address}
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {/* {calculateActualAmount(holding.amount, holding.divisibility || 0).toFixed( holding.divisibility || 0)} */}
                  {calculateActualAmount(holding.amount, holding.divisibility || 0).toFixed( (holding.divisibility >= 4 ? 4 : holding.divisibility) || 0)}
                  <div className="text-xs text-green-600">
                    {isLoading || isRateLoading ? '加载中...' : price === null ? (
                      <span className="text-red-600">查询失败</span>
                    ) : (
                      formatValue(calculateActualAmount(holding.amount, holding.divisibility || 0))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RuneCard;