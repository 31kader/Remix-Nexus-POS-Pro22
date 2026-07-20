import { create } from 'zustand';
import { Product, Category, Brand, CompanySettings, Promotion } from '../types';
import { DEFAULT_SETTINGS } from '../hooks/data-fetching/initialStates';

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
  settings: DEFAULT_SETTINGS,
  products: [],
  categories: [],
  brands: [],
  promotions: [],
  patterns: [],
  isDataLoading: true,

  setSettings: (update) => set((state) => ({ 
    settings: typeof update === 'function' ? update(state.settings) : update 
  })),
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
