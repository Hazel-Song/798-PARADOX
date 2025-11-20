'use client';

import { useEffect, useState, useRef } from 'react';
import { Character } from '@/types/character';

interface SimpleArtistDotProps {
  character: Character | null;
  className?: string;
}

export default function SimpleArtistDot({ character, className = '' }: SimpleArtistDotProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [trail, setTrail] = useState<{ x: number; y: number; timestamp: number }[]>([]);
  const lastLogTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (character) {
      const newPos = { x: character.position.x, y: character.position.y };
      setPosition(newPos);
      setIsVisible(true);
      
      // 限制日志频率：每5秒记录一次
      const now = Date.now();
      if (now - lastLogTimeRef.current > 5000) {
        console.log('SimpleArtistDot received character update:', {
          name: character.name,
          position: newPos,
          gridPos: character.gridPosition,
          isMoving: character.isMoving,
          timestamp: now
        });
        lastLogTimeRef.current = now;
      }

      // 更新轨迹 - 保留最近500个点
      setTrail(prev => {
        const newTrail = [...prev, { ...newPos, timestamp: Date.now() }];
        // 只保留最近500个点
        return newTrail.slice(-500);
      });
    } else {
      console.log('SimpleArtistDot: character became null, hiding dot');
      setIsVisible(false);
    }
  }, [character]);

  // 绘制轨迹 - 平滑曲线，透明度渐变
  useEffect(() => {
    if (!canvasRef.current || trail.length < 2) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();

    // 设置canvas大小
    canvas.width = rect.width;
    canvas.height = rect.height;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制平滑轨迹
    if (trail.length > 2) {
      const now = Date.now();

      // 使用贝塞尔曲线绘制平滑路径
      for (let i = 1; i < trail.length - 1; i++) {
        const point = trail[i];
        const prevPoint = trail[i - 1];
        const nextPoint = trail[i + 1];

        // 计算年龄和透明度
        const age = now - point.timestamp;
        const pointIndex = i / trail.length; // 点在轨迹中的相对位置 (0-1)

        // 前30秒内渐变，之后根据位置降低透明度
        let alpha = Math.max(0.1, 1 - age / 30000); // 30秒内从1渐变到0.1

        // 对于较早的点（前半部分），进一步降低透明度
        if (pointIndex < 0.5) {
          alpha = alpha * (0.3 + pointIndex); // 越早的点越透明
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1.5; // 减少线宽
        ctx.lineCap = 'butt'; // 使用直角端点，让虚线更规律
        ctx.lineJoin = 'miter';

        // 设置虚线样式 - 更清晰规律的虚线
        ctx.setLineDash([4, 2]); // 4像素实线，2像素空白

        // 绘制二次贝塞尔曲线
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.quadraticCurveTo(
          point.x,
          point.y,
          (point.x + nextPoint.x) / 2,
          (point.y + nextPoint.y) / 2
        );
        ctx.stroke();
      }

      // 绘制最后一段
      if (trail.length >= 2) {
        const lastPoint = trail[trail.length - 1];
        const secondLastPoint = trail[trail.length - 2];
        const age = now - lastPoint.timestamp;
        const alpha = Math.max(0.1, 1 - age / 30000);

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 1.5; // 减少线宽
        ctx.lineCap = 'butt'; // 使用直角端点，让虚线更规律

        // 设置虚线样式 - 更清晰规律的虚线
        ctx.setLineDash([4, 2]); // 4像素实线，2像素空白

        ctx.beginPath();
        ctx.moveTo(secondLastPoint.x, secondLastPoint.y);
        ctx.lineTo(lastPoint.x, lastPoint.y);
        ctx.stroke();
      }
    }
  }, [trail]);

  if (!isVisible) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ zIndex: 30 }}>
      {/* 轨迹Canvas - 填满整个容器 */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
        style={{ zIndex: 25 }}
      />
      
      {/* ARTIST艺术家光点 - 强发光效果 */}
      <div
        className="absolute"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 30
        }}
      >
        {/* 白色虚线圆环轮廓 */}
        <div
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60px',
            height: '60px',
            border: '1px dashed white',
            opacity: 0.8
          }}
        />

        {/* 最外层大光晕 - 2倍大小 */}
        <div
          className="absolute rounded-full opacity-20"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
            filter: 'blur(8px)'
          }}
        />

        {/* 中层光晕 - 2倍大小 */}
        <div
          className="absolute rounded-full opacity-40"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '48px',
            height: '48px',
            background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%)',
            filter: 'blur(4px)'
          }}
        />

        {/* 内层强光晕 - 2倍大小 */}
        <div
          className="absolute rounded-full opacity-60"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
            background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.3) 70%)',
            filter: 'blur(2px)'
          }}
        />

        {/* 核心光点 - 2倍大小 */}
        <div
          className="absolute rounded-full bg-white"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            boxShadow: '0 0 8px 2px rgba(255,255,255,0.9), 0 0 4px 1px rgba(255,255,255,1)'
          }}
        />

        {/* ARTIST标签 - 始终显示 */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-white text-xs font-mono opacity-90 tracking-wider">
          ARTIST
        </div>
      </div>
    </div>
  );
}