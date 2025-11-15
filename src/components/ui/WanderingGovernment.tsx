'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { CommentTag } from './CommentTags';

interface WanderingGovernmentProps {
  gridSystem: GridSystem;
  className?: string;
  commentTags: CommentTag[];
  onTagRemove?: (tagId: string) => void;
  currentPeriod: string;
}

export interface WanderingGovernmentRef {
  getCurrentPosition: () => { x: number; y: number };
  isPaused: () => boolean;
  pause: () => void;
  resume: () => void;
}

const WanderingGovernment = forwardRef<WanderingGovernmentRef, WanderingGovernmentProps>(({
  gridSystem,
  className = '',
  commentTags,
  onTagRemove,
  currentPeriod
}, ref) => {
  const [position, setPosition] = useState({ x: 300, y: 200 });
  const [targetTag, setTargetTag] = useState<CommentTag | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [visitedTagIds, setVisitedTagIds] = useState<Set<string>>(new Set());

  // 只在2000-2004期间显示
  const isActive = currentPeriod === '2000-2004';

  useImperativeHandle(ref, () => ({
    getCurrentPosition: () => position,
    isPaused: () => isPaused,
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false)
  }));

  // 寻找最近的未访问标签
  const findNearestUnvisitedTag = () => {
    const unvisitedTags = commentTags.filter(tag => !visitedTagIds.has(tag.id));
    if (unvisitedTags.length === 0) return null;

    let nearest = unvisitedTags[0];
    let minDistance = Infinity;

    unvisitedTags.forEach(tag => {
      const distance = Math.sqrt(
        Math.pow(tag.position.x - position.x, 2) + 
        Math.pow(tag.position.y - position.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = tag;
      }
    });

    return nearest;
  };

  // 移动到目标位置
  const moveTowards = (target: { x: number; y: number }) => {
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      setPosition(target);
      return true; // 到达目标
    }

    const speed = 2;
    const moveX = (dx / distance) * speed;
    const moveY = (dy / distance) * speed;

    setPosition(prev => ({
      x: prev.x + moveX,
      y: prev.y + moveY
    }));
    return false;
  };

  // 主要移动逻辑
  useEffect(() => {
    if (!isActive || isPaused || isEvaluating) return;

    const interval = setInterval(() => {
      // 如果没有目标，寻找最近的标签
      if (!targetTag) {
        const nearestTag = findNearestUnvisitedTag();
        if (nearestTag) {
          setTargetTag(nearestTag);
          console.log('🏛️ Government targeting tag:', nearestTag.id);
        }
        return;
      }

      // 移动到目标标签
      const arrived = moveTowards(targetTag.position);
      if (arrived) {
        console.log('🏛️ Government arrived at tag:', targetTag.id);
        setIsEvaluating(true);
        
        // 4秒后移除标签
        setTimeout(() => {
          if (onTagRemove) {
            onTagRemove(targetTag.id);
          }
          setVisitedTagIds(prev => new Set([...prev, targetTag.id]));
          setTargetTag(null);
          setIsEvaluating(false);
          console.log('🏛️ Government removed tag:', targetTag.id);
        }, 4000);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [targetTag, isEvaluating, isPaused, commentTags, position, isActive]);

  // 重置已访问标签（当新标签出现时）
  useEffect(() => {
    const currentTagIds = new Set(commentTags.map(tag => tag.id));
    setVisitedTagIds(prev => {
      const filtered = new Set([...prev].filter(id => currentTagIds.has(id)));
      return filtered;
    });
  }, [commentTags]);

  if (!isActive) {
    return null;
  }

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* 政府光标 - 红色菱形 */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ease-linear"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 60
        }}
      >
        <div className="relative">
          {/* 红色菱形光标 */}
          <div className="w-4 h-4 bg-red-500 border border-red-700 transform rotate-45 shadow-lg"></div>
          
          {/* 评估中的红色弹框 */}
          {isEvaluating && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-6">
              <div className="bg-red-500/90 border border-red-700 text-white px-3 py-2 rounded shadow-lg text-xs font-medium">
                EVALUATING...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

WanderingGovernment.displayName = 'WanderingGovernment';

export default WanderingGovernment;