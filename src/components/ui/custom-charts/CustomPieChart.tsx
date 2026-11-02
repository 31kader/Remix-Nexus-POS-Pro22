import React, { useState } from 'react';
import { ChartTooltip } from './ChartTooltip';

export interface PieChartProps {
  data: any[];
  nameKey: string;
  valueKey: string;
  height?: number;
  currency?: string;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
}

export function CustomPieChart({
  data = [],
  nameKey,
  valueKey,
  height = 300,
  currency = 'DA',
  colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  innerRadius = 60,
  outerRadius = 100,
}: PieChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-white/30 text-xs uppercase font-black tracking-widest" style={{ height }}>
        Aucune donnée disponible
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0);
  const chartSize = 300;
  const center = chartSize / 2;

  // Calculate angles and drawing paths for donut slices
  let accumulatedAngle = -90; // Start at top

  const slices = data.map((d, i) => {
    const val = Number(d[valueKey]) || 0;
    const percentage = total > 0 ? (val / total) : 0;
    const angleRange = percentage * 360;

    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angleRange;
    accumulatedAngle = endAngle;

    // Convert polar to cartesian coordinates
    const toRadians = (deg: number) => (deg * Math.PI) / 180;
    const getCoordinates = (radius: number, angleDegrees: number) => {
      const angleRadians = toRadians(angleDegrees);
      return {
        x: center + radius * Math.cos(angleRadians),
        y: center + radius * Math.sin(angleRadians),
      };
    };

    const outerStart = getCoordinates(outerRadius, startAngle);
    const outerEnd = getCoordinates(outerRadius, endAngle);
    const innerStart = getCoordinates(innerRadius, startAngle);
    const innerEnd = getCoordinates(innerRadius, endAngle);

    // SVG arc format: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    const largeArcFlag = angleRange > 180 ? 1 : 0;
    const pathD = percentage === 1
      ? `M ${center} ${center - outerRadius}
         A ${outerRadius} ${outerRadius} 0 1 1 ${center - 0.01} ${center - outerRadius}
         M ${center} ${center - innerRadius}
         A ${innerRadius} ${innerRadius} 0 1 0 ${center - 0.01} ${center - innerRadius}`
      : `M ${outerStart.x} ${outerStart.y}
         A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}
         L ${innerEnd.x} ${innerEnd.y}
         A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}
         Z`;

    return {
      pathD,
      name: d[nameKey],
      value: val,
      percentage: percentage * 100,
      color: colors[i % colors.length],
    };
  });

  const handleSliceHover = (e: React.MouseEvent, idx: number) => {
    const svgRect = e.currentTarget.ownerDocument.getElementById(`pie-chart-${nameKey}`)?.getBoundingClientRect();
    if (!svgRect) return;

    setHoveredIdx(idx);

    const clientX = e.clientX - svgRect.left;
    const clientY = e.clientY - svgRect.top;
    setTooltipPos({ x: clientX, y: clientY });
  };

  return (
    <div className="w-full flex flex-col items-center justify-center relative select-none">
      <div className="relative" style={{ width: chartSize, height: chartSize }}>
        <svg
          id={`pie-chart-${nameKey}`}
          viewBox={`0 0 ${chartSize} ${chartSize}`}
          className="w-full h-full"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <style>{`
              .pie-slice { transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1); transform-origin: ${center}px ${center}px; cursor: pointer; }
              .pie-slice:hover { transform: scale(1.05); }
              .pie-slice-path { stroke: #0f172a; stroke-width: 2; transition: all 0.2s ease; }
            `}</style>
          </defs>

          {slices.map((slice, idx) => (
            <g
              key={`slice-${idx}`}
              className="pie-slice"
              onMouseMove={(e) => handleSliceHover(e, idx)}
            >
              <path
                d={slice.pathD}
                fill={slice.color}
                className="pie-slice-path"
                fillOpacity={hoveredIdx === null || hoveredIdx === idx ? 1 : 0.6}
              />
            </g>
          ))}

          {/* Center text for donut chart */}
          <circle cx={center} cy={center} r={innerRadius - 2} fill="#09090b" className="opacity-90" />
          <g className="pointer-events-none">
            <text x={center} y={center - 5} textAnchor="middle" className="fill-white/40 text-[10px] font-black uppercase tracking-normal">Total</text>
            <text x={center} y={center + 15} textAnchor="middle" className="fill-white text-base font-black font-mono tracking-tighter">
              {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
            </text>
          </g>
        </svg>

        {hoveredIdx !== null && (
          <ChartTooltip
            active={true}
            x={tooltipPos.x}
            y={tooltipPos.y}
            content={
              <div className="text-center font-mono">
                <span className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-1">{slices[hoveredIdx].name}</span>
                <span className="text-sm font-black text-indigo-400">{slices[hoveredIdx].value.toFixed(2)} {currency}</span>
                <span className="block text-[9px] text-emerald-400 font-bold mt-0.5">({slices[hoveredIdx].percentage.toFixed(1)}%)</span>
              </div>
            }
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 px-4 max-w-md">
        {slices.map((slice, idx) => (
          <div key={`legend-${idx}`} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: slice.color }} />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors cursor-default">
              {slice.name} ({slice.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
