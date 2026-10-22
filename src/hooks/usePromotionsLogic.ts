import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { localDb } from '../services/LocalDatabase';
import { useCoreStore } from '../store/useCoreStore';
import { enqueueSyncBatch } from '../services/SyncService';
import { Promotion, Transaction } from '../types';
import { toast } from 'sonner';

interface UsePromotionsLogicProps {
  promotions: Promotion[];
  transactions: Transaction[];
}

export function usePromotionsLogic({ promotions, transactions }: UsePromotionsLogicProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [viewingPerformancePromo, setViewingPerformancePromo] = useState<Promotion | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'buy_x_get_y',
    value: '',
    minPurchase: '',
    startDate: '',
    endDate: '',
    isActive: true,
    applicableCategories: [] as string[],
    applicableProducts: [] as string[],
    code: '',
    buyQuantity: '',
    getQuantity: ''
  });

  useEffect(() => {
    if (editingPromotion) {
      setFormData({
        name: editingPromotion.name || '',
        type: editingPromotion.type || 'percentage',
        value: (editingPromotion.value ?? '').toString(),
        minPurchase: (editingPromotion.minPurchase ?? '').toString(),
        startDate: editingPromotion.startDate || '',
        endDate: editingPromotion.endDate || '',
        isActive: (editingPromotion.isActive ?? (editingPromotion as any).active) ?? true,
        applicableCategories: editingPromotion.applicableCategories || [],
        applicableProducts: editingPromotion.applicableProducts || [],
        code: editingPromotion.code || '',
        buyQuantity: (editingPromotion.buyQuantity ?? '').toString(),
        getQuantity: (editingPromotion.getQuantity ?? '').toString()
      });
    } else {
      setFormData({
        name: '', type: 'percentage', value: '', minPurchase: '', 
        startDate: '', endDate: '', isActive: true, applicableCategories: [], 
        applicableProducts: [], code: '', buyQuantity: '', getQuantity: ''
      });
    }
  }, [editingPromotion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = formData.name.trim();
    const promoValue = parseFloat(formData.value || '0');

    if (!trimmedName) {
      toast.error("Le nom de la promotion est obligatoire.");
      return;
    }

    if (isNaN(promoValue) || promoValue < 0) {
      toast.error("Veuillez saisir une valeur de promotion valide.");
      return;
    }

    const promoId = editingPromotion?.id || Math.random().toString(36).substring(2, 10);
    const promoRecord: Promotion = {
      id: promoId,
      name: trimmedName,
      code: formData.code?.trim().toUpperCase() || '',
      type: formData.type,
      value: promoValue,
      minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : undefined,
      buyQuantity: formData.buyQuantity ? parseInt(formData.buyQuantity) : undefined,
      getQuantity: formData.getQuantity ? parseInt(formData.getQuantity) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      isActive: formData.isActive,
      applicableCategories: formData.applicableCategories || [],
      applicableProducts: formData.applicableProducts || [],
    };

    const supabasePayload = {
      id: promoId,
      name: trimmedName,
      code: formData.code?.trim().toUpperCase() || '',
      description: (editingPromotion as any)?.description || null,
      type: formData.type,
      value: promoValue,
      min_purchase: formData.minPurchase ? parseFloat(formData.minPurchase) : 0,
      buy_quantity: formData.buyQuantity ? parseInt(formData.buyQuantity) : null,
      get_quantity: formData.getQuantity ? parseInt(formData.getQuantity) : null,
      start_date: formData.startDate || null,
      end_date: formData.endDate || null,
      active: formData.isActive,
      is_active: formData.isActive,
      applicable_categories: formData.applicableCategories || [],
      applicable_products: formData.applicableProducts || [],
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Sauvegarde locale immédiate (Offline-First)
      await localDb.insert(`promotions/${promoId}`, promoRecord);
      useCoreStore.getState().setPromotions(prev => {
        const list = Array.isArray(prev) ? prev : [];
        const idx = list.findIndex(p => p.id === promoId);
        if (idx > -1) {
          const copy = [...list];
          copy[idx] = promoRecord;
          return copy;
        }
        return [promoRecord, ...list];
      });

      // 2. File de synchronisation garantie
      enqueueSyncBatch([{
        action: 'UPSERT',
        table: 'promotions',
        recordId: promoId,
        payload: supabasePayload
      }]);

      // 3. Poussée directe Supabase si en ligne
      if (isSupabaseConfigured && navigator.onLine) {
        const { error } = await supabase
          .from('promotions')
          .upsert(supabasePayload, { onConflict: 'id' });
        if (error) {
          console.warn('[usePromotionsLogic] Supabase direct upsert error, queued in background:', error);
        }
      }

      toast.success(editingPromotion ? "Promotion mise à jour !" : "Promotion enregistrée !");
      setIsModalOpen(false);
      setEditingPromotion(null);
    } catch (error: any) {
      console.error("Error saving promotion:", error);
      toast.error("Erreur lors de la sauvegarde: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setPromoToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!promoToDelete) return;
    try {
      // 1. Suppression locale
      await localDb.delete(`promotions/${promoToDelete}`);
      useCoreStore.getState().setPromotions(prev => (prev || []).filter(p => p.id !== promoToDelete));

      // 2. Enfilement suppression hors-ligne
      enqueueSyncBatch([{
        action: 'DELETE',
        table: 'promotions',
        recordId: promoToDelete,
        payload: { id: promoToDelete }
      }]);

      // 3. Supabase direct
      if (isSupabaseConfigured && navigator.onLine) {
        await supabase.from('promotions').delete().eq('id', promoToDelete);
      }

      toast.success("Promotion supprimée.");
      setPromoToDelete(null);
      setIsDeleteConfirmOpen(false);
    } catch (error: any) {
      console.error("Error deleting promotion:", error);
      toast.error("Erreur lors de la suppression: " + error.message);
    }
  };

  const filteredPromotions = useMemo(() => {
    const searchLower = (search || '').toLowerCase().trim();
    if (!Array.isArray(promotions)) return [];
    return promotions.filter(p => {
      if (!p) return false;
      const name = (p.name ? String(p.name) : '').toLowerCase();
      const code = (p.code ? String(p.code) : '').toLowerCase();
      return name.includes(searchLower) || code.includes(searchLower);
    });
  }, [promotions, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPromotions.length / pageSize));
  const paginatedPromotions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPromotions.slice(start, start + pageSize);
  }, [filteredPromotions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const stats = useMemo(() => {
    const now = new Date();
    const list = Array.isArray(promotions) ? promotions.filter(Boolean) : [];
    const txList = Array.isArray(transactions) ? transactions.filter(Boolean) : [];
    return {
      total: list.length,
      active: list.filter(p => Boolean(p.isActive)).length,
      ongoing: list.filter(p => {
        if (!p.isActive) return false;
        const start = p.startDate ? new Date(p.startDate) : null;
        const end = p.endDate ? new Date(p.endDate) : null;
        return (!start || start <= now) && (!end || end >= now);
      }).length,
      totalDiscount: txList.reduce((sum, t) => sum + (t?.discountAmount || 0), 0)
    };
  }, [promotions, transactions]);

  const getPromoStatus = (promo: Promotion) => {
    if (!promo || !promo.isActive) return { label: 'Désactivée', color: 'bg-slate-100 text-slate-500' };
    const now = new Date();
    const start = promo.startDate ? new Date(promo.startDate) : null;
    const end = promo.endDate ? new Date(promo.endDate) : null;

    if (start && start > now) return { label: 'À venir', color: 'bg-amber-100 text-amber-700' };
    if (end && end < now) return { label: 'Expirée', color: 'bg-rose-100 text-rose-700' };
    return { label: 'En cours', color: 'bg-emerald-100 text-emerald-700' };
  };

  return {
    isModalOpen,
    setIsModalOpen,
    isPerformanceModalOpen,
    setIsPerformanceModalOpen,
    viewingPerformancePromo,
    setViewingPerformancePromo,
    editingPromotion,
    setEditingPromotion,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    formData,
    setFormData,
    handleSubmit,
    handleDelete,
    confirmDelete,
    filteredPromotions,
    paginatedPromotions,
    totalPages,
    pageSize,
    stats,
    getPromoStatus
  };
}
