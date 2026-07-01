'use client';

import { useRef, useEffect } from 'react';
import type { GraphifyNode } from './types';
import { getNodeColor } from './colors';

interface MiniMapProps {
  readonly nodes: readonly GraphifyNode[];
  readonly width?: number;
  readonly height?: number;
}

export function MiniMap({ nodes, width = 150, height = 100 }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, width, height);

    if (nodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 5;
    const scaleX = (width - padding * 2) / rangeX;
    const scaleY = (height - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY);

    for (const node of nodes) {
      const x = ((node.x ?? 0) - minX) * scale + padding;
      const y = ((node.y ?? 0) - minY) * scale + padding;

      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = getNodeColor(node.type);
      ctx.fill();
    }
  }, [nodes, width, height]);

  return (
    <div className="absolute bottom-14 left-2 border rounded overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
      <canvas ref={canvasRef} />
    </div>
  );
}
