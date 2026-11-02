import React from 'react';
import { Printer, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../../ui';

interface ShortageExportFormatCardsProps {
  hasItems: boolean;
  onPrintA4: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
}

export const ShortageExportFormatCards: React.FC<ShortageExportFormatCardsProps> = ({
  hasItems,
  onPrintA4,
  onExportExcel,
  onExportCSV
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
      {/* Carte 1 : Impression A4 */}
      <div className="bg-industrial-900/60 p-4 rounded-2xl border border-industrial-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between group shadow-lg">
        <div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Printer size={20} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            Bon de Commande A4
          </h3>
          <p className="text-[11px] text-industrial-400 font-mono leading-relaxed">
            Document officiel prêt à imprimer ou enregistrer en PDF avec marges, en-tête et signatures.
          </p>
        </div>

        <div className="pt-4">
          <Button
            type="button"
            disabled={!hasItems}
            onClick={onPrintA4}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimer A4</span>
          </Button>
        </div>
      </div>

      {/* Carte 2 : Export Excel (.xlsx) */}
      <div className="bg-industrial-900/60 p-4 rounded-2xl border border-industrial-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group shadow-lg">
        <div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FileSpreadsheet size={20} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            Feuille Excel (.xlsx)
          </h3>
          <p className="text-[11px] text-industrial-400 font-mono leading-relaxed">
            Export structuré sécurisé avec colonnes calculées (P.U, total, codes-barres) via SheetJS.
          </p>
        </div>

        <div className="pt-4">
          <Button
            type="button"
            disabled={!hasItems}
            onClick={onExportExcel}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Carte 3 : Export CSV (.csv) */}
      <div className="bg-industrial-900/60 p-4 rounded-2xl border border-industrial-800 hover:border-amber-500/50 transition-all flex flex-col justify-between group shadow-lg">
        <div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FileText size={20} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            Fichier CSV (.csv)
          </h3>
          <p className="text-[11px] text-industrial-400 font-mono leading-relaxed">
            Format universel encodé en UTF-8 avec BOM et séparateur point-virgule compatible tableurs.
          </p>
        </div>

        <div className="pt-4">
          <Button
            type="button"
            disabled={!hasItems}
            onClick={onExportCSV}
            className="w-full bg-industrial-950 border border-industrial-700 hover:border-amber-500 text-amber-400 hover:text-white font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileText size={14} />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
