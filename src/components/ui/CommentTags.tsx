'use client';

import { useState, useEffect } from 'react';

export interface CommentTag {
  id: string;
  position: { x: number; y: number };
  content: {
    sight: string;
    thought: string;
  };
  keywords: string[];
  timestamp: number;
  characterId: string;
  evaluationResult?: 'demolish' | 'passed'; // 新增：政府评估结果
}

interface CommentTagsProps {
  tags: CommentTag[];
}

export default function CommentTags({ tags }: CommentTagsProps) {
  const [visibleTags, setVisibleTags] = useState<CommentTag[]>([]);
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 过滤掉临时标签，只显示真正的评论标签
    const realTags = tags.filter(tag =>
      !tag.id.startsWith('pending-evaluation-') &&
      !(tag.content.sight === "Observing..." && tag.content.thought === "Thinking...")
    );

    if (realTags.length !== visibleTags.length) {
      console.log('CommentTags: Tag count changed from', visibleTags.length, 'to', realTags.length);
      console.log('CommentTags: Filtered out temporary tags, showing real tags:', realTags);
    }
    setVisibleTags(realTags);
  }, [tags]);

  // 监控新添加的标签，设置2个标签后消失的逻辑
  useEffect(() => {
    visibleTags.forEach(tag => {
      // 如果是新标签且不在隐藏列表中，设置消失定时器
      if (!hiddenTags.has(tag.id) && !tag.id.startsWith('pending-evaluation-')) {
        // 计算标签创建后经过了多长时间
        const now = Date.now();
        const tagAge = now - tag.timestamp;

        // 如果标签已经存在超过基础时间，检查是否应该立即隐藏
        const baseDisplayTime = 8000; // 基础显示时间8秒
        const additionalTime = 3000; // 每个后续标签增加3秒

        // 查找在这个标签之后创建的标签数量
        const subsequentTags = visibleTags.filter(t =>
          t.timestamp > tag.timestamp &&
          !t.id.startsWith('pending-evaluation-')
        );

        const totalDisplayTime = baseDisplayTime + (subsequentTags.length * additionalTime);

        if (tagAge >= totalDisplayTime) {
          // 立即隐藏
          setHiddenTags(prev => new Set([...prev, tag.id]));
        } else {
          // 设置定时器
          const remainingTime = totalDisplayTime - tagAge;
          const timer = setTimeout(() => {
            setHiddenTags(prev => new Set([...prev, tag.id]));
          }, remainingTime);

          return () => clearTimeout(timer);
        }
      }
    });
  }, [visibleTags, visibleTags.length]);

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {visibleTags.map((tag) => {
        const isHidden = hiddenTags.has(tag.id);

        return (
          <div
            key={tag.id}
            className="absolute pointer-events-none"
            style={{
              left: `${tag.position.x}px`,
              top: `${tag.position.y}px`,
            }}
          >
            {/* 标签指示点 - 简洁发光效果 */}
            <div className="relative group">
              {/* 柔和外层光晕 */}
              <div
                className={`absolute w-8 h-8 rounded-full blur-sm opacity-30 ${
                  tag.evaluationResult === 'passed' ? 'bg-orange-500' : 'bg-yellow-400'
                }`}
                style={{
                  left: '0',
                  top: '0',
                  transform: 'translate(-50%, -50%)'
                }}
              />

              {/* 核心亮点 */}
              <div
                className={`absolute w-2 h-2 rounded-full shadow-lg ${
                  tag.evaluationResult === 'passed'
                    ? 'bg-orange-500 shadow-orange-500/80'
                    : 'bg-yellow-400 shadow-yellow-400/80'
                }`}
                style={{
                  left: '0',
                  top: '0',
                  transform: 'translate(-50%, -50%)'
                }}
              />

              {/* 评论文字 - 显示在点的上方 */}
              <div
                className={`absolute bg-white/60 px-2 py-1 text-[7px] leading-tight text-gray-800 whitespace-normal pointer-events-auto transition-opacity duration-500 ${
                  isHidden ? 'opacity-0' : 'opacity-100'
                }`}
                style={{
                  backdropFilter: 'blur(4px)',
                  minHeight: 'auto',
                  minWidth: '150px',
                  maxWidth: '250px',
                  left: '0',
                  bottom: '15px',
                  transform: 'translateX(-50%)'
                }}
                onMouseEnter={() => {
                  // 鼠标悬浮时重新显示
                  if (isHidden) {
                    setHiddenTags(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(tag.id);
                      return newSet;
                    });
                  }
                }}
              >
                {tag.content.thought}

                {/* 从评论框底部向下延伸的连接线 */}
                <div
                  className={`absolute w-0.5 h-[15px] bg-white/60 transition-opacity duration-500 ${
                    isHidden ? 'opacity-0' : 'opacity-100'
                  }`}
                  style={{
                    backdropFilter: 'blur(4px)',
                    left: '50%',
                    top: '100%',
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}