'use client';

import { useEffect, useRef } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';

interface BackgroundGridProps {
  gridSystem: GridSystem;
  className?: string;
}

export default function BackgroundGrid({ gridSystem, className = '' }: BackgroundGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const { cellSize } = gridSystem.getGridInfo();

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 填充黑色背景
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制网格图案
      for (let y = 0; y < canvas.height; y += cellSize) {
        for (let x = 0; x < canvas.width; x += cellSize) {
          const gridX = Math.floor(x / cellSize);
          const gridY = Math.floor(y / cellSize);
          const cells = gridSystem.getAllCells();
          const cell = cells[gridY]?.[gridX];

          if (!cell) continue;

          // 获取该网格单元的标签数量
          const tagCount = gridSystem.getTagCount(gridX, gridY);

          // 根据标签数量决定网格样式
          if (tagCount >= 2) {
            // 被标记两次或以上 - 工作室 - 最小方格（密集）
            drawSquarePattern(ctx, x, y, cellSize / 4, cellSize, 'rgba(255, 200, 100, 0.5)');
          } else if (tagCount === 1) {
            // 被标记一次 - 中等方格
            drawSquarePattern(ctx, x, y, cellSize / 2, cellSize, 'rgba(255, 255, 255, 0.35)');
          } else if (cell.category.type === 'industrial') {
            // 工业/废弃工厂 - 大方格（最稀疏）
            drawSquarePattern(ctx, x, y, cellSize, cellSize, 'rgba(255, 255, 255, 0.25)');
          }
        }
      }
    };

    const drawSquarePattern = (
      ctx: CanvasRenderingContext2D,
      startX: number,
      startY: number,
      squareSize: number,
      cellSize: number,
      color: string
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

      // 在单元格内绘制小方格图案
      for (let y = startY; y < startY + cellSize; y += squareSize) {
        for (let x = startX; x < startX + cellSize; x += squareSize) {
          ctx.strokeRect(x, y, squareSize, squareSize);
        }
      }
    };

    // 初始绘制
    drawGrid();

    // 定期重绘以响应标签变化
    const interval = setInterval(drawGrid, 500);

    return () => {
      clearInterval(interval);
    };
  }, [gridSystem]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
