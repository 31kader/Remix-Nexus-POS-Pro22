import React from 'react';
import {
  CustomerIdentityAndCommercialCard,
  CustomerPurchaseStatsCard,
  CustomerLedgerNotesTable
} from '../info';
import {
  type ParsedNoteInfo,
  type CustomerInfoTabProps,
  parseNoteFinancialInfo as parseNoteFinancialInfoBase
} from '../info/customerInfoTypes';

export type { ParsedNoteInfo, CustomerInfoTabProps };
export function parseNoteFinancialInfo(noteStr: string): ParsedNoteInfo {
  return parseNoteFinancialInfoBase(noteStr);
}

export const CustomerInfoTab: React.FC<CustomerInfoTabProps> = ({
  selectedCustomer,
  settings,
  historyStats
}) => {
  return (
    <div className="space-y-5">
      {/* 1. Grille d'Informations Générales, Identité & Profil Commercial */}
      <CustomerIdentityAndCommercialCard
        selectedCustomer={selectedCustomer}
        settings={settings}
      />

      {/* 2. Répartition des Achats : Magasin vs Application vs Total Net */}
      <CustomerPurchaseStatsCard
        historyStats={historyStats}
        settings={settings}
      />

      {/* 3. Grand Tableau des Règlements, Versements & Mémos */}
      <CustomerLedgerNotesTable
        selectedCustomer={selectedCustomer}
        settings={settings}
      />
    </div>
  );
};

export default CustomerInfoTab;
