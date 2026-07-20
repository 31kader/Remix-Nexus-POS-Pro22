import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { Promotion, Transaction } from '../types';

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
        isActive: editingPromotion.isActive ?? true,
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
      alert("Le nom de la promotion est obligatoire.");
      return;
    }

    if (isNaN(promoValue) || promoValue < 0) {
      alert("Veuillez saisir une valeur de promotion valide.");
      return;
    }

    const data = {
      name: trimmedName,
      code: formData.code?.trim().toUpperCase() || '',
      type: formData.type,
      value: promoValue,
      min_purchase: formData.minPurchase ? parseFloat(formData.minPurchase) : null,
      buy_quantity: formData.buyQuantity ? parseInt(formData.buyQuantity) : null,
      get_quantity: formData.getQuantity ? parseInt(formData.getQuantity) : null,
      start_date: formData.startDate || null,
      end_date: formData.endDate || null,
      is_active: formData.isActive,
      applicable_categories: formData.applicableCategories || [],
      applicable_products: formData.applicableProducts || [],
      updated_at: new Date().toISOString()
    };

    try {
      if (editingPromotion) {
        const { error } = await supabase
          .from('promotions')
          .update(data)
          .eq('id', editingPromotion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('promotions')
          .insert({ id: Math.random().toString(36).substring(2, 10), ...data });
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingPromotion(null);
    } catch (error: any) {
      console.error("Error saving promotion:", error);
      alert("Erreur lors de la sauvegarde: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setPromoToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!promoToDelete) return;
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promoToDelete);
      if (error) throw error;
      setPromoToDelete(null);
      setIsDeleteConfirmOpen(false);
    } catch (error: any) {
      console.error("Error deleting promotion:", error);
      alert("Erreur lors de la suppression: " + error.message);
    }
  };

  const filteredPromotions = useMemo(() => {
    const searchLower = search.toLowerCase();
    return promotions.filter(p => 
      p.name.toLowerCase().includes(searchLower) || 
      (p.code && p.code.toLowerCase().includes(searchLower))
    );
  }, [promotions, search]);

  const totalPages = Math.ceil(filteredPromotions.length / pageSize);
  const paginatedPromotions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPromotions.slice(start, start + pageSize);
  }, [filteredPromotions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: promotions.length,
      active: promotions.filter(p => p.isActive).length,
      ongoing: promotions.filter(p => {
        if (!p.isActive) return false;
        const start = p.startDate ? new Date(p.startDate) : null;
        const end = p.endDate ? new Date(p.endDate) : null;
        return (!start || start <= now) && (!end || end >= now);
      }).length,
      totalDiscount: transactions.reduce((sum, t) => sum + (t.discountAmount || 0), 0)
    };
  }, [promotions, transactions]);

  const getPromoStatus = (promo: Promotion) => {
    if (!promo.isActive) return { label: 'Désactivée', color: 'bg-slate-100 text-slate-500' };
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
