import React from 'react';
import { Plus, Wallet, ShieldCheck, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { CashShift, Transaction, Expense, UserProfile as User, CompanySettings } from '../types';
import { Button, Card } from './ui';
import { useCashManagementLogic } from './cash-management/useCashManagementLogic';
import { CashManagementModals } from './cash-management/CashManagementModals';
import { CashManagementActiveSession } from './cash-management/CashManagementActiveSession';
import { CashManagementHistory } from './cash-management/CashManagementHistory';

interface CashManagementProps {
  activeShift: CashShift | null;
  shifts: CashShift[];
  transactions: Transaction[];
  expenses: Expense[];
  user: User;
  settings: CompanySettings;
}

export function CashManagement({ 
  activeShift, 
  shifts, 
  transactions, 
  expenses, 
  user, 
  settings 
}: CashManagementProps) {
  const {
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
    handleOpenShift,
    handleCloseShift,
    printZReport
  } = useCashManagementLogic({
    activeShift,
    shifts,
    transactions,
    expenses,
    user,
    settings
  });

  const closedShifts = shifts.filter(s => s.status === 'closed');
  const totalHistoricalSales = closedShifts.reduce((acc, s) => acc + Number(s.totalSales || 0), 0);
  const totalDiscrepancy = closedShifts.reduce((acc, s) => acc + ((Number(s.finalCash) || 0) - (Number(s.expectedCash) || 0)), 0);

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Gestion de Caisse & Sessions (Rapport Z)
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                activeShift 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}>
                {activeShift ? '● Caisse Ouverte' : '○ Caisse Fermée'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Contrôle du fond de caisse, suivi des espèces en temps réel, billetage algérien et clôtures journalières
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!activeShift ? (
            <Button 
              onClick={() => setIsOpeningModalOpen(true)} 
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm"
            >
              <Plus size={18} /> Ouvrir une Session de Caisse
            </Button>
          ) : (
            <Button 
              onClick={() => setIsClosingModalOpen(true)} 
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm"
            >
              Clôturer la Caisse (Rapport Z)
            </Button>
          )}
        </div>
      </div>

      {/* Global Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Sessions Clôturées</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{closedShifts.length} session(s)</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">CA Cumulé (Sessions Clôturées)</p>
            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
              {totalHistoricalSales.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency || 'DA'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            totalDiscrepancy < 0 
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}>
            {totalDiscrepancy < 0 ? <AlertTriangle size={20} /> : <Clock size={20} />}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Écart Cumulé de Caisse</p>
            <p className={`text-lg font-black ${
              totalDiscrepancy < 0 ? 'text-rose-600 dark:text-rose-400' : totalDiscrepancy > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
            }`}>
              {totalDiscrepancy > 0 ? '+' : ''}{totalDiscrepancy.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {settings.currency || 'DA'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Session or Empty State */}
      {activeShift ? (
        <CashManagementActiveSession
          activeShift={activeShift}
          currentShiftStats={currentShiftStats}
          settings={settings}
          setIsClosingModalOpen={setIsClosingModalOpen}
        />
      ) : (
        <Card className="p-8 border-dashed border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 text-center flex flex-col items-center gap-4 rounded-2xl">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20">
            <Wallet size={32} />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">Aucune session de caisse ouverte</h4>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
              Ouvrez une session en renseignant votre fond de caisse initial (billets & pièces) pour tracer vos encaissements espèces, dépenses et générer votre Rapport Z en fin de journée.
            </p>
          </div>
          <Button 
            onClick={() => setIsOpeningModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold"
          >
            Ouvrir la caisse maintenant
          </Button>
        </Card>
      )}

      {/* History Table */}
      <CashManagementHistory 
        shifts={shifts}
        settings={settings}
        printZReport={printZReport}
      />

      {/* Modals with Algerian Bill Counter */}
      <CashManagementModals
        isOpeningModalOpen={isOpeningModalOpen}
        setIsOpeningModalOpen={setIsOpeningModalOpen}
        isClosingModalOpen={isClosingModalOpen}
        setIsClosingModalOpen={setIsClosingModalOpen}
        initialCash={initialCash}
        setInitialCash={setInitialCash}
        finalCash={finalCash}
        setFinalCash={setFinalCash}
        notes={notes}
        setNotes={setNotes}
        isProcessing={isProcessing}
        currentShiftStats={currentShiftStats}
        settings={settings}
        handleOpenShift={handleOpenShift}
        handleCloseShift={handleCloseShift}
      />
    </div>
  );
}
