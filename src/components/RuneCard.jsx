import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import config from '../config';

const RuneCard = ({ symbol, holdings }) => {
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
  
  // 获取符文价格（带防抖和速率控制）
  useEffect(() => {
    const fetchPrice = async () => {
      setIsLoading(true);
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
          setPrice(data.data.curPrice); // 单位是sat
        }
      } catch (error) {
        console.error('获取符文价格失败:', error);
        setPrice(null); // 设置为null表示查询失败
      } finally {
        setIsLoading(false);
      }
    };
    
    // 防抖和速率控制API请求（确保不超过5次/秒）
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(fetchPrice, 200); // 200ms间隔确保不超过5次/秒
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [symbol]);

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
              {isLoading ? (
                <div className="flex items-center">
                  <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                  加载中...
                </div>
              ) : price === null ? (
                <span className="text-red-600">价格查询失败</span>
              ) : (
                `总价值: ${(totalAmount * price / 100000000).toFixed(8)} BTC`
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
                    {isLoading ? '加载中...' : price === null ? (
                      <span className="text-red-600">查询失败</span>
                    ) : (
                      `${(calculateActualAmount(holding.amount, holding.divisibility || 0) * price / 100000000).toFixed(8)} BTC`
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