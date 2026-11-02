import React from 'react';

export interface TooltipProps {
  active: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

export function ChartTooltip({ active, x, y, content }: TooltipProps) {
  if (!active) return null;
  return (
    <div
      className="absolute z-50 pointer-events-none px-4 py-3 bg-slate-950/95 border border-white/10 rounded-xl shadow-md text-xs text-white"
      style={{
        left: `${x}px`,
        top: `${y - 10}px`,
        transform: 'translate(-50%, -100%)',
        transition: 'left 0.1s ease-out, top 0.1s ease-out',
      }}
    >
      {content}
    </div>
  );
}
