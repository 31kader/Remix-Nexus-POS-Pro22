import { create } from 'zustand';
import { Product, Category, Brand, CompanySettings, Promotion } from '../types';
import { DEFAULT_SETTINGS } from '../hooks/data-fetching/initialStates';

const getInitialSettings = (): CompanySettings => {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('nexus_company_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
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
    const newSettings = typeof update === 'function' ? update(state.settings) : update;
    if (typeof localStorage !== 'undefined' && newSettings) {
      try {
        localStorage.setItem('nexus_company_settings', JSON.stringify(newSettings));
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
