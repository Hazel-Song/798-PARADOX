'use client';

import { useEffect, useRef } from 'react';
import p5 from 'p5';

interface P5WrapperProps {
  sketch: (p: p5) => void;
  className?: string;
}

export default function P5Wrapper({ sketch, className = '' }: P5WrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (containerRef.current && !p5InstanceRef.current) {
      p5InstanceRef.current = new p5(sketch, containerRef.current);
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [sketch]);

  return <div ref={containerRef} className={className} />;
}