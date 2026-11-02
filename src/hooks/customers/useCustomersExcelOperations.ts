import React from 'react';
import { exportToExcelSafely, readExcelObjectsSafely, sanitizeRowObject } from '../../lib/excelSecurity';
import { toast } from 'sonner';
import { Customer, CompanySettings } from '../../types';
import { usePeopleStore } from '../../store/usePeopleStore';
import { localDb } from '../../services/LocalDatabase';
import { generateLocalId } from '../../lib/db-converters';

export interface UseCustomersExcelOperationsProps {
  customers: Customer[];
  settings: CompanySettings;
}

export function useCustomersExcelOperations({ customers, settings }: UseCustomersExcelOperationsProps) {
  // Excel Export
  const exportCustomersToExcel = async () => {
    if (!customers || customers.length === 0) {
      toast.error("Aucun client à exporter.");
      return;
    }

    const exportRows = customers.map(c => ({
      "Identifiant": c.id,
      "Nom Complet": c.name || '',
      "Téléphone": c.phone || '',
      "Email": c.email || '',
      "N° Carte Fidélité": c.loyaltyCardNumber || '',
      "Solde (DA)": Number(c.balance || 0),
      "Dette (DA)": Number(c.balance || 0) < 0 ? Math.abs(Number(c.balance || 0)) : 0,
      "Points Fidélité": c.loyaltyPoints || 0,
      "Total Dépensé (DA)": Number(c.totalSpent || 0),
      "Nombre d'Achats": c.purchaseCount || 0,
      "Dernière Visite": c.lastVisit || '',
      "Date d'Adhésion": c.joinDate || '',
      "Client App": c.isAppUser ? "OUI" : "NON",
      "Client Grossiste": c.isWholesale ? "OUI" : "NON",
      "Adresse": c.address || '',
      "Ville": c.city || '',
      "Notes": c.notes || ''
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Clients_${settings.name ? settings.name.replace(/\s+/g, '_') : 'NexusPOS'}_${dateStr}`;
    try {
      await exportToExcelSafely(exportRows, fileName, "Clients");
      toast.success(`${customers.length} clients exportés avec succès !`);
    } catch (err: any) {
      console.error("Erreur lors de l'export des clients :", err);
      toast.error("Échec de l'exportation Excel : " + (err.message || "Erreur"));
    }
  };

  // Excel / CSV Import sécurisé
  const importCustomersFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRows = await readExcelObjectsSafely<Record<string, any>>(file);

      if (!rawRows || rawRows.length === 0) {
        toast.error("Le fichier Excel est vide.");
        return;
      }

      let count = 0;
      const nowIso = new Date().toISOString();

      const newCustomers: Customer[] = rawRows.map(rawRow => {
        const row = sanitizeRowObject(rawRow);
        const name = row["Nom Complet"] || row["Nom"] || row["name"] || row["Client"] || '';
        const phone = String(row["Téléphone"] || row["Tel"] || row["phone"] || '');
        const email = String(row["Email"] || row["email"] || '').toLowerCase().trim();
        const loyaltyCardNumber = String(row["N° Carte Fidélité"] || row["Carte"] || row["loyaltyCardNumber"] || '');
        const balance = Number(row["Solde (DA)"] || row["Solde"] || row["balance"] || 0);
        const loyaltyPoints = parseInt(row["Points Fidélité"] || row["Points"] || row["loyaltyPoints"] || 0, 10) || 0;
        const totalSpent = Number(row["Total Dépensé (DA)"] || row["totalSpent"] || 0);
        const notes = String(row["Notes"] || row["notes"] || '');
        const address = String(row["Adresse"] || row["address"] || '');
        const city = String(row["Ville"] || row["city"] || '');

        count++;
        const custId = generateLocalId();

        return {
          id: custId,
          name: name || `Client Importé #${count}`,
          phone,
          email,
          loyaltyCardNumber,
          balance,
          loyaltyPoints,
          totalSpent,
          notes,
          address,
          city,
          updatedAt: nowIso,
          joinDate: nowIso.split('T')[0]
        };
      });

      // Update Zustand and localDb
      usePeopleStore.getState().setCustomers(prev => [...newCustomers, ...prev]);
      for (const c of newCustomers) {
        await localDb.insert(`customers/${c.id}`, c);
      }

      toast.success(`${newCustomers.length} clients importés avec succès !`);
      e.target.value = '';
    } catch (err: any) {
      console.error("Erreur lors de l'importation Excel:", err);
      toast.error("Échec de l'importation: " + err.message);
    }
  };

  return {
    exportCustomersToExcel,
    importCustomersFromExcel
  };
}
