'use client';

import { useEffect, useRef, useState } from 'react';
import { GridSystem } from '@/lib/map-grid/GridSystem';
import { GridRenderer } from '@/lib/map-grid/GridRenderer';

interface MapGridCanvasProps {
  width?: number;
  height?: number;
  onPositionHover?: (keywords: string[]) => void;
  onPositionClick?: (keywords: string[], position: { x: number, y: number }) => void;
}

export default function MapGridCanvas({ 
  width = 800, 
  height = 600, 
  onPositionHover,
  onPositionClick 
}: MapGridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridSystemRef = useRef<GridSystem | null>(null);
  const rendererRef = useRef<GridRenderer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentKeywords, setCurrentKeywords] = useState<string[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // 初始化网格系统
    gridSystemRef.current = new GridSystem(width, height, 50);
    
    // 初始化渲染器
    rendererRef.current = new GridRenderer(canvas, gridSystemRef.current);
    
    // 开始渲染
    rendererRef.current.startRendering();
    
    setIsInitialized(true);

    return () => {
      if (rendererRef.current) {
        rendererRef.current.stopRendering();
      }
    };
  }, [width, height]);

  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const keywords = rendererRef.current.getKeywordsAtMousePosition(mouseX, mouseY);
    setCurrentKeywords(keywords);
    
    if (onPositionHover) {
      onPositionHover(keywords);
    }

    // 高亮当前位置
    if (keywords.length > 0) {
      rendererRef.current.highlightPosition(mouseX, mouseY);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const keywords = rendererRef.current.getKeywordsAtMousePosition(mouseX, mouseY);
    
    if (onPositionClick && keywords.length > 0) {
      onPositionClick(keywords, { x: mouseX, y: mouseY });
    }
  };

  const adjustGlitchIntensity = (intensity: number) => {
    if (rendererRef.current) {
      rendererRef.current.setGlitchIntensity(intensity);
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-white/30 cursor-crosshair"
        style={{ width: `${width}px`, height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      
      {/* 控制面板 */}
      {isInitialized && (
        <div className="absolute top-2 left-2 bg-black/70 border border-white/30 p-2 text-xs text-white">
          <div className="mb-2">
            <label className="block mb-1">故障强度:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0.3"
              onChange={(e) => adjustGlitchIntensity(parseFloat(e.target.value))}
              className="w-20"
            />
          </div>
          
          <div className="text-xs">
            <div>网格: {gridSystemRef.current?.getGridInfo().width} × {gridSystemRef.current?.getGridInfo().height}</div>
            <div>关键词数: {gridSystemRef.current?.getKeywordStats().size}</div>
          </div>
        </div>
      )}
      
      {/* 当前位置信息 */}
      {currentKeywords.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-black/70 border border-white/30 p-2 text-xs text-white max-w-48">
          <div className="mb-1 text-white/70">当前位置关键词:</div>
          <div className="flex flex-wrap gap-1">
            {currentKeywords.map((keyword, index) => (
              <span 
                key={index} 
                className="px-1 py-0.5 border border-white/20 bg-white/10 text-xs"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}