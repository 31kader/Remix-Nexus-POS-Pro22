import React from 'react';
import { Smartphone, Phone, MapPin, Compass, Award, Eye, ShoppingCart, Printer, MessageSquare, Edit } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { Customer, CompanySettings } from '../../../types';
import { cn, formatSafe } from '../../../lib/utils';

interface CustomerTableRowProps {
  cust: Customer;
  settings: CompanySettings;
  setSelectedCustomerId: (id: string | null) => void;
  setDirectoryLayout: (layout: 'split' | 'table') => void;
  setFinancialOpType: (op: any) => void;
  setFinancialMethod: (m: any) => void;
  setFinancialNote: (note: string) => void;
  setIsTopUpModalOpen: (open: boolean) => void;
  handleLaunchSale: (c: Customer) => void;
  handlePrintStatement: (c: Customer) => void;
  openWhatsApp: (phone: string, type?: 'debt' | 'reminder', customer?: Customer) => void;
  setEditingCustomer: (c: Customer) => void;
  setIsModalOpen: (open: boolean) => void;
}

export function CustomerTableRow({
  cust,
  settings,
  setSelectedCustomerId,
  setDirectoryLayout,
  setFinancialOpType,
  setFinancialMethod,
  setFinancialNote,
  setIsTopUpModalOpen,
  handleLaunchSale,
  handlePrintStatement,
  openWhatsApp,
  setEditingCustomer,
  setIsModalOpen
}: CustomerTableRowProps) {
  const balance = Number(cust.balance || 0);

  return (
    <tr 
      className="hover:bg-slate-50 dark:hover:bg-zinc-850/60 transition-colors group cursor-pointer"
      onClick={() => {
        setSelectedCustomerId(cust.id);
        setDirectoryLayout('split');
      }}
    >
      {/* Client Column */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm">
            {(cust.name || '?').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                {cust.name || 'Client sans nom'}
              </span>
              {cust.isAppUser && (
                <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[9px] font-black uppercase flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                  <Smartphone size={10} /> App
                </span>
              )}
              {cust.isWholesale && (
                <span className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 text-[9px] font-black uppercase border border-purple-200 dark:border-purple-800">
                  Gros
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-tight">
              ID: {cust.id.slice(0, 8)}... {cust.loyaltyCardNumber ? `• N° ${cust.loyaltyCardNumber}` : ''}
            </span>
          </div>
        </div>
      </td>

      {/* Coordonnées Column */}
      <td className="py-3.5 px-4">
        {cust.phone ? (
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs tracking-wider">
              {cust.phone}
            </span>
            <a
              href={`tel:${cust.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-all"
              title="Appeler"
            >
              <Phone size={12} />
            </a>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px] italic">Pas de téléphone</span>
        )}
        {cust.email && (
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate max-w-[160px] mt-0.5">{cust.email}</p>
        )}
        {(cust.latitude || cust.address) && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1",
              cust.latitude 
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
            )}>
              <MapPin size={10} className={cust.latitude ? "text-emerald-500" : "text-slate-400"} />
              {cust.latitude ? `GPS: ${Number(cust.latitude).toFixed(4)}` : (cust.city || 'Adresse')}
            </span>
            {cust.latitude && cust.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${cust.latitude},${cust.longitude}&travelmode=driving`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-0.5 text-indigo-500 hover:text-indigo-600 transition-colors"
                title="Guidage Google Maps"
              >
                <Compass size={12} />
              </a>
            )}
          </div>
        )}
      </td>

      {/* Solde / Dette Column */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        {balance < 0 ? (
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-lg">
              Dette : {Math.abs(balance).toLocaleString()} {settings.currency || 'DA'}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCustomerId(cust.id);
                setFinancialOpType('encaissement');
                setFinancialMethod('cash');
                setFinancialNote('Règlement dette client');
                setIsTopUpModalOpen(true);
              }}
              className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase transition-all shadow-xs cursor-pointer"
            >
              Régler
            </button>
          </div>
        ) : balance > 0 ? (
          <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
            Solde : +{balance.toLocaleString()} {settings.currency || 'DA'}
          </span>
        ) : (
          <span className="text-slate-400 dark:text-zinc-500 font-mono font-bold text-xs bg-slate-100 dark:bg-zinc-850 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800">
            0 {settings.currency || 'DA'}
          </span>
        )}
      </td>

      {/* Loyalty Points */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-lg text-xs font-black font-mono">
          <Award size={13} className="text-amber-500" /> {cust.loyaltyPoints || 0}
        </span>
      </td>

      {/* Total Spent */}
      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white text-xs">
        {(Number(cust.totalSpent) || 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">{settings.currency || 'DA'}</span>
      </td>

      {/* Last Visit */}
      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-zinc-400 text-xs font-medium font-mono">
        {cust.lastVisit ? formatSafe(cust.lastVisit, 'dd/MM/yyyy', { locale: fr }) : 'Aucune'}
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedCustomerId(cust.id);
              setDirectoryLayout('split');
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
            title="Voir la fiche détaillée"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleLaunchSale(cust)}
            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-sm cursor-pointer"
            title="Vendre (charger en caisse)"
          >
            <ShoppingCart size={14} />
          </button>
          <button
            type="button"
            onClick={() => handlePrintStatement(cust)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
            title="Imprimer relevé de compte"
          >
            <Printer size={14} />
          </button>
          <button
            type="button"
            onClick={() => openWhatsApp(cust.phone || '', balance < 0 ? 'debt' : undefined, cust)}
            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
            title="Envoyer WhatsApp"
          >
            <MessageSquare size={14} />
          </button>
          <button
            type="button"
            onClick={() => { setEditingCustomer(cust); setIsModalOpen(true); }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
            title="Modifier la fiche"
          >
            <Edit size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
