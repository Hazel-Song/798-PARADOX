'use client';

import { useRef, useEffect } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';

interface PolygonOverlayProps {
  gridSystem: GridSystem;
  polygonAreas: Array<{ id: string; vertices: Array<{ x: number; y: number }> }>;
  className?: string;
}

export default function PolygonOverlay({
  gridSystem,
  polygonAreas,
  className = ''
}: PolygonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderPolygons = () => {
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
        console.log('PolygonOverlay: Canvas has zero dimensions, skipping render');
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

      console.log('PolygonOverlay: Rendering', polygonAreas.length, 'polygons');

      // 绘制每个多边形
      polygonAreas.forEach(polygon => {
        if (polygon.vertices.length < 3) return;

        // 转换网格坐标到画布坐标
        const canvasVertices = polygon.vertices.map(vertex => ({
          x: (vertex.x + 0.5) * cellWidth, // 使用网格单元中心
          y: (vertex.y + 0.5) * cellHeight
        }));

        // 绘制多边形轮廓
        ctx.beginPath();
        ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);

        for (let i = 1; i < canvasVertices.length; i++) {
          ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
        }

        ctx.closePath();

        // 设置样式：细虚线 #F9EFD4
        ctx.strokeStyle = '#F9EFD4';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]); // 4像素实线，2像素空白的虚线
        ctx.stroke();

        // 绘制对角线点阵图案（无填充色）
        ctx.globalAlpha = 0.4; // 点的透明度
        const dotSize = 1;
        const spacing = 12; // 点之间的间距

        // 获取多边形边界框
        const minX = Math.min(...canvasVertices.map(v => v.x));
        const maxX = Math.max(...canvasVertices.map(v => v.x));
        const minY = Math.min(...canvasVertices.map(v => v.y));
        const maxY = Math.max(...canvasVertices.map(v => v.y));

        // 在多边形内部绘制对角线点阵
        for (let x = minX; x <= maxX; x += spacing) {
          for (let y = minY; y <= maxY; y += spacing) {
            // 对角线偏移
            const offsetY = y + (x % (spacing * 2) === 0 ? 0 : spacing / 2);

            // 检查点是否在多边形内部
            if (isPointInPolygon({ x, y: offsetY }, canvasVertices)) {
              ctx.fillStyle = '#F9EFD4';
              ctx.beginPath();
              ctx.arc(x, offsetY, dotSize, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        }

        // 重置透明度
        ctx.globalAlpha = 1;

        console.log(`🔻 绘制多边形 ${polygon.id}:`, polygon.vertices, '→', canvasVertices);
      });
    };

    // 使用setTimeout确保DOM渲染完成
    const timeoutId = setTimeout(renderPolygons, 10);

    return () => clearTimeout(timeoutId);
  }, [polygonAreas]);

  return (
    <div className={`absolute inset-0 ${className}`} style={{ zIndex: 9 }}>
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

// 点在多边形内部检测算法（射线投射法）
function isPointInPolygon(point: { x: number; y: number }, vertices: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}