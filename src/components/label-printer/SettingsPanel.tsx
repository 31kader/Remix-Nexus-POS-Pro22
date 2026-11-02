import React from 'react';
import { Settings } from 'lucide-react';
import { LabelPrinterState } from './types';
import { PRESETS } from './useLabelPrinter';
import {
  DimensionsConfigSection,
  LayoutStructureSection,
  ElementTogglesSection,
  CustomTextAndAdjustmentsSection
} from './settings';

interface SettingsPanelProps {
  state: LabelPrinterState;
  handlePresetChange: (id: string) => void;
  handlePaddingBaseChange: (val: number) => void;
}

export function SettingsPanel({ state, handlePresetChange, handlePaddingBaseChange }: SettingsPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md h-[580px] overflow-y-auto custom-scrollbar space-y-5">
      <div>
        <h3 className="font-bold text-white text-sm uppercase mb-1 flex items-center gap-2">
          <Settings size={15} className="text-indigo-400" /> 2. Configurer le Layout (100% Libre)
        </h3>
        <p className="text-xs text-slate-400">Réglez l'étiquette au millimètre près en temps réel.</p>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Format Prédéfini</label>
        <select 
          value={state.activePreset} 
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
        >
          {PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* 1. Dimensions, Orientation & Marges */}
      <DimensionsConfigSection
        state={state}
        handlePaddingBaseChange={handlePaddingBaseChange}
      />

      {/* 2. Organisation de Mise en Page */}
      <LayoutStructureSection state={state} />

      {/* 3. Éléments de l'Étiquette (Toggles & Tailles) */}
      <ElementTogglesSection state={state} />

      {/* 4. Texte Personnalisé & Ajustements Fins */}
      <CustomTextAndAdjustmentsSection state={state} />
    </div>
  );
}
