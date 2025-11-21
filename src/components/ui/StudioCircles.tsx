'use client';

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { CommentTag } from './CommentTags';

export interface StudioCircle {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
  gridKey: string;
  createdAt: number;
  isAnimating: boolean;
  evaluationResult?: 'demolish' | 'passed'; // 政府评估结果
}

interface StudioCirclesProps {
  gridSystem: GridSystem;
  studioAreas: Set<string>;
  commentTags: CommentTag[];
  className?: string;
  allowNewCircles?: boolean; // 新增：是否允许生成新圆形
  initialCircles?: StudioCircle[]; // 新增：初始圆形数据（用于状态恢复）
  currentPeriodId?: string; // 新增：当前时期ID
}

export interface StudioCirclesRef {
  getCircles: () => StudioCircle[];
  setCircles: (circles: StudioCircle[]) => void;
  updateCircleEvaluation: (circleId: string, result: 'demolish' | 'passed') => void; // 新增：更新评估结果
}

const StudioCircles = forwardRef<StudioCirclesRef, StudioCirclesProps>(({
  gridSystem,
  studioAreas,
  commentTags,
  className = '',
  allowNewCircles = true, // 默认允许生成新圆形
  initialCircles = [], // 默认空数组
  currentPeriodId = 'period-1' // 默认为第一个时期
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [circles, setCircles] = useState<StudioCircle[]>(initialCircles);
  const animationRef = useRef<number>();

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getCircles: () => circles,
    setCircles: (newCircles: StudioCircle[]) => {
      console.log('🔄 StudioCircles: Setting circles via ref:', newCircles.length);
      setCircles(newCircles);
    },
    updateCircleEvaluation: (circleId: string, result: 'demolish' | 'passed') => {
      console.log(`🏛️ StudioCircles: Updating circle ${circleId} evaluation to ${result}`);
      setCircles(prev => prev.map(circle =>
        circle.id === circleId ? { ...circle, evaluationResult: result } : circle
      ));
    }
  }));

  // 监控studioAreas变化，创建新圆形（仅在允许时）
  useEffect(() => {
    // 如果不允许生成新圆形，直接返回
    if (!allowNewCircles) {
      return;
    }

    const existingGridKeys = new Set(circles.map(circle => circle.gridKey));
    const newStudioAreas = Array.from(studioAreas).filter(gridKey => !existingGridKeys.has(gridKey));

    if (newStudioAreas.length > 0) {
      console.log('🏭 Creating new studio circles for grids:', newStudioAreas);
      console.log('🔍 Existing circles:', existingGridKeys);
      console.log('🔍 All studio areas:', Array.from(studioAreas));

      const newCircles: StudioCircle[] = [];

      newStudioAreas.forEach(gridKey => {
        console.log('🏭 Creating studio circle for grid:', gridKey);

        // 找到该网格区域内的评论标签
        const [gridX, gridY] = gridKey.split('-').map(Number);
        const gridCenter = gridSystem.getCellCenter(gridX, gridY);

        // 查找该网格内的标签作为圆心候选
        const tagsInGrid = commentTags.filter(tag => {
          const tagGridPos = gridSystem.screenToGrid(tag.position.x, tag.position.y);
          return tagGridPos.gridX === gridX && tagGridPos.gridY === gridY;
        });

        // 如果该网格有标签，使用第一个标签位置；否则使用网格中心
        const centerPosition = tagsInGrid.length > 0
          ? { x: tagsInGrid[0].position.x, y: tagsInGrid[0].position.y }
          : gridCenter;

        // 根据时期调整圆形大小
        // 1995-2002阶段(period-1): 正常大小 100px-250px
        // 2002-2006阶段及以后(period-2+): 1/2大小 50px-125px
        let diameter: number;
        if (currentPeriodId === 'period-1') {
          // 1995-2002阶段：正常大小 100px-250px
          diameter = 100 + Math.random() * 150;
        } else {
          // 2002-2006阶段及以后：1/2大小 50px-125px
          diameter = 50 + Math.random() * 75;
        }
        const radius = diameter / 2;

        const newCircle: StudioCircle = {
          id: `studio-circle-${Date.now()}-${gridKey}`,
          centerX: centerPosition.x,
          centerY: centerPosition.y,
          radius,
          gridKey,
          createdAt: Date.now(),
          isAnimating: true
        };

        newCircles.push(newCircle);

        console.log('🎯 Studio circle created:', {
          gridKey,
          center: { x: centerPosition.x, y: centerPosition.y },
          radius,
          tagsInGrid: tagsInGrid.length
        });
      });

      if (newCircles.length > 0) {
        setCircles(prev => {
          console.log('🔄 Updating circles state:', {
            previous: prev.length,
            adding: newCircles.length,
            total: prev.length + newCircles.length
          });
          return [...prev, ...newCircles];
        });
      }
    }
  }, [studioAreas, commentTags, gridSystem, allowNewCircles]); // 移除circles依赖，防止循环依赖

  // Canvas绘制和动画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置canvas尺寸
    const canvasDims = gridSystem.getCanvasDimensions();
    canvas.width = canvasDims.width;
    canvas.height = canvasDims.height;

    const animate = () => {
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();

      circles.forEach(circle => {
        const elapsed = now - circle.createdAt;
        const animationDuration = 1000; // 1秒展开动画

        // 计算动画进度
        let progress = Math.min(elapsed / animationDuration, 1);

        // 使用easeOutCubic缓动函数
        progress = 1 - Math.pow(1 - progress, 3);

        const currentRadius = circle.radius * progress;

        // 根据评估结果决定绘制样式
        if (circle.evaluationResult === 'demolish') {
          // demolish状态：没有轮廓，0%透明度（完全不透明）
          ctx.save();
          ctx.globalAlpha = 1; // 0%透明度，完全不透明
          const dotSize = 1.5;
          const spacing = 10;

          const minX = circle.centerX - currentRadius;
          const maxX = circle.centerX + currentRadius;
          const minY = circle.centerY - currentRadius;
          const maxY = circle.centerY + currentRadius;

          ctx.fillStyle = '#FF550F';

          for (let x = minX; x <= maxX; x += spacing) {
            for (let y = minY; y <= maxY; y += spacing) {
              const offsetX = x + ((Math.floor((y - minY) / spacing) % 2) * spacing / 2);
              const distanceFromCenter = Math.sqrt(
                Math.pow(offsetX - circle.centerX, 2) + Math.pow(y - circle.centerY, 2)
              );

              if (distanceFromCenter <= currentRadius - 10) {
                ctx.beginPath();
                ctx.arc(offsetX, y, dotSize, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
          }

          ctx.restore();
        } else if (circle.evaluationResult === 'passed') {
          ctx.save();

          // period-3 (2006-2010): 30%透明度#FF8126色底 + 渐变点阵 + 1px实线轮廓
          if (currentPeriodId === 'period-3') {
            // 绘制30%透明度#FF8126色底色（与period-2一致）
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#FF8126';
            ctx.beginPath();
            ctx.arc(circle.centerX, circle.centerY, currentRadius, 0, 2 * Math.PI);
            ctx.fill();

            // 绘制1px实线轮廓
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#FF8126';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(circle.centerX, circle.centerY, currentRadius, 0, 2 * Math.PI);
            ctx.stroke();

            // 绘制渐变点阵填充 - 从圆心向外: 粉色 → #FF3E33 → #FF8126
            ctx.globalAlpha = 1.0;
            const dotSize = 2; // 直径4px，半径2px
            const spacing = 6;

            const minX = circle.centerX - currentRadius;
            const maxX = circle.centerX + currentRadius;
            const minY = circle.centerY - currentRadius;
            const maxY = circle.centerY + currentRadius;

            for (let x = minX; x <= maxX; x += spacing) {
              for (let y = minY; y <= maxY; y += spacing) {
                // 斜向偏移
                const offsetX = x + ((Math.floor((y - minY) / spacing) % 2) * spacing / 2);
                const distanceFromCenter = Math.sqrt(
                  Math.pow(offsetX - circle.centerX, 2) + Math.pow(y - circle.centerY, 2)
                );

                if (distanceFromCenter <= currentRadius - 5) {
                  // 计算渐变颜色：粉色(0) → #FF3E33(0.5) → #FF8126(1)
                  // 粉色 #F328A5 = rgb(243, 40, 165)
                  const ratio = distanceFromCenter / (currentRadius - 5);
                  let r, g, b;

                  if (ratio < 0.5) {
                    // 粉色 → #FF3E33
                    const t = ratio / 0.5;
                    r = Math.round(243 + (255 - 243) * t);
                    g = Math.round(40 + (62 - 40) * t);
                    b = Math.round(165 + (51 - 165) * t);
                  } else {
                    // #FF3E33 → #FF8126
                    const t = (ratio - 0.5) / 0.5;
                    r = 255;
                    g = Math.round(62 + (129 - 62) * t);
                    b = Math.round(51 + (38 - 51) * t);
                  }

                  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                  ctx.beginPath();
                  ctx.arc(offsetX, y, dotSize, 0, 2 * Math.PI);
                  ctx.fill();
                }
              }
            }

            // 绘制粉色圆心点
            ctx.fillStyle = '#F328A5';
            ctx.beginPath();
            ctx.arc(circle.centerX, circle.centerY, 2, 0, 2 * Math.PI);
            ctx.fill();
          } else {
            // period-2 及更早: 30%透明度#FF8126色底 + 1px实线轮廓 + 内部渐变点阵填充

            // 绘制30%透明度#FF8126色底色
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#FF8126';
            ctx.beginPath();
            ctx.arc(circle.centerX, circle.centerY, currentRadius, 0, 2 * Math.PI);
            ctx.fill();

            // 绘制外轮廓 - 1px实线
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#FF8126';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(circle.centerX, circle.centerY, currentRadius, 0, 2 * Math.PI);
            ctx.stroke();

            // 绘制渐变点阵填充 (100%透明度) - 从圆心#FF3E33到边缘#FF8126
            ctx.globalAlpha = 1.0;
            const dotSize = 2; // 直径4px，半径2px
            const spacing = 6; // 减小间距

            const minX = circle.centerX - currentRadius;
            const maxX = circle.centerX + currentRadius;
            const minY = circle.centerY - currentRadius;
            const maxY = circle.centerY + currentRadius;

            for (let x = minX; x <= maxX; x += spacing) {
              for (let y = minY; y <= maxY; y += spacing) {
                // 斜向偏移
                const offsetX = x + ((Math.floor((y - minY) / spacing) % 2) * spacing / 2);
                const distanceFromCenter = Math.sqrt(
                  Math.pow(offsetX - circle.centerX, 2) + Math.pow(y - circle.centerY, 2)
                );

                if (distanceFromCenter <= currentRadius - 5) {
                  // 计算渐变颜色：从圆心#FF3E33到边缘#FF8126
                  const ratio = distanceFromCenter / (currentRadius - 5);
                  // #FF3E33 = rgb(255, 62, 51)
                  // #FF8126 = rgb(255, 129, 38)
                  const r = 255;
                  const g = Math.round(62 + (129 - 62) * ratio);
                  const b = Math.round(51 + (38 - 51) * ratio);

                  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                  ctx.beginPath();
                  ctx.arc(offsetX, y, dotSize, 0, 2 * Math.PI);
                  ctx.fill();
                }
              }
            }

            // 绘制#FF3E33色圆心点
            ctx.fillStyle = '#FF3E33';
            ctx.beginPath();
            ctx.arc(circle.centerX, circle.centerY, 2, 0, 2 * Math.PI);
            ctx.fill();
          }

          ctx.restore();
        } else {
          // 默认状态：原始样式（未被评估）- 透明度提至100%
          ctx.save();
          ctx.globalAlpha = 1.0; // 提至100%透明度
          ctx.strokeStyle = '#F9F0D3';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);

          ctx.beginPath();
          ctx.arc(circle.centerX, circle.centerY, currentRadius, 0, 2 * Math.PI);
          ctx.stroke();

          // 绘制内部斜向点阵
          if (progress > 0.3) {
            ctx.globalAlpha = 1.0; // 提至100%透明度
            const dotSize = 1.5;
            const spacing = 10;

            const minX = circle.centerX - currentRadius;
            const maxX = circle.centerX + currentRadius;
            const minY = circle.centerY - currentRadius;
            const maxY = circle.centerY + currentRadius;

            ctx.fillStyle = '#F9F0D3';

            for (let x = minX; x <= maxX; x += spacing) {
              for (let y = minY; y <= maxY; y += spacing) {
                const offsetX = x + ((Math.floor((y - minY) / spacing) % 2) * spacing / 2);
                const distanceFromCenter = Math.sqrt(
                  Math.pow(offsetX - circle.centerX, 2) + Math.pow(y - circle.centerY, 2)
                );

                if (distanceFromCenter <= currentRadius - 10) {
                  ctx.beginPath();
                  ctx.arc(offsetX, y, dotSize, 0, 2 * Math.PI);
                  ctx.fill();
                }
              }
            }
          }

          ctx.restore();
        }

        // 动画完成后标记
        if (progress >= 1 && circle.isAnimating) {
          setCircles(prev => prev.map(c =>
            c.id === circle.id ? { ...c, isAnimating: false } : c
          ));
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [circles, gridSystem, currentPeriodId]); // 添加currentPeriodId依赖，确保时期切换时重新渲染

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }} // 降低z-index，确保在CommentTags (z-70) 下方
    />
  );
});

StudioCircles.displayName = 'StudioCircles';

export default StudioCircles;