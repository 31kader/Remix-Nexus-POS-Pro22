import { create } from 'zustand';
import { Product, Category, Brand, CompanySettings, Promotion } from '../types';
import { DEFAULT_SETTINGS } from '../hooks/data-fetching/initialStates';
import { getSecureItem, setSecureItem } from '../lib/security';

function sanitizeSettingsRoleDictionaries(settings: CompanySettings): CompanySettings {
  if (!settings || typeof settings !== 'object') return settings;
  let updated = settings;
  if (settings.rolePermissions && typeof settings.rolePermissions === 'object') {
    const normPerms: Record<string, any> = {};
    for (const [roleKey, roleVal] of Object.entries(settings.rolePermissions)) {
      const normRoleKey = roleKey === 'cameraAgent' ? 'camera_agent' : roleKey;
      if (roleVal && typeof roleVal === 'object' && !Array.isArray(roleVal)) {
        const inner: Record<string, any> = {};
        for (const [k, v] of Object.entries(roleVal)) {
          const camelK = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
          inner[camelK] = v;
        }
        normPerms[normRoleKey] = inner;
      } else {
        normPerms[normRoleKey] = roleVal;
      }
    }
    updated = { ...updated, rolePermissions: normPerms as any };
  }
  if (settings.roleKPIs && typeof settings.roleKPIs === 'object') {
    const normKPIs: Record<string, any> = {};
    for (const [roleKey, roleVal] of Object.entries(settings.roleKPIs)) {
      const normRoleKey = roleKey === 'cameraAgent' ? 'camera_agent' : roleKey;
      if (roleVal && typeof roleVal === 'object' && !Array.isArray(roleVal)) {
        const inner: Record<string, any> = {};
        for (const [k, v] of Object.entries(roleVal)) {
          const camelK = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
          inner[camelK] = v;
        }
        normKPIs[normRoleKey] = inner;
      } else {
        normKPIs[normRoleKey] = roleVal;
      }
    }
    updated = { ...updated, roleKPIs: normKPIs };
  }
  return updated;
}

const getInitialSettings = (): CompanySettings => {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = getSecureItem<CompanySettings>('nexus_company_settings');
      if (saved && typeof saved === 'object') {
        return sanitizeSettingsRoleDictionaries({ ...DEFAULT_SETTINGS, ...saved });
      }
    } catch (_) {}
  }
  return DEFAULT_SETTINGS;
};

interface CoreState {
  settings: CompanySettings;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  promotions: Promotion[];
  patterns: any[];
  isDataLoading: boolean;

  setSettings: (settings: CompanySettings | ((prev: CompanySettings) => CompanySettings)) => void;
  setProducts: (products: Product[] | ((prev: Product[]) => Product[])) => void;
  setCategories: (categories: Category[] | ((prev: Category[]) => Category[])) => void;
  setBrands: (brands: Brand[] | ((prev: Brand[]) => Brand[])) => void;
  setPromotions: (promotions: Promotion[] | ((prev: Promotion[]) => Promotion[])) => void;
  setPatterns: (patterns: any[] | ((prev: any[]) => any[])) => void;
  setIsDataLoading: (loading: boolean | ((prev: boolean) => boolean)) => void;
}

export const useCoreStore = create<CoreState>((set) => ({
  settings: getInitialSettings(),
  products: [],
  categories: [],
  brands: [],
  promotions: [],
  patterns: [],
  isDataLoading: typeof localStorage !== "undefined" ? localStorage.getItem("nexus_has_cached_products") !== "true" : false,

  setSettings: (update) => set((state) => {
    const rawSettings = typeof update === 'function' ? update(state.settings) : update;
    const newSettings = sanitizeSettingsRoleDictionaries(rawSettings);
    if (typeof localStorage !== 'undefined' && newSettings) {
      try {
        setSecureItem('nexus_company_settings', newSettings);
      } catch (_) {}
    }
    return { settings: newSettings };
  }),
  setProducts: (update) => set((state) => ({ 
    products: typeof update === 'function' ? update(state.products) : update 
  })),
  setCategories: (update) => set((state) => ({ 
    categories: typeof update === 'function' ? update(state.categories) : update 
  })),
  setBrands: (update) => set((state) => ({ 
    brands: typeof update === 'function' ? update(state.brands) : update 
  })),
  setPromotions: (update) => set((state) => ({ 
    promotions: typeof update === 'function' ? update(state.promotions) : update 
  })),
  setPatterns: (update) => set((state) => ({ 
    patterns: typeof update === 'function' ? update(state.patterns) : update 
  })),
  setIsDataLoading: (update) => set((state) => ({ 
    isDataLoading: typeof update === 'function' ? update(state.isDataLoading) : update 
  })),
}));
