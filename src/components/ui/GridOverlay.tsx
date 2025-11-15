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


  // 获取每个网格单元的区域类型（根据年代不同）
  const getAreaType = (gridX: number, gridY: number) => {
    const gridKey = `${gridX}-${gridY}`;
    
    // 优先检查是否为工作室区域
    if (studioAreas.has(gridKey)) {
      return { type: 'studio', color: 'rgba(138, 43, 226, 0.4)', textColor: '#8A2BE2', name: '工作室' };
    }
    if (currentPeriod === '1995-2000') {
      // 1995-2000年代：80%废弃工厂区，20%城区
      const centerX = 12 / 2;
      const centerY = 8 / 2;
      const distanceFromCenter = Math.sqrt((gridX - centerX) ** 2 + (gridY - centerY) ** 2);
      const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
      const normalizedDistance = distanceFromCenter / maxDistance;

      if (normalizedDistance > 0.8) {
        // 外围20%：城区（黑色）
        return { type: 'urban', color: 'rgba(0, 0, 0, 0.4)', textColor: '#666666', name: '城区' };
      } else {
        // 其余80%：废弃工厂
        return { type: 'industrial', color: 'rgba(105, 105, 105, 0.3)', textColor: '#A9A9A9', name: '废弃工厂' };
      }
    } else {
      // 其他年代保持原来的分类逻辑
      const centerX = 12 / 2;
      const centerY = 8 / 2;
      const distanceFromCenter = Math.sqrt((gridX - centerX) ** 2 + (gridY - centerY) ** 2);
      const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
      const normalizedDistance = distanceFromCenter / maxDistance;

      if (normalizedDistance < 0.3) {
        return { type: 'gallery', color: 'rgba(255, 215, 0, 0.3)', textColor: '#FFD700', name: '画廊' };
      } else if (normalizedDistance < 0.5) {
        return { type: 'studio', color: 'rgba(138, 43, 226, 0.3)', textColor: '#8A2BE2', name: '工作室' };
      } else if (normalizedDistance < 0.7) {
        return { type: 'commercial', color: 'rgba(255, 69, 0, 0.3)', textColor: '#FF4500', name: '商业' };
      } else if (normalizedDistance < 0.85) {
        return { type: 'residential', color: 'rgba(0, 128, 0, 0.3)', textColor: '#32CD32', name: '住宅' };
      } else if (normalizedDistance < 0.95) {
        return { type: 'industrial', color: 'rgba(105, 105, 105, 0.3)', textColor: '#A9A9A9', name: '工业' };
      } else {
        return { type: 'public', color: 'rgba(30, 144, 255, 0.3)', textColor: '#1E90FF', name: '公共' };
      }
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // 设置画布大小为600x400（固定）
    canvas.width = 600;
    canvas.height = 400;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    ctx.clearRect(0, 0, 600, 400);
    
    const cellWidth = 600 / 12; // 50px
    const cellHeight = 400 / 8;  // 50px
    
    // 绘制网格单元格背景色和ASCII纹理
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 12; x++) {
        const cellX = x * cellWidth;
        const cellY = y * cellHeight;
        const areaInfo = getAreaType(x, y);
        
        // 绘制单元格背景色
        ctx.fillStyle = areaInfo.color;
        ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
        
        if (showLabels) {
          // 更精致的坐标显示
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = '8px "SF Mono", "Monaco", "Consolas", monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(`${x},${y}`, cellX + 3, cellY + 3);
          
          // 更精致的区域类型显示
          ctx.fillStyle = areaInfo.textColor;
          ctx.font = '10px "SF Pro Display", "Helvetica Neue", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            areaInfo.name, 
            cellX + cellWidth / 2, 
            cellY + cellHeight / 2 + 6
          );
        }
      }
    }
    
    // 绘制网格线 - 更细更优雅
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    
    // 绘制垂直线
    for (let x = 0; x <= 12; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellWidth, 0);
      ctx.lineTo(x * cellWidth, 400);
      ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y <= 8; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellHeight);
      ctx.lineTo(600, y * cellHeight);
      ctx.stroke();
    }

    // 绘制图例
    if (showLabels) {
      drawLegend(ctx);
    }
    
  }, [showLabels, currentPeriod, studioAreas]);

  const drawLegend = (ctx: CanvasRenderingContext2D) => {
    let legend;
    
    if (currentPeriod === '1995-2000') {
      legend = [
        { type: 'industrial', color: 'rgba(105, 105, 105, 0.8)', textColor: '#A9A9A9', name: '废弃工厂' },
        { type: 'urban', color: 'rgba(0, 0, 0, 0.8)', textColor: '#666666', name: '城区' }
      ];
      
      // 如果有工作室区域，添加到图例中
      if (studioAreas.size > 0) {
        legend.unshift({ type: 'studio', color: 'rgba(138, 43, 226, 0.8)', textColor: '#8A2BE2', name: '工作室' });
      }
    } else {
      legend = [
        { type: 'gallery', color: 'rgba(255, 215, 0, 0.8)', textColor: '#FFD700', name: '画廊区域' },
        { type: 'studio', color: 'rgba(138, 43, 226, 0.8)', textColor: '#8A2BE2', name: '工作室区域' },
        { type: 'commercial', color: 'rgba(255, 69, 0, 0.8)', textColor: '#FF4500', name: '商业区域' },
        { type: 'residential', color: 'rgba(0, 128, 0, 0.8)', textColor: '#32CD32', name: '住宅区域' },
        { type: 'industrial', color: 'rgba(105, 105, 105, 0.8)', textColor: '#A9A9A9', name: '工业区域' },
        { type: 'public', color: 'rgba(30, 144, 255, 0.8)', textColor: '#1E90FF', name: '公共区域' }
      ];
    }

    const legendX = 10;
    const legendY = 280;
    const legendWidth = 110;
    const legendHeight = 20 + legend.length * 12 + 8; // 更紧凑的高度

    // 绘制图例背景 - 更现代的样式
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // 绘制图例标题
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '10px "SF Pro Display", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('区域类型', legendX + 8, legendY + 8);

    // 绘制图例项目
    legend.forEach((item, index) => {
      const itemY = legendY + 20 + index * 12;
      
      // 绘制颜色方块 - 更小更精致
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 8, itemY + 1, 8, 8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(legendX + 8, itemY + 1, 8, 8);
      
      // 绘制文字
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '9px "SF Pro Display", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(item.name, legendX + 20, itemY + 2);
    });
  };

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