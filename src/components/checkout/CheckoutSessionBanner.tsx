import React from 'react';
import { SessionTabs } from './SessionTabs';
import { CheckoutTotalBanner } from './CheckoutTotalBanner';
import { SessionInitialCard } from './SessionInitialCard';
import { CartItem, CompanySettings } from '../../types';

interface CheckoutSessionBannerProps {
  activeShift: any;
  posSessions: any[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  addNewSession: () => void;
  removeSession: (id: string) => void;
  isReturnMode: boolean;
  setIsReturnMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  showQuickSelect: boolean;
  setShowQuickSelect: (val: boolean | ((prev: boolean) => boolean)) => void;
  showControlsPanel: boolean;
  setShowControlsPanel: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenCustomerDisplay: () => void;
  total: number;
  currency: string;
  cart: CartItem[];
  displayTotal: number;
  discountAmount: number;
  initialCashInput: string;
  setInitialCashInput: (val: string) => void;
  isOpeningSession: boolean;
  handleDirectOpenShift: () => void;
  settings: CompanySettings;
  role: any;
  setActiveTab: (tab: string) => void;
}

export const CheckoutSessionBanner: React.FC<CheckoutSessionBannerProps> = ({
  activeShift,
  posSessions,
  activeSessionId,
  setActiveSessionId,
  addNewSession,
  removeSession,
  isReturnMode,
  setIsReturnMode,
  showQuickSelect,
  setShowQuickSelect,
  showControlsPanel,
  setShowControlsPanel,
  onOpenCustomerDisplay,
  total,
  currency,
  cart,
  displayTotal,
  discountAmount,
  initialCashInput,
  setInitialCashInput,
  isOpeningSession,
  handleDirectOpenShift,
  settings,
  role,
  setActiveTab
}) => {
  return (
    <>
      {/* Onglets des sessions de caisse */}
      {activeShift && (
        <SessionTabs 
          posSessions={posSessions}
          activeSessionId={activeSessionId}
          setActiveSessionId={setActiveSessionId}
          addNewSession={addNewSession}
          removeSession={removeSession}
          isReturnMode={isReturnMode}
          setIsReturnMode={setIsReturnMode}
          showQuickSelect={showQuickSelect}
          setShowQuickSelect={setShowQuickSelect}
          showControlsPanel={showControlsPanel}
          setShowControlsPanel={setShowControlsPanel}
          onOpenCustomerDisplay={onOpenCustomerDisplay}
          total={total}
          currency={currency}
        />
      )}

      {/* 💎 GRAND PRIX TOTAL ENTRE LES DEUX BARRES 💎 */}
      {activeShift && (
        <CheckoutTotalBanner
          cart={cart}
          isReturnMode={isReturnMode}
          displayTotal={displayTotal}
          discountAmount={discountAmount}
          currency={currency}
        />
      )}

      {!activeShift && (
        <SessionInitialCard
          initialCashInput={initialCashInput}
          setInitialCashInput={setInitialCashInput}
          isOpeningSession={isOpeningSession}
          handleDirectOpenShift={handleDirectOpenShift}
          settings={settings}
          role={role}
          setActiveTab={setActiveTab}
        />
      )}
    </>
  );
};
