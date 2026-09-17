import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { convertKeysToSnake, convertKeysToCamel } from '../lib/db-converters';
import { localDb } from '../services/LocalDatabase';
import { cn, generateUniqueId } from '../lib/utils';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { VoucherCreationForm } from './vouchers/VoucherCreationForm';
import { VoucherListTable } from './vouchers/VoucherListTable';
import { VoucherLogsDialog } from './vouchers/VoucherLogsDialog';

export interface VoucherLog {
  transactionId: string;
  amountUsed: number;
  remainingBalance: number;
  date: string;
  userName: string;
}

export interface Voucher {
  id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number; // Value for percent or initial value for fixed
  currentBalance: number; // For fixed amount only
  minPurchase?: number;
  expiryDate: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  customerId?: string;
  customerName?: string;
  notes?: string;
  createdAt: any;
  usageLogs?: VoucherLog[];
}

export function VoucherManager({ customers = [] }: { customers?: any[] }) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [type, setType] = useState<'fixed' | 'percent'>('fixed');
  const [value, setValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [newVoucher, setNewVoucher] = useState<Voucher | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterCode, setFilterCode] = useState('');
  const [selectedVoucherLogs, setSelectedVoucherLogs] = useState<Voucher | null>(null);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const { val } = await localDb.get('vouchers');
        const data = val() || {};
        setVouchers(Object.values(data) as Voucher[]);
      } catch (err) {
        console.warn("Error loading vouchers in VoucherManager:", err);
      }
    };
    fetchVouchers();

    const unsub = localDb.subscribe('vouchers', (snapshot) => {
      const data = snapshot && typeof snapshot.val === 'function' && snapshot.exists() ? snapshot.val() : {};
      setVouchers(Object.values(data) as Voucher[]);
    });
    return unsub;
  }, []);

  const handleGenerate = async () => {
    if (!value || parseFloat(value) <= 0) {
      toast.error("Valeur invalide. Veuillez saisir un montant ou pourcentage supérieur à 0.");
      return;
    }
    setIsGenerating(true);
    try {
      const code = 'VOUCH-' + generateUniqueId();
      const numValue = parseFloat(value);
      const customer = customers.find(c => c.id === selectedCustomer);
      const newVoucherId = generateUniqueId();
      
      const voucherData: any = {
        id: newVoucherId,
        code,
        type,
        value: numValue,
        currentBalance: type === 'fixed' ? numValue : 0,
        minPurchase: parseFloat(minPurchase) || 0,
        expiryDate,
        status: 'active',
        notes,
        createdAt: new Date().toISOString(),
        usageLogs: []
      };

      if (selectedCustomer) {
        voucherData.customerId = selectedCustomer;
        voucherData.customerName = customer?.name || 'Inconnu';
      }

      await localDb.insert(`vouchers/${voucherData.id}`, voucherData);
      setNewVoucher(voucherData);
      toast.success("Bon généré avec succès !");
      
      // Reset form
      setValue('');
      setMinPurchase('');
      setExpiryDate('');
      setSelectedCustomer('');
      setNotes('');
    } catch (error: any) {
      console.error("Error generating voucher:", error);
      toast.error("Erreur lors de la génération du bon: " + (error?.message || "Erreur"));
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleVoucherStatus = async (voucher: Voucher) => {
    const newStatus = voucher.status === 'revoked' ? 'active' : 'revoked';
    if (!confirm(`Voulez-vous ${newStatus === 'revoked' ? 'désactiver' : 'réactiver'} ce bon ?`)) return;
    
    try {
      await localDb.update(`vouchers/${voucher.id}`, { status: newStatus });
      toast.success(`Bon ${newStatus === 'revoked' ? 'désactivé' : 'réactivé'} avec succès.`);
    } catch (error: any) {
      console.error("Error updating voucher status:", error);
      toast.error("Erreur lors de la mise à jour du statut: " + (error?.message || "Erreur"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-2xl space-y-6 text-left">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight uppercase">Cartes Cadeaux &amp; Bons de Réduction</h3>
            <p className="text-xs text-white/40 font-medium">Générez et suivez les bons de réduction pour vos clients</p>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
              {vouchers.filter(v => v.status === 'active').length} Actifs
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <VoucherCreationForm
            type={type}
            setType={setType}
            value={value}
            setValue={setValue}
            expiryDate={expiryDate}
            setExpiryDate={setExpiryDate}
            minPurchase={minPurchase}
            setMinPurchase={setMinPurchase}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            customers={customers}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />

          <VoucherListTable
            vouchers={vouchers}
            filterCode={filterCode}
            setFilterCode={setFilterCode}
            onViewLogs={setSelectedVoucherLogs}
            onToggleStatus={toggleVoucherStatus}
          />
        </div>
      </div>

      {newVoucher && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-top duration-500 border border-slate-700">
          <div className="w-24 h-24 bg-white p-2 rounded-xl flex-shrink-0 flex items-center justify-center">
            <QRCodeCanvas value={newVoucher.code} size={80} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Bon généré avec succès</p>
            <h4 className="text-2xl font-black text-white tracking-tighter mb-2">{newVoucher.code}</h4>
            <div className="flex gap-4">
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Valeur</p>
                <p className="text-sm font-bold text-amber-500">
                  {newVoucher.type === 'percent' ? `${newVoucher.value}%` : `${newVoucher.value} DA`}
                </p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase">Expiration</p>
                <p className="text-sm font-bold text-white">{newVoucher.expiryDate || 'Accès illimité'}</p>
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setNewVoucher(null)} 
            className="p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {selectedVoucherLogs && (
        <VoucherLogsDialog 
          voucher={selectedVoucherLogs} 
          onClose={() => setSelectedVoucherLogs(null)} 
        />
      )}
    </div>
  );
}
