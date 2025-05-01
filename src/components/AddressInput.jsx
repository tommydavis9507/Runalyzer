import React, { useState } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const AddressInput = ({ onAddressSubmit }) => {
  const [addresses, setAddresses] = useState(() => {
    // 从localStorage读取缓存的地址
    const cached = localStorage.getItem('runeQueryAddresses');
    return cached ? cached : '';
  });
  const [error, setError] = useState('');

  // 比特币地址格式验证
  const validateBitcoinAddress = (address) => {
    // 支持的地址格式正则
    const patterns = {
      bech32: /^(bc1)[a-zA-HJ-NP-Z0-9]{14,74}$/,
      segwit: /^(3)[a-km-zA-HJ-NP-Z1-9]{24,34}$/,
      legacy: /^(1)[a-km-zA-HJ-NP-Z1-9]{25,34}$/
    };

    return (
      patterns.bech32.test(address) ||
      patterns.segwit.test(address) ||
      patterns.legacy.test(address)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // 分割并清理地址
    const addressList = addresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);

    // 验证地址
    const invalidAddresses = addressList.filter(
      addr => !validateBitcoinAddress(addr)
    );

    if (invalidAddresses.length > 0) {
      setError(`以下地址格式无效：\n${invalidAddresses.join('\n')}`);
      return;
    }

    // 去重
    const uniqueAddresses = [...new Set(addressList)];
    // 保存到localStorage
    localStorage.setItem('runeQueryAddresses', uniqueAddresses.join('\n'));
    onAddressSubmit(uniqueAddresses);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="addresses"
            className="block text-sm font-medium text-gray-700"
          >
            输入比特币地址（每行一个）
          </label>
          <div className="mt-1">
            <textarea
              id="addresses"
              name="addresses"
              rows={4}
              className="shadow-sm block w-full sm:text-sm border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="bc1...
3...
1..."
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon
                  className="h-5 w-5 text-red-400"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">地址验证错误</h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            查询符文资产
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddressInput;