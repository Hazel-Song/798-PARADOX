'use client';

import { useRef, useEffect } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';

interface GridOverlayProps {
  gridSystem: GridSystem;
  className?: string;
  showLabels?: boolean;
  currentPeriod?: string;
  studioAreas?: Set<string>;
}

export default function GridOverlay({ 
  gridSystem, 
  className = '', 
  showLabels = true,
  currentPeriod = '1995-2000',
  studioAreas = new Set()
}: GridOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);


  // 获取每个网格单元的区域类型 - 统一使用废弃工厂模式
  const getAreaType = (gridX: number, gridY: number) => {
    const gridKey = `${gridX}-${gridY}`;

    // 优先检查是否为工作室区域
    if (studioAreas.has(gridKey)) {
      return { type: 'studio', color: 'rgba(138, 43, 226, 0.15)', textColor: '#8A2BE2', name: 'Studio' };
    }

    // 统一使用废弃工厂网格系统（不再区分时期）
    const centerX = 12 / 2;
    const centerY = 8 / 2;
    const distanceFromCenter = Math.sqrt((gridX - centerX) ** 2 + (gridY - centerY) ** 2);
    const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
    const normalizedDistance = distanceFromCenter / maxDistance;

    if (normalizedDistance > 0.8) {
      // 外围20%：城区（更高透明度）
      return { type: 'urban', color: 'rgba(0, 0, 0, 0.15)', textColor: '#666666', name: 'Urban' };
    } else {
      // 其余80%：废弃工厂（更高透明度）
      return { type: 'industrial', color: 'rgba(105, 105, 105, 0.1)', textColor: '#A9A9A9', name: 'Abandoned Factory' };
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // 添加一个小的延迟确保DOM完全渲染
    const renderGrid = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d')!;

      // 获取实际的canvas父容器尺寸
      const rect = canvas.getBoundingClientRect();
      const devicePixelRatio = window.devicePixelRatio || 1;

      // 设置画布大小为容器的实际尺寸
      const actualWidth = rect.width;
      const actualHeight = rect.height;

      // 确保canvas有实际尺寸
      if (actualWidth === 0 || actualHeight === 0) {
        console.log('GridOverlay: Canvas has zero dimensions, skipping render');
        return;
      }

      canvas.width = actualWidth * devicePixelRatio;
      canvas.height = actualHeight * devicePixelRatio;
      canvas.style.width = `${actualWidth}px`;
      canvas.style.height = `${actualHeight}px`;

      // 缩放画布以适应高DPI显示
      ctx.scale(devicePixelRatio, devicePixelRatio);

      ctx.clearRect(0, 0, actualWidth, actualHeight);

      const cellWidth = actualWidth / 12;
      const cellHeight = actualHeight / 8;

      console.log('GridOverlay: Rendering grid with dimensions:', actualWidth, 'x', actualHeight, 'cell:', cellWidth, 'x', cellHeight);

      // 绘制网格单元格背景色
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 12; x++) {
          const cellX = x * cellWidth;
          const cellY = y * cellHeight;
          const areaInfo = getAreaType(x, y);

          // 绘制单元格背景色（更透明）
          ctx.fillStyle = areaInfo.color;
          ctx.fillRect(cellX, cellY, cellWidth, cellHeight);

          if (showLabels) {
            // 坐标显示 - 居中在上方
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = `${Math.max(6, cellWidth * 0.08)}px "SF Mono", "Monaco", "Consolas", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`${x},${y}`, cellX + cellWidth / 2, cellY + 3);

            // 区域类型显示 - 换行处理和更小字体
            ctx.fillStyle = areaInfo.textColor;
            const fontSize = Math.max(6, cellWidth * 0.06);
            ctx.font = `${fontSize}px "SF Mono", "Monaco", "Consolas", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 换行处理长文本
            const words = areaInfo.name.split(' ');
            if (words.length > 1 && areaInfo.name === 'Abandoned Factory') {
              // 处理 "Abandoned Factory" 换行
              ctx.fillText('Abandoned', cellX + cellWidth / 2, cellY + cellHeight / 2 - 3);
              ctx.fillText('Factory', cellX + cellWidth / 2, cellY + cellHeight / 2 + fontSize + 1);
            } else {
              // 单行文本
              ctx.fillText(areaInfo.name, cellX + cellWidth / 2, cellY + cellHeight / 2 + 8);
            }
          }
        }
      }

      // 绘制交点处的白色十字线
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;

      // 在每个网格交点处绘制十字
      for (let y = 0; y <= 8; y++) {
        for (let x = 0; x <= 12; x++) {
          const pointX = x * cellWidth;
          const pointY = y * cellHeight;

          // 十字的长度
          const crossSize = Math.min(cellWidth, cellHeight) * 0.1;

          // 绘制水平线
          ctx.beginPath();
          ctx.moveTo(pointX - crossSize, pointY);
          ctx.lineTo(pointX + crossSize, pointY);
          ctx.stroke();

          // 绘制垂直线
          ctx.beginPath();
          ctx.moveTo(pointX, pointY - crossSize);
          ctx.lineTo(pointX, pointY + crossSize);
          ctx.stroke();
        }
      }

      // 图例已移除 - 不再显示
    };

    // 使用setTimeout确保DOM渲染完成
    const timeoutId = setTimeout(renderGrid, 10);

    return () => clearTimeout(timeoutId);
  }, [showLabels, currentPeriod, studioAreas]);

  return (
    <div className={`absolute inset-0 ${className}`} style={{ zIndex: 8 }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}