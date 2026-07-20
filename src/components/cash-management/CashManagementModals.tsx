import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Modal, Button } from '../ui';
import { CompanySettings } from '../../types';

interface CashManagementModalsProps {
  isOpeningModalOpen: boolean;
  setIsOpeningModalOpen: (val: boolean) => void;
  isClosingModalOpen: boolean;
  setIsClosingModalOpen: (val: boolean) => void;
  initialCash: string;
  setInitialCash: (val: string) => void;
  finalCash: string;
  setFinalCash: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  isProcessing: boolean;
  currentShiftStats: any;
  settings: CompanySettings;
  handleOpenShift: () => void;
  handleCloseShift: () => void;
}

export function CashManagementModals({
  isOpeningModalOpen,
  setIsOpeningModalOpen,
  isClosingModalOpen,
  setIsClosingModalOpen,
  initialCash,
  setInitialCash,
  finalCash,
  setFinalCash,
  notes,
  setNotes,
  isProcessing,
  currentShiftStats,
  settings,
  handleOpenShift,
  handleCloseShift
}: CashManagementModalsProps) {
  return (
    <>
      <Modal isOpen={isOpeningModalOpen} onClose={() => setIsOpeningModalOpen(false)} title="Ouverture de Caisse">
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
            <AlertCircle className="text-indigo-600" size={20} />
            <p className="text-xs text-indigo-700">
              Veuillez compter le fond de caisse initial avant de commencer la session.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Fond de caisse initial ({settings.currency})</label>
            <input 
              type="number"
              autoFocus
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
              placeholder="0.00"
              value={initialCash}
              onChange={e => setInitialCash(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && initialCash && handleOpenShift()}
            />
          </div>
          <Button onClick={handleOpenShift} className="w-full py-3" disabled={!initialCash || isProcessing}>
            {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : "Confirmer l'ouverture"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isClosingModalOpen} onClose={() => setIsClosingModalOpen(false)} title="Clôture de Caisse (Rapport Z)">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Attendu (Espèces)</p>
              <p className="text-sm font-bold text-slate-800">{currentShiftStats?.expectedCash.toFixed(2)} {settings.currency}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Total Ventes</p>
              <p className="text-sm font-bold text-indigo-700">{currentShiftStats?.totalSales.toFixed(2)} {settings.currency}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Montant réel compté ({settings.currency})</label>
            <input 
              type="number"
              autoFocus
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
              placeholder="0.00"
              value={finalCash}
              onChange={e => setFinalCash(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Notes de clôture (Optionnel)</label>
            <textarea 
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] text-sm"
              placeholder="Remarques éventuelles sur la session..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <Button onClick={handleCloseShift} className="w-full py-3 bg-rose-600 hover:bg-rose-700" disabled={!finalCash || isProcessing}>
            {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : "Confirmer la clôture & Imprimer"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
