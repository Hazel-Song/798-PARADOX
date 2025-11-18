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
}

interface StudioCirclesProps {
  gridSystem: GridSystem;
  studioAreas: Set<string>;
  commentTags: CommentTag[];
  className?: string;
  allowNewCircles?: boolean; // 新增：是否允许生成新圆形
  initialCircles?: StudioCircle[]; // 新增：初始圆形数据（用于状态恢复）
}

export interface StudioCirclesRef {
  getCircles: () => StudioCircle[];
  setCircles: (circles: StudioCircle[]) => void;
}

const StudioCircles = forwardRef<StudioCirclesRef, StudioCirclesProps>(({
  gridSystem,
  studioAreas,
  commentTags,
  className = '',
  allowNewCircles = true, // 默认允许生成新圆形
  initialCircles = [] // 默认空数组
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

        // 随机直径 100px-250px
        const diameter = 100 + Math.random() * 150;
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

        // 绘制圆形外轮廓 - 1px虚线
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#F9F0D3';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]); // 虚线：4像素实线，4像素空白

        ctx.beginPath();
        ctx.arc(circle.centerX, circle.centerY, currentRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // 绘制内部斜向点阵（只在圆形内部）
        if (progress > 0.3) { // 延迟显示点阵
          ctx.globalAlpha = 0.5;
          const dotSize = 1.5;
          const spacing = 10;

          // 计算点阵范围
          const minX = circle.centerX - currentRadius;
          const maxX = circle.centerX + currentRadius;
          const minY = circle.centerY - currentRadius;
          const maxY = circle.centerY + currentRadius;

          ctx.fillStyle = '#F9F0D3';

          for (let x = minX; x <= maxX; x += spacing) {
            for (let y = minY; y <= maxY; y += spacing) {
              // 斜向偏移模式 - 每隔一行偏移半个间距
              const offsetX = x + ((Math.floor((y - minY) / spacing) % 2) * spacing / 2);

              // 检查点是否在圆形内部
              const distanceFromCenter = Math.sqrt(
                Math.pow(offsetX - circle.centerX, 2) + Math.pow(y - circle.centerY, 2)
              );

              if (distanceFromCenter <= currentRadius - 10) { // 留一些边距
                ctx.beginPath();
                ctx.arc(offsetX, y, dotSize, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
          }
        }

        ctx.restore();

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
  }, [circles, gridSystem]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 25 }} // 在网格之上，在角色之下
    />
  );
});

StudioCircles.displayName = 'StudioCircles';

export default StudioCircles;