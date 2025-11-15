'use client';

import { useState, useEffect } from 'react';

interface CommentTag {
  id: string;
  position: { x: number; y: number };
  content: {
    sight: string;
    thought: string;
  };
  keywords: string[];
  timestamp: number;
  characterId: string;
}

interface CommentTagsProps {
  tags: CommentTag[];
}

export default function CommentTags({ tags }: CommentTagsProps) {
  const [visibleTags, setVisibleTags] = useState<CommentTag[]>([]);

  useEffect(() => {
    // 只有当标签数量发生变化时才打印日志
    if (tags.length !== visibleTags.length) {
      console.log('CommentTags: Tag count changed from', visibleTags.length, 'to', tags.length);
      console.log('CommentTags: Received tags:', tags);
    }
    setVisibleTags(tags);
  }, [tags]); // 移除visibleTags.length依赖避免循环

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // console.log('CommentTags: Rendering component with', visibleTags.length, 'visible tags');

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {visibleTags.map((tag) => (
        <div
          key={tag.id}
          className="absolute pointer-events-auto"
          style={{
            left: `${tag.position.x}px`,
            top: `${tag.position.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* 标签指示点 - 简洁发光效果 */}
          <div
            className="relative cursor-default group"
          >
            {/* 柔和外层光晕 */}
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '30px',
                height: '30px',
                background: tag.content.sight === "正在观察中..."
                  ? 'radial-gradient(circle, rgba(251,146,60,0.6) 0%, rgba(251,146,60,0) 70%)'
                  : 'radial-gradient(circle, rgba(250,204,21,0.6) 0%, rgba(250,204,21,0) 70%)',
                filter: 'blur(8px)'
              }}
            />

            {/* 核心亮点 */}
            <div
              className="absolute rounded-full"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '6px',
                height: '6px',
                background: tag.content.sight === "正在观察中..."
                  ? 'rgba(251,146,60,1)'
                  : 'rgba(250,204,21,1)',
                boxShadow: tag.content.sight === "正在观察中..."
                  ? '0 0 12px 3px rgba(251,146,60,0.8)'
                  : '0 0 12px 3px rgba(250,204,21,0.8)'
              }}
            />
            
            {/* 案例研究风格弹窗 - 压缩版 */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-40">
              <div className="bg-white/40 backdrop-blur-sm border border-gray-300/30 shadow-xl max-w-xs w-64 font-sans text-xs relative">
                {/* 左侧橙色边框 */}
                <div className="absolute left-0 top-0 w-0.5 h-full bg-orange-500"></div>
                
                {/* 右上角关闭按钮 */}
                <div className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center cursor-pointer">
                  <div className="w-3 h-3 rounded-full border border-gray-400/60 flex items-center justify-center text-gray-500 text-xs">
                    ×
                  </div>
                </div>

                {/* 标头区域 */}
                <div className="pl-4 pr-6 pt-2 pb-1">
                  <div className="text-gray-600 text-xs">
                    Artist Observation
                  </div>
                </div>

                {/* 内容区域 - 只显示引号中的话 */}
                <div className="pl-4 pr-4 py-2 bg-gray-50/40 border-t border-gray-200/30">
                  <div className="text-gray-800 text-xs leading-tight">
                    "{tag.content.thought}"
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="pl-4 pr-4 py-1 border-t border-gray-200/30 bg-white/40">
                  <div className="text-gray-600 text-xs">
                    {tag.keywords && tag.keywords.length > 0 
                      ? tag.keywords.slice(0, 3).map(keyword => `[${keyword}]`).join('')
                      : '[工厂][废弃][冷清]'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { CommentTag };