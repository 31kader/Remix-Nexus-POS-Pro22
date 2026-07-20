import React, { useState } from 'react';

// Common Tooltip Component
interface TooltipProps {
  active: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
}

export function ChartTooltip({ active, x, y, content }: TooltipProps) {
  if (!active) return null;
  return (
    <div
      className="absolute z-50 pointer-events-none px-4 py-3 bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl text-xs text-white"
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

// 1. CUSTOM LINE / AREA CHART
interface LineChartProps {
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
  currency = '€',
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

// 2. CUSTOM BAR CHART (Handles Vertical/Horizontal Layouts and Dual Series)
interface BarChartProps {
  data: any[];
  xKey: string;
  yKeys: string[]; // Supports multiple bars (e.g. ['value'] or ['revenue', 'quantity'])
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
  currency = '€',
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

// 3. CUSTOM PIE / DONUT CHART
interface PieChartProps {
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
  currency = '€',
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
            <text x={center} y={center - 5} textAnchor="middle" className="fill-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Total</text>
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
