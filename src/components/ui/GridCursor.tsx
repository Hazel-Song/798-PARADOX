'use client';

import { useRef, useEffect, useState } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { Character } from '@/types/character';

interface GridCursorProps {
  gridSystem: GridSystem;
  character: Character | null;
  className?: string;
  onManualEvaluation?: () => void;
  onRegenerateTrajectory?: () => void;
  onToggleMovement?: () => void;
  onSpeedChange?: (speed: number) => void;
  aiServiceStatus?: { pending: number; processing: boolean };
  evaluationInterval?: number;
  evaluationCount?: number;
  lastKeywords?: string[];
}

export default function GridCursor({ 
  gridSystem, 
  character, 
  className = '', 
  onManualEvaluation,
  onRegenerateTrajectory,
  onToggleMovement,
  onSpeedChange,
  aiServiceStatus = { pending: 0, processing: false },
  evaluationInterval = 20,
  evaluationCount = 0,
  lastKeywords = []
}: GridCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [gridInfo, setGridInfo] = useState<{ width: number; height: number; cellSize: number } | null>(null);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (!gridSystem) return;
    
    const info = gridSystem.getGridInfo();
    setGridInfo(info);
  }, [gridSystem]);

  useEffect(() => {
    if (!canvasRef.current || !gridInfo) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // 设置画布大小
    const parent = canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // 保存画布尺寸用于坐标计算
      setCanvasDimensions({ width: rect.width, height: rect.height });
    }

    const render = () => {
      if (!character) return;

      // 清除画布
      ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

      // 绘制网格
      drawGrid(ctx);
      
      // 绘制ARTIST的位置cursor
      drawCursor(ctx);
      
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gridInfo, character]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    if (!gridInfo) return;

    const { width, height, cellSize } = gridInfo;
    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;

    // 绘制垂直线
    for (let x = 0; x <= width; x++) {
      const xPos = (x * canvasWidth) / width;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, canvasHeight);
      ctx.stroke();
    }

    // 绘制水平线
    for (let y = 0; y <= height; y++) {
      const yPos = (y * canvasHeight) / height;
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(canvasWidth, yPos);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawCursor = (ctx: CanvasRenderingContext2D) => {
    if (!character || !gridInfo) return;

    const { width, height } = gridInfo;
    const canvasWidth = ctx.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = ctx.canvas.height / (window.devicePixelRatio || 1);

    // 直接使用角色的画布坐标位置
    const x = character.position.x;
    const y = character.position.y;
    
    // 为了显示用，还是计算网格位置
    const cellWidth = canvasWidth / width;
    const cellHeight = canvasHeight / height;
    
    // 调试信息 - 偶尔输出
    if (Math.random() < 0.005) { // 0.5%概率输出调试信息
      console.log('========== RENDER DEBUG ==========');
      console.log('Canvas size for rendering:', { canvasWidth, canvasHeight, width, height });
      console.log('Character position:', { x, y });
      console.log('Character grid position:', character.gridPosition);
      console.log('Cell dimensions:', { cellWidth, cellHeight });
      console.log('==================================');
    }

    const time = Date.now() * 0.003;
    
    ctx.save();

    // 绘制高亮网格单元格 - 基于实际位置计算网格单元
    const currentGridX = Math.floor(x / cellWidth);
    const currentGridY = Math.floor(y / cellHeight);
    
    const cellAlpha = 0.2 + Math.sin(time) * 0.1;
    ctx.fillStyle = `rgba(255, 255, 255, ${cellAlpha})`;
    ctx.fillRect(currentGridX * cellWidth, currentGridY * cellHeight, cellWidth, cellHeight);

    // 绘制网格单元格边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(currentGridX * cellWidth, currentGridY * cellHeight, cellWidth, cellHeight);

    // 绘制中心cursor
    const pulseScale = 1 + Math.sin(time * 2) * 0.2;
    const cursorSize = 8 * pulseScale;
    
    // 外圈
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, cursorSize, 0, Math.PI * 2);
    ctx.stroke();
    
    // 内核
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x, y, cursorSize * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // 中心点
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    // 绘制十字准线
    const crossSize = cursorSize * 1.8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // 垂直线
    ctx.beginPath();
    ctx.moveTo(x, y - crossSize);
    ctx.lineTo(x, y + crossSize);
    ctx.stroke();
    
    // 水平线
    ctx.beginPath();
    ctx.moveTo(x - crossSize, y);
    ctx.lineTo(x + crossSize, y);
    ctx.stroke();
    
    ctx.setLineDash([]);

    // 绘制坐标标签
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x + 15, y - 25, 60, 20);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 15, y - 25, 60, 20);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // 使用角色的实际画布坐标
    const displayX = character.position.x.toFixed(2);
    const displayY = character.position.y.toFixed(2);
    ctx.fillText(`Canvas(${displayX},${displayY})`, x + 18, y - 15);

    // 移动状态指示器
    if (character.isMoving) {
      const targetGridX = Math.floor((character.targetPosition.x / canvasWidth) * width);
      const targetGridY = Math.floor((character.targetPosition.y / canvasHeight) * height);
      
      const targetX = targetGridX * cellWidth + cellWidth / 2;
      const targetY = targetGridY * cellHeight + cellHeight / 2;
      
      // 绘制移动轨迹线
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // 目标点指示器
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const handleResize = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // 更新画布尺寸
      setCanvasDimensions({ width: rect.width, height: rect.height });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ 
          width: '100%', 
          height: '100%',
          zIndex: 15 // 在背景和WanderingCharacter之上
        }}
      />
      
    </div>
  );
}