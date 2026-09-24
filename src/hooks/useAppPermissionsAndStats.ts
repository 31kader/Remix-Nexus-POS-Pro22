import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { localDb } from '../services/LocalDatabase';
import { generateUniqueId } from '../lib/utils';
import { RolePermissions } from '../types';
import { DEFAULT_PERMISSIONS } from '../constants';

import { useAuthStore } from '../store/useAuthStore';
import { useCoreStore } from '../store/useCoreStore';
import { usePeopleStore } from '../store/usePeopleStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { checkIsOwner } from '../config/ownerConfig';

export function useAppPermissionsAndTheme() {
  const user = useAuthStore(s => s.user);
  const profile = useAuthStore(s => s.profile);
  const settings = useCoreStore(s => s.settings);
  const employees = usePeopleStore(s => s.employees);
  const attendance = useInventoryStore(s => s.attendance);

  const [autoSyncOrders, setAutoSyncOrders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('autoSyncOrders') || 'false');
    } catch (e) {
      return false;
    }
  });

  const [theme, setTheme] = useState<'dark' | 'light' | 'emerald' | 'gold' | 'nardo'>(() => {
    return (localStorage.getItem('nexus-pos-theme-v3') as 'dark' | 'light' | 'emerald' | 'gold' | 'nardo') || 'light';
  });
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('autoSyncOrders', JSON.stringify(autoSyncOrders));
    } catch (e) {}
  }, [autoSyncOrders]);

  useEffect(() => {
    localStorage.setItem('nexus-pos-theme-v3', theme);
    localStorage.setItem('nexus-pos-theme', theme);
    document.documentElement.classList.remove('light', 'dark', 'emerald', 'gold', 'nardo-grey-racing');
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.add('dark');
      if (theme === 'emerald') document.documentElement.classList.add('emerald');
      else if (theme === 'gold') document.documentElement.classList.add('gold');
      else if (theme === 'nardo') document.documentElement.classList.add('nardo-grey-racing');
    }
  }, [theme]);

  const permissions = useMemo(() => {
    if (!profile || !profile.role) return DEFAULT_PERMISSIONS.cashier;
    return settings.rolePermissions?.[profile.role] || DEFAULT_PERMISSIONS[profile.role as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS.cashier;
  }, [profile, settings]);

  const isOwner = checkIsOwner(user?.email, user?.uid) || checkIsOwner(profile?.email, profile?.uid);

  const canAccess = (permission: keyof RolePermissions) => {
    if (isOwner) return true;
    if (!profile || !profile.role) return false;

    // Renforcement de sécurité : Vérifier l'authenticité du rôle admin
    if (profile.role === 'admin') {
      const isVerifiedAdmin = isOwner || (user?.email && (user.email === profile.email || user.email === settings?.email));
      if (isVerifiedAdmin) return true;
    }

    return !!permissions[permission];
  };

  const currentEmployee = employees.find(e => e.email === user?.email);
  const isClockedIn = !!currentEmployee?.isClockedIn;

  const handleClockInOut = async () => {
    if (!currentEmployee) return;
    try {
      const now = new Date().toISOString();
      if (isClockedIn) {
        const activeRecord = attendance.find(r => (r.employeeId === currentEmployee.id || r.userId === user?.uid) && !r.clockOut);
        if (activeRecord) {
          const hours = (new Date(now).getTime() - new Date(activeRecord.clockIn).getTime()) / (1000 * 60 * 60);
          await localDb.update(`attendance/${activeRecord.id}`, {
            clockOut: now,
            totalHours: hours
          });
        }
        await localDb.update(`employees/${currentEmployee.id}`, {
          isClockedIn: false
        });
      } else {
        const recordId = localDb.push('attendance').key || generateUniqueId();
        await localDb.insert(`attendance/${recordId}`, { 
          id: recordId, 
          userId: user?.uid, 
          employeeId: currentEmployee.id, 
          employeeName: currentEmployee.name, 
          clockIn: now, 
          date: format(new Date(), 'yyyy-MM-dd') 
        });
        await localDb.update(`employees/${currentEmployee.id}`, {
          isClockedIn: true
        });
      }
    } catch (error) {
      console.error("Attendance update error:", error);
    }
  };

  return {
    autoSyncOrders,
    setAutoSyncOrders,
    theme,
    setTheme,
    isThemeMenuOpen,
    setIsThemeMenuOpen,
    isLangMenuOpen,
    setIsLangMenuOpen,
    permissions,
    isOwner,
    canAccess,
    currentEmployee,
    isClockedIn,
    handleClockInOut
  };
}

export function useProductStats() {
  const products = useCoreStore(s => s.products);

  const expiringProducts = useMemo(() => {
    const list: any[] = [];
    products.forEach(p => {
      if (p.useMultiExpiry && p.batches && p.batches.length > 0) {
        p.batches.forEach(b => {
          if (b.stock <= 0 || !b.expirationDate) return;
          const expDate = new Date(b.expirationDate);
          const now = new Date();
          const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) {
            list.push({ ...p, id: `${p.id}-batch-${b.id}`, name: `${p.name} (Lot: ${b.batchNumber})`, expirationDate: b.expirationDate, stock: b.stock });
          }
        });
      } else if (p.expirationDate && p.stock > 0) {
        const expDate = new Date(p.expirationDate);
        const now = new Date();
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) list.push(p);
      }
    });
    return list;
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= (p.minStock || 0));
  }, [products]);

  return {
    expiringProducts,
    lowStockProducts
  };
}

export function useAppPermissionsAndStats() {
  const permTheme = useAppPermissionsAndTheme();
  const stats = useProductStats();
  return {
    ...permTheme,
    ...stats
  };
}
