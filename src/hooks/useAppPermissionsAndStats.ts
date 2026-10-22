import { useMemo, useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { localDb } from '../services/LocalDatabase';
import { getLocalValue } from '../lib/local-db';
import { generateUniqueId } from '../lib/utils';
import { RolePermissions, normalizeBatches } from '../types';
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
  const users = usePeopleStore(s => s.users);
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

  const isOwner = checkIsOwner(user?.email, user?.uid) || checkIsOwner(profile?.email, profile?.uid);

  const permissions = useMemo(() => {
    if (isOwner) return DEFAULT_PERMISSIONS.admin;
    if (!profile || !profile.role) return DEFAULT_PERMISSIONS.cashier;
    const roleKey = ((profile.role as string) === 'cameraAgent' ? 'camera_agent' : profile.role) as keyof typeof DEFAULT_PERMISSIONS;
    const baseDefaults = DEFAULT_PERMISSIONS[roleKey] || DEFAULT_PERMISSIONS.cashier;
    const rawCustom = settings.rolePermissions?.[roleKey] || (settings.rolePermissions as any)?.[profile.role];
    if (!rawCustom || typeof rawCustom !== 'object') {
      return baseDefaults;
    }
    const normalized: Record<string, boolean> = { ...baseDefaults };
    for (const [k, v] of Object.entries(rawCustom)) {
      const camelKey = k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (typeof v === 'boolean') {
        normalized[camelKey] = v;
      }
    }
    if (roleKey === 'admin') {
      return {
        ...DEFAULT_PERMISSIONS.admin,
        ...normalized,
        canAccessSettings: true,
        canAccessInventory: true,
        canAccessSales: true,
      } as RolePermissions;
    }
    return normalized as unknown as RolePermissions;
  }, [isOwner, profile, settings]);

  const canAccess = useCallback((permission: keyof RolePermissions) => {
    if (isOwner) return true;
    if (!profile || !profile.role) return false;

    // 🛡️ Renforcement de sécurité (CWE-863 / CWE-269) : Vérifier l'authenticité stricte du rôle admin
    if (profile.role === 'admin') {
      const cleanEmail = (user?.email || profile?.email || '').toLowerCase().trim();
      const matchedEmp = employees.find(e =>
        (profile.employeeId && e.id === profile.employeeId) ||
        (user?.uid && e.id === user.uid) ||
        (cleanEmail && e.email?.toLowerCase().trim() === cleanEmail)
      );
      // Si la fiche employé existe et que son rôle réel n'est pas 'admin', bloquer toute escalade
      if (matchedEmp && matchedEmp.role !== 'admin') {
        const empRoleKey = (matchedEmp.role || 'cashier') as keyof typeof DEFAULT_PERMISSIONS;
        const empPerms = settings.rolePermissions?.[empRoleKey] || DEFAULT_PERMISSIONS[empRoleKey] || DEFAULT_PERMISSIONS.cashier;
        const snakePerm = permission.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        return Boolean(empPerms[permission] ?? (empPerms as any)[snakePerm]);
      }

      const localUsers = getLocalValue('users') || {};
      const matchedUserRecord: any = (user?.uid && localUsers[user.uid]) ||
        Object.values(localUsers).find((u: any) => u && cleanEmail && u.email?.toLowerCase().trim() === cleanEmail) ||
        (Array.isArray(users) ? users.find((u: any) => u && ((user?.uid && (u.uid === user.uid || u.id === user.uid)) || (cleanEmail && u.email?.toLowerCase().trim() === cleanEmail))) : null);

      if (matchedUserRecord && matchedUserRecord.role && matchedUserRecord.role !== 'admin') {
        const usrRoleKey = (matchedUserRecord.role || 'cashier') as keyof typeof DEFAULT_PERMISSIONS;
        const usrPerms = settings.rolePermissions?.[usrRoleKey] || DEFAULT_PERMISSIONS[usrRoleKey] || DEFAULT_PERMISSIONS.cashier;
        const snakePerm = permission.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        return Boolean(usrPerms[permission] ?? (usrPerms as any)[snakePerm]);
      }

      const isVerifiedAdmin =
        isOwner ||
        Boolean(cleanEmail && settings?.email && cleanEmail === settings.email.toLowerCase().trim()) ||
        (matchedEmp?.role as string) === 'admin' ||
        matchedUserRecord?.role === 'admin' ||
        Boolean(user?.uid && (!matchedEmp || (matchedEmp.role as string) === 'admin'));

      if (isVerifiedAdmin) return true;
      return false;
    }

    return !!permissions[permission];
  }, [isOwner, profile, user?.email, user?.uid, employees, users, settings, permissions]);

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

const EMPTY_PRODUCTS: any[] = [];

export function useProductStats(skip = false) {
  const products = useCoreStore(s => (skip ? EMPTY_PRODUCTS : s.products));

  const expiringProducts = useMemo(() => {
    if (skip || !products.length) return EMPTY_PRODUCTS;
    const list: any[] = [];
    products.forEach(p => {
      const batches = normalizeBatches(p.batches);
      if (p.useMultiExpiry && batches.length > 0) {
        batches.forEach(b => {
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
  }, [products, skip]);

  const lowStockProducts = useMemo(() => {
    if (skip || !products.length) return EMPTY_PRODUCTS;
    return products.filter(p => p.stock <= (p.minStock || 0));
  }, [products, skip]);

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
