'use client';

import { useState, useEffect } from 'react';

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
}

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
  isProtestTag?: boolean; // 新增：标记是否为抗议标签（在passed区域内创建的）
  isGovernmentEvaluated?: boolean; // 新增：标记是否已被政府评估（period-3中使用）
  isPrePeriod3Tag?: boolean; // 新增：标记是否是进入period-3之前创建的标签
  period3Config?: { // 新增：period-3抗议标签的随机配置
    expandedRadius: number;  // 50-100
  };
}

interface PassedZone {
  centerX: number;
  centerY: number;
  radius: number;
}

interface CommentTagsProps {
  tags: CommentTag[];
  currentPeriod?: string; // 当前时期
  passedZones?: PassedZone[]; // passed圆形区域列表
  demolishedProtestPositions?: Record<string, { x: number; y: number }>; // 被demolish的抗议标签位置
}

// 抗议文本预设
const PROTEST_TEXTS = [
  "We demand the right to create freely without fear",
  "Art is not a crime, demolition is violence",
  "Our studios are our voices, silence us not",
  "Culture cannot be bulldozed, memory cannot be erased",
  "Preservation over profit, art over authority"
];

export default function CommentTags({
  tags,
  currentPeriod = '',
  passedZones = [],
  demolishedProtestPositions = {}
}: CommentTagsProps) {
  const [visibleTags, setVisibleTags] = useState<CommentTag[]>([]);
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(new Set());

  // 为每个抗议标签分配固定的抗议文本索引
  const [protestTextIndexes, setProtestTextIndexes] = useState<Record<string, number>>({});

  // 浮动粒子动画状态 - 简化版本，使用CSS动画避免JS循环
  const [protestTagParticles, setProtestTagParticles] = useState<Record<string, Particle[]>>({});

  // period-3抗议标签的随机配置
  const [period3Configs, setPeriod3Configs] = useState<Record<string, { expandedRadius: number }>>({});

  // 使用从父组件传入的demolishedProtestPositions替代原来的hiddenProtestPositions

  // 追踪已经触发过粉色动画的标签，避免重复触发
  const [triggeredAnimations, setTriggeredAnimations] = useState<Set<string>>(new Set());

  // 内部管理的粉色动画位置状态（包括从父组件传来的 + 本地检测的）
  const [localPinkPositions, setLocalPinkPositions] = useState<Record<string, { x: number; y: number }>>({});

  // 合并父组件传来的位置和本地检测的位置
  const allPinkPositions = { ...demolishedProtestPositions, ...localPinkPositions };

  // 监控新的抗议标签（真正的 isProtestTag: true），触发粉色动画
  useEffect(() => {
    tags.forEach(tag => {
      // 检查是否是真正的抗议标签
      const isRealProtestTag = tag.isProtestTag === true;

      if (isRealProtestTag && !triggeredAnimations.has(tag.id) && !localPinkPositions[tag.id]) {
        console.log('🎯 抗议标签被创建 - 触发粉色涟漪动画:', tag.id, '位置:', tag.position);

        // 记录这个标签已经触发过动画
        setTriggeredAnimations(prev => new Set([...prev, tag.id]));

        // 添加到本地粉色动画位置
        setLocalPinkPositions(prev => ({
          ...prev,
          [tag.id]: {
            x: tag.position.x,
            y: tag.position.y
          }
        }));
      }
    });
  }, [tags, triggeredAnimations, localPinkPositions]);

  // 隐藏标签的辅助函数
  const hideTag = (tagId: string, tag?: CommentTag) => {
    setHiddenTags(prev => new Set([...prev, tagId]));
    // 注意：抗议标签的demolish记录现在由MapLayout组件处理
  };

  // 检查点是否在passed圆形区域内
  const isPointInPassedZone = (x: number, y: number): boolean => {
    // 只在2002-2006期间检查
    if (currentPeriod !== '2002-2006') return false;

    for (const zone of passedZones) {
      const distance = Math.sqrt(
        Math.pow(x - zone.centerX, 2) + Math.pow(y - zone.centerY, 2)
      );
      if (distance < zone.radius) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    // 过滤掉临时标签，只显示真正的评论标签
    const realTags = tags.filter(tag =>
      !tag.id.startsWith('pending-evaluation-') &&
      !(tag.content.sight === "Observing..." && tag.content.thought === "Thinking...")
    );

    if (realTags.length !== visibleTags.length) {
      console.log('CommentTags: Tag count changed from', visibleTags.length, 'to', realTags.length);
      console.log('CommentTags: Filtered out temporary tags, showing real tags:', realTags);

      // 检查是否有抗议标签
      const protestTags = realTags.filter(t => t.isProtestTag);
      if (protestTags.length > 0) {
        console.log('🚩 Found protest tags:', protestTags.length, protestTags);
      }

      // 为新的抗议标签初始化粒子
      protestTags.forEach(tag => {
        if (!protestTagParticles[tag.id]) {
          const particleCount = Math.floor(Math.random() * 4) + 2; // 2-5个随机粒子
          const newParticles: Particle[] = [];

          for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const distance = 25 + Math.random() * 15; // 25-40px 距离
            newParticles.push({
              id: `${tag.id}-particle-${i}`,
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              vx: (Math.random() - 0.5) * 0.5, // 随机速度
              vy: (Math.random() - 0.5) * 0.5,
              angle: angle,
              speed: 0.3 + Math.random() * 0.4 // 0.3-0.7 速度
            });
          }

          setProtestTagParticles(prev => ({
            ...prev,
            [tag.id]: newParticles
          }));
        }
      });
    }
    setVisibleTags(realTags);
  }, [tags]); // 移除 particles 依赖避免无限循环

  // 为抗议标签初始化文本索引和period-3配置
  useEffect(() => {
    tags.forEach(tag => {
      if (tag.isProtestTag && !protestTextIndexes[tag.id]) {
        setProtestTextIndexes(prev => ({
          ...prev,
          [tag.id]: Math.floor(Math.random() * PROTEST_TEXTS.length)
        }));
      }

      // 在period-3中为抗议标签生成随机配置
      if (tag.isProtestTag && currentPeriod === '2006–2010' && !period3Configs[tag.id]) {
        setPeriod3Configs(prev => ({
          ...prev,
          [tag.id]: {
            expandedRadius: 50 + Math.random() * 50 // 50-100px
          }
        }));
      }
    });
  }, [tags, protestTextIndexes, currentPeriod, period3Configs]);

  // 监控新添加的标签，设置2个标签后消失的逻辑
  useEffect(() => {
    visibleTags.forEach(tag => {
      // 抗议标签永久显示，跳过消失逻辑
      if (tag.isProtestTag) return;

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
          hideTag(tag.id, tag);
        } else {
          // 设置定时器
          const remainingTime = totalDisplayTime - tagAge;
          const timer = setTimeout(() => {
            hideTag(tag.id, tag);
          }, remainingTime);

          return () => clearTimeout(timer);
        }
      }
    });
  }, [visibleTags, visibleTags.length]);

  // 当时间阶段切换时，清理本地动画状态
  useEffect(() => {
    setLocalPinkPositions({});
    setTriggeredAnimations(new Set());
    // 如果不是period-3，清理period-3配置
    if (currentPeriod !== '2006–2010') {
      setPeriod3Configs({});
    }
  }, [currentPeriod]);

  // 清理不存在的标签对应的粉色动画位置
  useEffect(() => {
    const existingTagIds = new Set(tags.map(tag => tag.id));

    // 清理localPinkPositions中不存在的标签
    setLocalPinkPositions(prev => {
      const filtered: Record<string, { x: number; y: number }> = {};
      Object.entries(prev).forEach(([tagId, position]) => {
        if (existingTagIds.has(tagId)) {
          filtered[tagId] = position;
        } else {
          console.log('🧹 Removing pink animation for non-existent tag:', tagId);
        }
      });
      return filtered;
    });

    // 清理triggeredAnimations中不存在的标签
    setTriggeredAnimations(prev => {
      const filtered = new Set<string>();
      prev.forEach(tagId => {
        if (existingTagIds.has(tagId)) {
          filtered.add(tagId);
        }
      });
      return filtered;
    });
  }, [tags]);

  return (
    <>
      {/* CSS动画样式 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes rippleColorChange {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.8);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(0, 0, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 8px rgba(0, 0, 0, 0);
          }
        }

        .color-change-animation {
          animation: rippleColorChange 0.6s ease-out;
        }
      `}} />

      <div className="absolute inset-0 pointer-events-none">
        {visibleTags.map((tag) => {
          const isHidden = hiddenTags.has(tag.id);
          const isProtestTag = tag.isProtestTag === true;
          const inPassedZone = !isProtestTag && isPointInPassedZone(tag.position.x, tag.position.y);
          const isGovernmentEvaluated = tag.isGovernmentEvaluated === true; // period-3中被政府评估过的标签
          const isPrePeriod3Tag = tag.isPrePeriod3Tag === true && currentPeriod === '2006–2010'; // period-3之前创建的标签，在period-3中显示特殊样式

          return (
            <div
              key={tag.id}
              className="absolute pointer-events-none"
              style={{
                left: `${tag.position.x}px`,
                top: `${tag.position.y}px`,
              }}
            >
              {/* 标签指示点 - 三种样式 + period-3特殊样式 */}
              <div className="relative group">
                {/* 柔和外层光晕 */}
                <div
                  className={`absolute rounded-full blur-sm opacity-30 ${
                    isProtestTag
                      ? 'bg-white' // 抗议标签保持白色
                      : (inPassedZone || isGovernmentEvaluated)
                        ? 'bg-[#FF550F]' // passed区域或政府评估过的标签保持橙色
                        : isPrePeriod3Tag
                          ? 'bg-[#857D72]' // period-3之前创建的标签使用#857D72光晕
                          : 'bg-white' // 其他所有情况都改为白色
                  }`}
                  style={{
                    width: isProtestTag ? '32px' : '32px',
                    height: isProtestTag ? '32px' : '32px',
                    left: '0',
                    top: '0',
                    transform: 'translate(-50%, -50%)'
                  }}
                />

                {/* 核心亮点 */}
                <div
                  className={`absolute rounded-full shadow-lg ${
                    isProtestTag
                      ? (currentPeriod === '2006–2010' ? 'bg-[#FF3E33]' : 'bg-pink-500') // period-3中抗议标签变为#FF3E33
                      : (inPassedZone || isGovernmentEvaluated)
                        ? 'bg-black shadow-[#FF550F]/80 color-change-animation' // passed区域或政府评估过的标签保持黑色
                        : isPrePeriod3Tag
                          ? 'bg-[#C2B89D]' // period-3之前创建的标签使用#C2B89D填充
                          : 'bg-[#FFF5DB]' // 其他情况都使用#FFF5DB
                  }`}
                  style={{
                    width: isProtestTag ? '22px' : '8px',
                    height: isProtestTag ? '22px' : '8px',
                    left: '0',
                    top: '0',
                    transform: 'translate(-50%, -50%)',
                    border: isProtestTag ? '5px solid #ffffff' : undefined,
                    zIndex: isProtestTag ? 60 : ((inPassedZone || isGovernmentEvaluated) ? 40 : undefined),
                    boxShadow: isProtestTag
                      ? (currentPeriod === '2006–2010'
                          ? '0 0 30px 6px rgba(255, 255, 255, 0.8), 0 0 20px 4px rgba(255, 255, 255, 0.9), 0 0 12px 2px rgba(255, 255, 255, 1), 0 0 10px 3px rgba(255, 62, 51, 0.9), 0 0 6px 2px rgba(255, 62, 51, 1)' // period-3: #FF3E33光晕
                          : '0 0 30px 6px rgba(255, 255, 255, 0.8), 0 0 20px 4px rgba(255, 255, 255, 0.9), 0 0 12px 2px rgba(255, 255, 255, 1), 0 0 10px 3px rgba(236, 72, 153, 0.9), 0 0 6px 2px rgba(236, 72, 153, 1)') // 原粉色光晕
                      : (inPassedZone || isGovernmentEvaluated)
                        ? '0 0 10px 2px rgba(255, 85, 15, 0.8), 0 0 6px 1px rgba(255, 85, 15, 1)' // passed区域或政府评估过的标签保持橙色阴影
                        : isPrePeriod3Tag
                          ? '0 0 10px 2px rgba(133, 125, 114, 0.8), 0 0 6px 1px rgba(133, 125, 114, 1)' // period-3之前创建的标签使用#857D72光晕
                          : '0 0 10px 2px rgba(255, 245, 219, 0.6), 0 0 6px 1px rgba(255, 245, 219, 0.8)' // 所有情况使用#FFF5DB阴影
                  }}
                >
                </div>

                {/* 抗议标签的红色内圆 - E70014颜色 */}
                {isProtestTag && (
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: '3px', // 小的红色内圆，改为3px
                      height: '3px',
                      left: '0',
                      top: '0',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: '#E70014',
                      zIndex: 65 // 在粉色圆之上
                    }}
                  />
                )}

                {/* 抗议标签的外轮廓圆圈 - 1px外圆 - 扩大一倍 */}
                {isProtestTag && (
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: '56px', // 扩大一倍：从28px到56px
                      height: '56px',
                      left: '0',
                      top: '0',
                      transform: 'translate(-50%, -50%)',
                      border: '1px solid rgba(255, 255, 255, 0.8)', // 1px白色外轮廓
                      backgroundColor: 'transparent',
                      zIndex: 55 // 在主圆之下，在passed圆之上
                    }}
                  />
                )}

                {/* period-3抗议标签的扩张圆 */}
                {isProtestTag && currentPeriod === '2006–2010' && period3Configs[tag.id] && (
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: `${period3Configs[tag.id].expandedRadius * 2}px`,
                      height: `${period3Configs[tag.id].expandedRadius * 2}px`,
                      left: '0',
                      top: '0',
                      transform: 'translate(-50%, -50%)',
                      border: '1px solid rgba(255, 255, 255, 1)', // 1px白色实线
                      backgroundColor: 'rgba(255, 255, 255, 0.2)', // 20%白色填充
                      zIndex: 54 // 在外轮廓之下
                    }}
                  />
                )}

                {/* 静态浮动粒子 - 仅对抗议标签显示 */}
                {isProtestTag && protestTagParticles[tag.id] && protestTagParticles[tag.id].map((particle: Particle) => (
                  <div
                    key={particle.id}
                    className="absolute rounded-full"
                    style={{
                      width: '8px',
                      height: '8px',
                      left: `${particle.x}px`,
                      top: `${particle.y}px`,
                      transform: 'translate(-50%, -50%)',
                      opacity: 0.8,
                      backgroundColor: '#F328A5', // 粒子颜色改为#F328A5
                      boxShadow: '0 0 4px rgba(243, 40, 165, 0.6)', // 阴影也改为对应的粉色
                      zIndex: 65, // 在主圆和评论文字之间
                      pointerEvents: 'none'
                    }}
                  />
                ))}
              </div>

              {/* 评论文字 - 显示在点的上方 */}
              {/* 在passed区域内的黑色artist点不显示评论 */}
              {/* period-3中抗议标签不显示文本框和连接线 */}
              {!(!isProtestTag && inPassedZone) && !(isProtestTag && currentPeriod === '2006–2010') && (
                <div
                  className={`absolute px-2 py-1 text-[7px] leading-tight whitespace-normal pointer-events-auto transition-opacity duration-500 ${
                    isProtestTag
                      ? 'bg-white opacity-100 font-bold' // 抗议标签加粗
                      : `bg-white/60 text-gray-800 ${isHidden ? 'opacity-0' : 'opacity-100'}`
                  }`}
                  style={{
                    backdropFilter: isProtestTag ? 'none' : 'blur(4px)',
                    minHeight: 'auto',
                    minWidth: '150px',
                    maxWidth: '250px',
                    left: '0',
                    bottom: '18px',
                    transform: 'translateX(-50%)',
                    zIndex: isProtestTag ? 80 : 50,
                    color: isProtestTag ? '#E70014' : undefined // 抗议文本使用E70014红色
                  }}
                  onMouseEnter={() => {
                    // 鼠标悬浮时重新显示（非抗议标签）
                    if (!isProtestTag && isHidden) {
                      setHiddenTags(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(tag.id);
                        return newSet;
                      });
                    }
                  }}
                >
                  {/* period-3中不显示抗议文本 */}
                  {currentPeriod === '2006–2010' && isProtestTag
                    ? '' // period-3中抗议标签不显示文本
                    : isProtestTag
                      ? (protestTextIndexes[tag.id] !== undefined
                          ? PROTEST_TEXTS[protestTextIndexes[tag.id]]
                          : PROTEST_TEXTS[0]) // 默认使用第一个抗议文本
                      : tag.content.thought
                  }

                {/* 从评论框底部向下延伸的连接线 */}
                <div
                  className={`absolute w-0.5 h-[18px] transition-opacity duration-500 ${
                    isProtestTag
                      ? 'opacity-100'
                      : `bg-white/60 ${isHidden ? 'opacity-0' : 'opacity-100'}`
                  }`}
                  style={{
                    backdropFilter: isProtestTag ? 'none' : 'blur(4px)',
                    left: '50%',
                    top: '100%',
                    transform: 'translateX(-50%)',
                    zIndex: isProtestTag ? 5 : 10,
                    background: isProtestTag
                      ? 'linear-gradient(to top, #ec4899, #ffffff)' // 自下而上从粉色渐变到白色
                      : undefined
                  }}
                />
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 抗议标签的粉色涟漪动画 */}
      {(() => {
        const entries = Object.entries(allPinkPositions);
        return entries.map(([tagId, position]) => {
          return (
            <div
              key={`pink-animation-${tagId}`}
              className="absolute pointer-events-none"
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: '0px',
                height: '0px',
                zIndex: 40 // 在抗议文本(80)之下，在圆点(60)之下
              }}
            >
              {/* 三层粉色轮廓涟漪动画 - 直接以父容器为中心 */}
              <div
                className="absolute rounded-full animate-ping"
                style={{
                  width: '60px',
                  height: '60px',
                  left: '-30px', // 宽度一半：60/2 = 30
                  top: '-30px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(236, 72, 153, 1)', // 1px 粉色轮廓
                  animationDuration: '2s'
                }}
              />
              <div
                className="absolute rounded-full animate-ping"
                style={{
                  width: '40px',
                  height: '40px',
                  left: '-20px', // 宽度一半：40/2 = 20
                  top: '-20px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(236, 72, 153, 1)', // 1px 粉色轮廓
                  animationDuration: '2.5s',
                  animationDelay: '0.5s'
                }}
              />
              <div
                className="absolute rounded-full animate-ping"
                style={{
                  width: '80px',
                  height: '80px',
                  left: '-40px', // 宽度一半：80/2 = 40
                  top: '-40px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(236, 72, 153, 1)', // 1px 粉色轮廓
                  animationDuration: '3s',
                  animationDelay: '1s'
                }}
              />
            </div>
          );
        });
      })()}
    </>
  );
}