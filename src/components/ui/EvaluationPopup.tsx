'use client';

import { useState, useEffect } from 'react';
import { Character } from '@/types/character';

interface EvaluationPopup {
  id: string;
  character: Character;
  evaluation: {
    artistic: string;
    cultural: string;
    critique: string;
    confidence: number;
  };
  keywords: string[];
  position: { x: number; y: number };
  timestamp: number;
}

interface EvaluationPopupProps {
  popups: EvaluationPopup[];
  onClose: (id: string) => void;
}

export default function EvaluationPopup({ popups, onClose }: EvaluationPopupProps) {
  const [visiblePopups, setVisiblePopups] = useState<EvaluationPopup[]>([]);

  useEffect(() => {
    console.log('EvaluationPopup received popups:', popups);
    setVisiblePopups(popups);
  }, [popups]);

  console.log('EvaluationPopup rendering with visiblePopups:', visiblePopups);

  const handleClose = (id: string) => {
    setVisiblePopups(prev => prev.filter(popup => popup.id !== id));
    setTimeout(() => onClose(id), 300); // 延迟删除，配合动画
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.toLocaleString('en', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30" style={{ position: 'absolute' }}>
      {visiblePopups.map((popup) => (
        <div
          key={popup.id}
          className="absolute pointer-events-auto animate-in fade-in duration-300"
          style={{
            left: `${popup.position.x}px`,
            top: `${popup.position.y}px`,
            transform: 'translate(-50%, -100%)', // 弹窗出现在光标上方
          }}
        >
          {/* 连接线 */}
          <div className="absolute top-full left-1/2 w-px h-4 bg-red-500 transform -translate-x-1/2"></div>
          
          {/* 弹窗主体 */}
          <div className="bg-white border-2 border-red-500 shadow-2xl max-w-sm w-80 font-sans text-xs relative mb-4" style={{ backgroundColor: 'white', border: '2px solid red' }}>
            {/* 关闭按钮 */}
            <button
              onClick={() => handleClose(popup.id)}
              className="absolute top-2 right-2 w-4 h-4 text-gray-500 hover:text-gray-700 flex items-center justify-center text-lg leading-none"
            >
              ×
            </button>

            {/* 标头信息 */}
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                <div className="font-medium text-gray-800">Case: ARTIST_{popup.timestamp.toString().slice(-6)}</div>
              </div>
              <div className="text-gray-600 text-xs">
                Date: {formatDate(popup.timestamp)} until {formatTime(popup.timestamp)}
              </div>
              <div className="text-gray-600 text-xs">Type: evaluation</div>
            </div>

            {/* 关键词展示 */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="font-medium text-gray-700 mb-1">Keywords:</div>
              <div className="text-gray-600 text-xs leading-relaxed">
                {popup.keywords.join('、')}
              </div>
            </div>

            {/* 评估内容 */}
            <div className="p-3 space-y-3">
              {/* 艺术评价 */}
              <div>
                <div className="font-medium text-gray-700 mb-1 text-xs">ARTISTIC ANALYSIS:</div>
                <div className="text-gray-600 text-xs leading-relaxed">
                  {popup.evaluation.artistic}
                </div>
              </div>

              {/* 文化解读 */}
              <div>
                <div className="font-medium text-gray-700 mb-1 text-xs">CULTURAL INTERPRETATION:</div>
                <div className="text-gray-600 text-xs leading-relaxed">
                  {popup.evaluation.cultural}
                </div>
              </div>

              {/* 批判思考 */}
              <div>
                <div className="font-medium text-gray-700 mb-1 text-xs">CRITICAL PERSPECTIVE:</div>
                <div className="text-gray-600 text-xs leading-relaxed">
                  {popup.evaluation.critique}
                </div>
              </div>

              {/* 置信度 */}
              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                <span className="text-gray-500 text-xs">Confidence:</span>
                <span className="text-red-600 text-xs font-medium">
                  {Math.round(popup.evaluation.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Source信息 */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="text-red-600 text-xs font-medium">Source 1</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { EvaluationPopup };