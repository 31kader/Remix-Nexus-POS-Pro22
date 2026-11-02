import { useMemo } from 'react';
import { Category } from '../../../types';

export function useInventoryCategoryExpansion(
  selectedCategories: string[],
  categories: Category[]
): string[] {
  return useMemo(() => {
    if (!selectedCategories || selectedCategories.length === 0) return [];
    const childMap = new Map<string, string[]>();
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (c.parentId) {
        const list = childMap.get(c.parentId) || [];
        list.push(c.id);
        childMap.set(c.parentId, list);
      }
    }
    const all = new Set<string>();
    const collect = (cid: string) => {
      if (all.has(cid)) return;
      all.add(cid);
      const children = childMap.get(cid);
      if (children) {
        for (let i = 0; i < children.length; i++) collect(children[i]);
      }
    };
    for (let i = 0; i < selectedCategories.length; i++) {
      collect(selectedCategories[i]);
    }
    return Array.from(all);
  }, [selectedCategories, categories]);
}
