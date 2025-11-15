'use client';

import { useEffect, useRef, useState } from 'react';

interface DistortedImageProps {
  src: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function DistortedImage({
  src,
  width,
  height,
  className = '',
  style = {}
}: DistortedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      drawScanlineEffect(ctx, img, canvas);
    };
    img.src = src;
  }, [src]);

  const drawScanlineEffect = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image in grayscale
    ctx.filter = 'grayscale(100%) contrast(1.2)';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Create vertical scanline effect (thin vertical lines)
    const lineWidth = 2; // Width of each scanline
    const lineSpacing = 4; // Spacing between scanlines

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black lines

    for (let x = 0; x < canvas.width; x += lineSpacing) {
      ctx.fillRect(x, 0, lineWidth, canvas.height);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        objectFit: 'cover',
        ...style
      }}
    />
  );
}
