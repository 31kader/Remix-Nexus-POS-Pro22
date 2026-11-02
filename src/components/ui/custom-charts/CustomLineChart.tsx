import React, { useState } from 'react';
import { ChartTooltip } from './ChartTooltip';

export interface LineChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  height?: number;
  currency?: string;
  fillColor?: string;
  strokeColor?: string;
}

export function CustomLineChart({
  data = [],
  xKey,
  yKey,
  height = 300,
  currency = 'DA',
  strokeColor = '#818cf8',
}: LineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-white/30 text-xs uppercase font-black tracking-widest" style={{ height }}>
        Aucune donnée disponible
      </div>
    );
  }

  const values = data.map(d => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const minVal = 0;
  const valRange = maxVal - minVal;

  // Layout params
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;
  const chartWidth = 600;
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Calculate points
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * innerWidth;
    const val = Number(d[yKey]) || 0;
    const y = paddingTop + innerHeight - ((val - minVal) / valRange) * innerHeight;
    return { x, y, value: val, label: d[xKey] };
  });

  // SVG Line path
  const lineD = points.reduce((path, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, '');

  // SVG Area path (closed polygon)
  const areaD = points.length > 0
    ? `${lineD} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`
    : '';

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const relativeX = (mouseX / svgRect.width) * chartWidth;

    // Find closest point on X axis
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - relativeX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredIdx(closestIdx);
    
    // Scale coordinates back to client space for absolute positioning
    const pt = points[closestIdx];
    const clientX = (pt.x / chartWidth) * svgRect.width;
    const clientY = (pt.y / chartHeight) * svgRect.height;
    setTooltipPos({ x: clientX, y: clientY });
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  // Generate grid ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const val = minVal + pct * valRange;
    const y = paddingTop + innerHeight - pct * innerHeight;
    return { val, y };
  });

  return (
    <div className="w-full relative select-none">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
          <style>{`
            .grid-line { stroke: rgba(255,255,255,0.03); stroke-dasharray: 3 3; }
            .axis-text { font-family: monospace; font-size: 10px; font-weight: 900; fill: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.05em; }
            .spark-line { stroke: ${strokeColor}; stroke-width: 4; fill: none; stroke-linecap: round; stroke-linejoin: round; transition: all 0.3s ease; }
            .area-poly { fill: url(#areaGradient); }
            .indicator-circle { fill: #fff; stroke: ${strokeColor}; stroke-width: 3; transition: all 0.15s ease-out; }
            .interactive-bar { stroke: rgba(99,102,241,0.06); stroke-width: 1; pointer-events: none; }
          `}</style>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => (
          <g key={`y-grid-${i}`}>
            <line x1={paddingLeft} y1={tick.y} x2={chartWidth - paddingRight} y2={tick.y} className="grid-line" />
            <text x={paddingLeft - 10} y={tick.y + 4} textAnchor="end" className="axis-text">
              {tick.val >= 1000 ? `${(tick.val / 1000).toFixed(1)}k` : tick.val.toFixed(0)}
            </text>
          </g>
        ))}

        {/* X Axis Ticks */}
        {points.map((pt, i) => (
          <g key={`x-tick-${i}`}>
            {(i % Math.ceil(points.length / 7) === 0 || i === points.length - 1) && (
              <text x={pt.x} y={chartHeight - 15} textAnchor="middle" className="axis-text">
                {pt.label}
              </text>
            )}
          </g>
        ))}

        {/* Shaded Area */}
        {areaD && <path d={areaD} className="area-poly" />}

        {/* Main Line */}
        {lineD && <path d={lineD} className="spark-line" />}

        {/* Hover elements */}
        {hoveredIdx !== null && (
          <g>
            <line
              x1={points[hoveredIdx].x}
              y1={paddingTop}
              x2={points[hoveredIdx].x}
              y2={paddingTop + innerHeight}
              className="interactive-bar"
            />
            <circle
              cx={points[hoveredIdx].x}
              cy={points[hoveredIdx].y}
              r={6}
              className="indicator-circle"
            />
          </g>
        )}
      </svg>

      {hoveredIdx !== null && (
        <ChartTooltip
          active={true}
          x={tooltipPos.x}
          y={tooltipPos.y}
          content={
            <div className="text-center font-mono">
              <span className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-1">{points[hoveredIdx].label}</span>
              <span className="text-sm font-black text-indigo-400">{points[hoveredIdx].value.toFixed(2)} {currency}</span>
            </div>
          }
        />
      )}
    </div>
  );
}
