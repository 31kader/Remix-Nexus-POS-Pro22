import React from 'react';
import { Store } from 'lucide-react';
import { SafeImage } from '../ui/SafeImage';
import { CompanySettings } from '../../types';

interface ConnectionBadgeInfo {
  label: string;
  dotClass: string;
  textClass: string;
}

interface CustomerDisplayHeaderProps {
  settings: CompanySettings;
  currentTime: Date;
  connectionBadge: ConnectionBadgeInfo;
}

export const CustomerDisplayHeader: React.FC<CustomerDisplayHeaderProps> = ({
  settings,
  currentTime,
  connectionBadge
}) => {
  return (
    <header className="h-20 bg-slate-900/90 border-b border-slate-800 px-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {settings.logoUrl ? (
          <SafeImage 
            src={settings.logoUrl} 
            alt="Logo" 
            className="h-12 w-auto object-contain rounded-xl" 
            fallback={
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Store size={26} />
              </div>
            }
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Store size={26} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">
            {settings.name || 'Nexus POS Pro'}
          </h1>
          <p className="text-xs text-slate-400 font-medium">Afficheur Caisse Client</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-[11px] font-bold">
          <span className={`w-2.5 h-2.5 rounded-full ${connectionBadge.dotClass}`} />
          <span className={connectionBadge.textClass}>
            {connectionBadge.label}
          </span>
        </div>

        <div className="text-right">
          <p className="text-lg font-mono font-black text-indigo-400">
            {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-slate-400 capitalize">
            {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>
    </header>
  );
};
