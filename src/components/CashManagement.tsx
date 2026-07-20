import React from 'react';
import { Plus, Wallet } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Gestion de Caisse</h3>
          <p className="text-sm text-slate-500">Suivi des sessions et clôtures journalières</p>
        </div>
        {!activeShift && (
          <Button onClick={() => setIsOpeningModalOpen(true)} className="flex items-center gap-2">
            <Plus size={18} /> Ouvrir la caisse
          </Button>
        )}
      </div>

      {activeShift ? (
        <CashManagementActiveSession
          activeShift={activeShift}
          currentShiftStats={currentShiftStats}
          settings={settings}
          setIsClosingModalOpen={setIsClosingModalOpen}
        />
      ) : (
        <Card className="p-12 border-dashed border-2 border-slate-200 bg-slate-50/50 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
            <Wallet size={32} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-800">Aucune session ouverte</h4>
            <p className="text-slate-500 max-w-xs mx-auto mt-1">
              Vous devez ouvrir une session de caisse pour commencer à vendre et suivre vos encaissements.
            </p>
          </div>
          <Button onClick={() => setIsOpeningModalOpen(true)}>
            Ouvrir la caisse maintenant
          </Button>
        </Card>
      )}

      <CashManagementHistory 
        shifts={shifts}
        settings={settings}
        printZReport={printZReport}
      />

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
