import React, { useState } from 'react';
import { ChartTooltip } from './ChartTooltip';

export interface BarChartProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  layout?: 'horizontal' | 'vertical';
  height?: number;
  currency?: string;
  colors?: string[];
  yAxisWidth?: number;
}

export function CustomBarChart({
  data = [],
  xKey,
  yKeys = [],
  layout = 'horizontal',
  height = 300,
  currency = 'DA',
  colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'],
  yAxisWidth = 60,
}: BarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredSeriesIdx, setHoveredSeriesIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-white/30 text-xs uppercase font-black tracking-widest" style={{ height }}>
        Aucune donnée disponible
      </div>
    );
  }

  // Find max value across all keys to scale
  const allValues: number[] = [];
  data.forEach(d => {
    yKeys.forEach(k => {
      allValues.push(Number(d[k]) || 0);
    });
  });
  const maxVal = Math.max(...allValues, 1);
  const minVal = 0;
  const valRange = maxVal - minVal;

  const chartWidth = 600;
  const chartHeight = height;

  const paddingLeft = layout === 'vertical' ? yAxisWidth + 10 : 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = layout === 'horizontal' ? 60 : 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const handleBarHover = (e: React.MouseEvent, itemIdx: number, seriesIdx: number) => {
    const svgRect = e.currentTarget.ownerDocument.getElementById(`bar-chart-${xKey}`)?.getBoundingClientRect();
    if (!svgRect) return;

    setHoveredIdx(itemIdx);
    setHoveredSeriesIdx(seriesIdx);

    const clientX = e.clientX - svgRect.left;
    const clientY = e.clientY - svgRect.top;
    setTooltipPos({ x: clientX, y: clientY });
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
    setHoveredSeriesIdx(null);
  };

  return (
    <div className="w-full relative select-none">
      <svg
        id={`bar-chart-${xKey}`}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-full"
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <style>{`
            .bar-rect { transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), fill-opacity 0.2s ease; }
            .bar-rect:hover { fill-opacity: 0.85; cursor: pointer; }
            .grid-line { stroke: rgba(255,255,255,0.03); }
            .axis-text { font-family: monospace; font-size: 10px; font-weight: 900; fill: rgba(255,255,255,0.25); text-transform: uppercase; }
            .axis-label { font-size: 8px; font-weight: bold; fill: rgba(255,255,255,0.3); text-transform: uppercase; }
          `}</style>
        </defs>

        {layout === 'horizontal' ? (
          <>
            {/* Grid & Y Axis Ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const val = minVal + pct * valRange;
              const y = paddingTop + innerHeight - pct * innerHeight;
              return (
                <g key={`y-axis-${idx}`}>
                  <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} className="grid-line" strokeDasharray="3 3" />
                  <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="axis-text">
                    {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Bars drawing */}
            {data.map((item, itemIdx) => {
              const groupWidth = innerWidth / data.length;
              const xStart = paddingLeft + itemIdx * groupWidth + groupWidth * 0.15;
              const barWidth = (groupWidth * 0.7) / yKeys.length;

              return (
                <g key={`item-${itemIdx}`}>
                  {/* Category Label */}
                  <text
                    x={paddingLeft + itemIdx * groupWidth + groupWidth / 2}
                    y={chartHeight - paddingBottom + 18}
                    textAnchor="end"
                    transform={`rotate(-35, ${paddingLeft + itemIdx * groupWidth + groupWidth / 2}, ${chartHeight - paddingBottom + 18})`}
                    className="axis-text"
                    style={{ fontSize: '9px' }}
                  >
                    {item[xKey]?.length > 12 ? `${item[xKey].slice(0, 10)}.` : item[xKey]}
                  </text>

                  {/* Draw bars side by side */}
                  {yKeys.map((key, seriesIdx) => {
                    const val = Number(item[key]) || 0;
                    const barHeight = (val / maxVal) * innerHeight;
                    const x = xStart + seriesIdx * barWidth;
                    const y = paddingTop + innerHeight - barHeight;

                    return (
                      <rect
                        key={`bar-${seriesIdx}`}
                        x={x}
                        y={y}
                        width={Math.max(barWidth - 2, 2)}
                        height={Math.max(barHeight, 2)}
                        fill={colors[seriesIdx % colors.length]}
                        rx={3}
                        className="bar-rect"
                        onMouseMove={(e) => handleBarHover(e, itemIdx, seriesIdx)}
                      />
                    );
                  })}
                </g>
              );
            })}
          </>
        ) : (
          <>
            {/* Vertical Layout (e.g. Sales by Employee) */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const val = minVal + pct * valRange;
              const x = paddingLeft + pct * innerWidth;
              return (
                <g key={`x-axis-${idx}`}>
                  <line x1={x} y1={paddingTop} x2={x} y2={chartHeight - paddingBottom} className="grid-line" strokeDasharray="3 3" />
                  <text x={x} y={chartHeight - 12} textAnchor="middle" className="axis-text">
                    {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {data.map((item, itemIdx) => {
              const groupHeight = innerHeight / data.length;
              const yStart = paddingTop + itemIdx * groupHeight + groupHeight * 0.15;
              const barHeight = (groupHeight * 0.7) / yKeys.length;

              return (
                <g key={`item-${itemIdx}`}>
                  {/* Label on left axis */}
                  <text
                    x={paddingLeft - 10}
                    y={yStart + groupHeight / 2 - 2}
                    textAnchor="end"
                    className="axis-text"
                  >
                    {item[xKey]?.length > 15 ? `${item[xKey].slice(0, 13)}...` : item[xKey]}
                  </text>

                  {/* Draw bars stack or parallel */}
                  {yKeys.map((key, seriesIdx) => {
                    const val = Number(item[key]) || 0;
                    const barWidth = (val / maxVal) * innerWidth;
                    const x = paddingLeft;
                    const y = yStart + seriesIdx * barHeight;

                    return (
                      <rect
                        key={`bar-${seriesIdx}`}
                        x={x}
                        y={y}
                        width={Math.max(barWidth, 2)}
                        height={Math.max(barHeight - 2, 2)}
                        fill={colors[seriesIdx % colors.length]}
                        rx={3}
                        className="bar-rect"
                        onMouseMove={(e) => handleBarHover(e, itemIdx, seriesIdx)}
                      />
                    );
                  })}
                </g>
              );
            })}
          </>
        )}
      </svg>

      {hoveredIdx !== null && hoveredSeriesIdx !== null && (
        <ChartTooltip
          active={true}
          x={tooltipPos.x}
          y={tooltipPos.y}
          content={
            <div className="text-center font-mono">
              <span className="block text-[10px] text-white/40 uppercase tracking-widest font-black mb-1">{data[hoveredIdx][xKey]}</span>
              <span className="block text-[9px] text-indigo-400 font-bold uppercase tracking-wider mb-0.5">{yKeys[hoveredSeriesIdx]}</span>
              <span className="text-xs font-black text-emerald-400">
                {yKeys[hoveredSeriesIdx] === 'revenue' || yKeys[hoveredSeriesIdx] === 'value'
                  ? `${Number(data[hoveredIdx][yKeys[hoveredSeriesIdx]] || 0).toFixed(2)} ${currency}`
                  : `${data[hoveredIdx][yKeys[hoveredSeriesIdx]]} unités`}
              </span>
            </div>
          }
        />
      )}
    </div>
  );
}
