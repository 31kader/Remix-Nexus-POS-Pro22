import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../ui';
import { cn } from '../../lib/utils';

interface StatCardProps {
  icon: React.ReactNode, 
  label: string, 
  value: string | number, 
  trend: string, 
  color: 'emerald' | 'indigo' | 'rose' 
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, color }) => {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
  };
  return (
    <Card className="p-6 sm:p-8 flex items-center gap-6 sm:gap-8 bg-white/5 backdrop-blur-3xl border-white/5 shadow-2xl rounded-[2.5rem] hover:bg-white/10 transition-all group overflow-hidden relative ring-1 ring-white/5">
      <div className={cn(
        "absolute top-0 left-0 w-full h-[3px] opacity-0 group-hover:opacity-100 transition-opacity",
        color === 'emerald' ? "bg-emerald-500" : color === 'rose' ? "bg-rose-500" : "bg-indigo-500"
      )}></div>
      <div className={cn(
        "w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-2xl border",
        colors[color]
      )}>
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { 
          size: 32,
          strokeWidth: 2.5,
          className: cn((icon as any).props?.className, "text-current")
        })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] text-white/40 font-black uppercase tracking-[0.3em]">{label}</p>
        <h4 className="text-2xl sm:text-4xl font-black text-white mt-2 truncate font-mono tracking-tighter italic">{value}</h4>
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] sm:text-xs font-black mt-3 shadow-sm border ring-1 ring-white/5",
          trend.includes('+') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : color === 'rose' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        )}>
          {trend.includes('+') ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trend}
        </div>
      </div>
    </Card>
  );
};
