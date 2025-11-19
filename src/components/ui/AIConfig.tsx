'use client';

import { useState, useEffect } from 'react';

interface AIConfigProps {
  onConfigUpdate?: (config: { apiKey: string; baseUrl: string }) => void;
}

export default function AIConfig({ onConfigUpdate }: AIConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // 从环境变量或localStorage加载配置
    const savedApiKey = localStorage.getItem('ai_api_key') || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    const savedBaseUrl = localStorage.getItem('ai_base_url') || process.env.NEXT_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1';
    
    setApiKey(savedApiKey);
    setBaseUrl(savedBaseUrl);
  }, []);

  const saveConfig = () => {
    localStorage.setItem('ai_api_key', apiKey);
    localStorage.setItem('ai_base_url', baseUrl);
    
    if (onConfigUpdate) {
      onConfigUpdate({ apiKey, baseUrl });
    }
    
    alert('配置已保存');
  };

  const testConnection = async () => {
    if (!apiKey) {
      setErrorMessage('请先输入API密钥');
      setTestStatus('error');
      return;
    }

    setTestStatus('testing');
    setErrorMessage('');

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message.'
            }
          ],
          max_tokens: 10
        })
      });

      if (response.ok) {
        setTestStatus('success');
      } else {
        const errorData = await response.json();
        setErrorMessage(`API测试失败: ${response.status} ${errorData.error?.message || response.statusText}`);
        setTestStatus('error');
      }
    } catch (error: unknown) {
      setErrorMessage(`连接测试失败: ${error instanceof Error ? error.message : String(error)}`);
      setTestStatus('error');
    }
  };

  const resetToDefaults = () => {
    setApiKey('');
    setBaseUrl('https://api.openai.com/v1');
    setTestStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-black border border-white text-white font-mono">
      <h2 className="text-xl mb-6 uppercase tracking-widest">AI配置管理</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm mb-2 text-gray-300">
            OpenAI API密钥
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full p-3 bg-black border border-white text-white text-sm font-mono focus:outline-none focus:border-green-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            用于AI艺术评论生成的OpenAI API密钥
          </p>
        </div>

        <div>
          <label className="block text-sm mb-2 text-gray-300">
            API基础URL
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full p-3 bg-black border border-white text-white text-sm font-mono focus:outline-none focus:border-green-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            OpenAI API的基础URL，支持自定义代理
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={testConnection}
            disabled={testStatus === 'testing'}
            className={`px-6 py-3 border transition-colors text-sm uppercase tracking-wider ${
              testStatus === 'testing' 
                ? 'border-gray-600 text-gray-600 cursor-not-allowed'
                : 'border-white text-white hover:bg-white hover:text-black'
            }`}
          >
            {testStatus === 'testing' ? '测试中...' : '测试连接'}
          </button>

          <button
            onClick={saveConfig}
            className="px-6 py-3 border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors text-sm uppercase tracking-wider"
          >
            保存配置
          </button>

          <button
            onClick={resetToDefaults}
            className="px-6 py-3 border border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors text-sm uppercase tracking-wider"
          >
            重置
          </button>
        </div>

        {/* 状态显示 */}
        {testStatus === 'success' && (
          <div className="p-3 border border-green-400 bg-green-400/10">
            <p className="text-green-400 text-sm">✓ API连接测试成功</p>
          </div>
        )}

        {testStatus === 'error' && (
          <div className="p-3 border border-red-400 bg-red-400/10">
            <p className="text-red-400 text-sm">✗ {errorMessage}</p>
          </div>
        )}

        {/* 使用说明 */}
        <div className="pt-6 border-t border-white/30">
          <h3 className="text-sm mb-3 text-gray-300 uppercase tracking-widest">使用说明</h3>
          <div className="text-xs text-gray-400 space-y-2 leading-relaxed">
            <p>1. 输入有效的OpenAI API密钥以启用AI艺术评论功能</p>
            <p>2. 可以使用自定义API代理服务，修改基础URL即可</p>
            <p>3. 测试连接确保配置正确后保存</p>
            <p>4. AI评论家将基于关键词生成专业的艺术分析</p>
          </div>
        </div>

        {/* 当前环境变量状态 */}
        <div className="pt-4 border-t border-white/30">
          <h3 className="text-sm mb-3 text-gray-300 uppercase tracking-widest">环境变量状态</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_OPENAI_API_KEY:</span>
              <span className={process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'text-green-400' : 'text-red-400'}>
                {process.env.NEXT_PUBLIC_OPENAI_API_KEY ? '已设置' : '未设置'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>NEXT_PUBLIC_OPENAI_BASE_URL:</span>
              <span className={process.env.NEXT_PUBLIC_OPENAI_BASE_URL ? 'text-green-400' : 'text-yellow-400'}>
                {process.env.NEXT_PUBLIC_OPENAI_BASE_URL || '使用默认'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}