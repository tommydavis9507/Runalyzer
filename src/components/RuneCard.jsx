import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

const RuneCard = ({ symbol, holdings }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // 计算总持仓量
  const totalAmount = holdings.reduce((sum, holding) => sum + Number(holding.amount), 0);

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-4">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">{symbol}</h3>
          <span className="text-sm text-gray-500">总量: {totalAmount}</span>
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
                  {holding.amount}
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