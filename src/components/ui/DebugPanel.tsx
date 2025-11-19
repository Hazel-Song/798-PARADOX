'use client';

import React, { useState } from 'react';

interface DebugData {
  aiServiceStatus: { pending: number; processing: boolean };
  evaluationInterval: number;
  evaluationCount: number;
  lastKeywords: string[];
  timeRemaining: number;
}

interface DebugPanelProps {
  debugData?: DebugData;
  className?: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  onManualEvaluation?: () => void; // 新增：手动评估回调
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  debugData,
  className = '',
  isVisible = false,
  onToggleVisibility,
  onManualEvaluation // 新增：手动评估回调
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 快捷键支持
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+D 或 Cmd+D 切换调试面板
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        onToggleVisibility?.();
      }
      // Ctrl+Shift+D 或 Cmd+Shift+D 切换展开状态
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsExpanded(!isExpanded);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onToggleVisibility]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-4 z-50 bg-black/90 border border-yellow-400/50 font-mono text-xs ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 bg-yellow-400/10 border-b border-yellow-400/30">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-400">DEBUG</span>
          <span className="text-white/60">Ctrl+D</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-yellow-400/70 hover:text-yellow-400 transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <button
            onClick={onToggleVisibility}
            className="text-red-400/70 hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 内容 */}
      {isExpanded && (
        <div className="p-3 max-w-sm max-h-96 overflow-y-auto">
          <div className="space-y-2">
            <div className="text-white/70">系统状态:</div>
            <div className="pl-2 space-y-1">
              {debugData ? (
                Object.entries(debugData).map(([key, value]) => (
                  <div key={key} className="text-white/60">
                    <span className="text-yellow-400">{key}:</span>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </div>
                ))
              ) : (
                <div className="text-white/50">无调试数据</div>
              )}
            </div>

            <div className="border-t border-white/20 pt-2 mt-3">
              <div className="text-white/70 mb-2">操作:</div>
              <div className="space-y-2">
                <button
                  onClick={onManualEvaluation}
                  className="w-full px-2 py-1 bg-orange-500/20 border border-orange-400/50 text-orange-400 hover:bg-orange-500/30 hover:border-orange-400 transition-colors text-xs rounded"
                  disabled={!onManualEvaluation}
                >
                  立即评估 (Force Evaluation)
                </button>
              </div>
            </div>

            <div className="border-t border-white/20 pt-2 mt-3">
              <div className="text-white/70">快捷键:</div>
              <div className="pl-2 space-y-1 text-white/50">
                <div>Ctrl+D: 切换面板</div>
                <div>Ctrl+Shift+D: 展开/收起</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 简化显示 */}
      {!isExpanded && (
        <div className="px-3 py-2 text-white/60">
          点击展开调试信息...
        </div>
      )}
    </div>
  );
};

export default DebugPanel;