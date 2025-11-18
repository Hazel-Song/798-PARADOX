'use client';

import { useState, useRef, useEffect } from 'react';

interface InputInteractionSystemProps {
  className?: string;
  onInputSubmit?: (input: string) => void; // 输入提交回调 - 现在传递政策反馈文本
  isVisible?: boolean; // 是否显示（仅在2002-2006期间显示）
}

interface HistoryItem {
  userInput: string;
  policyFeedback: string;
}

// 预设的政策反馈模板
const POLICY_FEEDBACK_TEMPLATES = [
  "Media-reported activities may be preserved as 'cultural samples'",
  "Spontaneous gatherings viewed as risk, requiring clearance",
  "Licensed studios exempted from immediate demolition",
  "Unregistered spaces subject to phased removal",
  "Cultural heritage areas preserved under observation",
  "High-traffic zones prioritized for redevelopment planning"
];

// 备选输入选项
const SUGGESTED_INPUTS = [
  "凭什么拆掉",
  "评估标准是啥",
  "艺术家好可怜"
];

export default function InputInteractionSystem({
  className = '',
  onInputSubmit,
  isVisible = false
}: InputInteractionSystemProps) {
  const [currentInput, setCurrentInput] = useState('');
  const [inputHistory, setInputHistory] = useState<HistoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // 处理输入提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentInput.trim()) {
      console.log('📝 Input submitted:', currentInput);

      // 随机选择一个政策反馈
      const randomFeedback = POLICY_FEEDBACK_TEMPLATES[Math.floor(Math.random() * POLICY_FEEDBACK_TEMPLATES.length)];

      // 添加到历史记录
      setInputHistory(prev => [...prev, {
        userInput: currentInput.trim(),
        policyFeedback: randomFeedback
      }]);

      // 通知父组件 - 传递政策反馈文本
      if (onInputSubmit) {
        onInputSubmit(randomFeedback);
      }

      // 清空当前输入并隐藏建议
      setCurrentInput('');
      setShowSuggestions(false);
    }
  };

  // 处理建议选项点击
  const handleSuggestionClick = (suggestion: string) => {
    setCurrentInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [inputHistory]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`bg-black/80 border border-white/30 ${className}`}
      style={{
        width: '300px',
        height: '250px'
      }}
    >
      {/* 标题 */}
      <div className="p-3 border-b border-white/20">
        <h4 className="text-[10px] font-mono text-white/70 uppercase tracking-wider">
          Government Feedback
        </h4>
      </div>

      {/* 输入历史记录区域 */}
      <div
        ref={historyRef}
        className="px-3 py-2 overflow-y-auto"
        style={{ height: '160px' }}
      >
        {inputHistory.length === 0 ? (
          <div className="text-[10px] font-mono text-white/40 text-center mt-12">
            No input history
          </div>
        ) : (
          <div className="space-y-2">
            {inputHistory.map((item, index) => (
              <div key={index} className="space-y-1">
                {/* 用户输入 */}
                <div className="text-[10px] font-mono text-white/70 p-1 bg-white/10 border border-white/20">
                  {item.userInput}
                </div>
                {/* 政策反馈 */}
                <div className="text-[10px] font-mono text-[#FF550F] p-1.5 bg-gray-800/60 border border-[#FF550F]/60">
                  {item.policyFeedback}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 输入框区域 */}
      <div className="p-3 border-t border-white/20 relative">
        {/* 建议选项下拉 */}
        {showSuggestions && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-black/90 border border-white/30 z-10">
            {SUGGESTED_INPUTS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-2 py-1.5 text-[10px] font-mono text-white/70 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center">
          {/* 图标 */}
          <div className="w-6 h-6 mr-2 flex-shrink-0 relative">
            <img
              src="/human-handsup.png"
              alt="Appeal"
              className="w-full h-full object-contain"
            />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Type your appeals here"
            className="flex-1 bg-white/10 border border-white/20 px-2 py-1 text-[10px] font-mono text-white placeholder-white/40 focus:outline-none focus:bg-white/20 focus:border-white/40"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={!currentInput.trim()}
            className="ml-2 px-3 py-1 bg-white/10 border border-white/20 text-[10px] font-mono text-white/70 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            →
          </button>
        </form>

        {/* 输入提示 */}
        <div className="mt-1 text-[8px] font-mono text-white/40">
          Press Enter to submit • Max 100 chars
        </div>
      </div>
    </div>
  );
}