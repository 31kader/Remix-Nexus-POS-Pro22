import { ShortageItem, CustomReplenishmentList } from '../../types/shortages';
import { getLocalValue } from '../../lib/local-db';
import { get as idbGet } from 'idb-keyval';
import { localDb } from '../../services/LocalDatabase';

export async function loadShortagesFromDb(): Promise<{
  items: ShortageItem[];
  customLists: CustomReplenishmentList[];
}> {
  try {
    let rawItems = getLocalValue('shortage_items');
    let rawLists = getLocalValue('custom_replenishment_lists');

    if (!rawItems || Object.keys(rawItems).length === 0) {
      try {
        const idbItems = (await idbGet<any>('nexus_db_shortage_items')) || (await idbGet<any>('nexus_shortage_items_cache'));
        if (idbItems && typeof idbItems === 'object') {
          rawItems = idbItems;
        }
      } catch (_) {}
    }

    if (!rawLists || Object.keys(rawLists).length === 0) {
      try {
        const idbLists = (await idbGet<any>('nexus_db_custom_replenishment_lists')) || (await idbGet<any>('nexus_custom_replenishment_lists_cache'));
        if (idbLists && typeof idbLists === 'object') {
          rawLists = idbLists;
        }
      } catch (_) {}
    }

    const items: ShortageItem[] = rawItems
      ? (Array.isArray(rawItems) ? rawItems : Object.values(rawItems)).filter(Boolean)
      : [];

    const customLists: CustomReplenishmentList[] = rawLists
      ? (Array.isArray(rawLists) ? rawLists : Object.values(rawLists)).filter(Boolean)
      : [];

    return { items, customLists };
  } catch (err) {
    console.warn('[shortageDbOperations] Erreur chargement local:', err);
    return { items: [], customLists: [] };
  }
}

export async function persistInsertShortageItem(item: ShortageItem): Promise<void> {
  // localDb.insert prend strictement 2 arguments : (path, value)
  await localDb.insert(`shortage_items/${item.id}`, item);
}

export async function persistUpdateShortageItem(id: string, updates: Partial<ShortageItem>): Promise<void> {
  // localDb.update prend strictement 2 arguments : (path, value)
  await localDb.update(`shortage_items/${id}`, updates);
}

export async function persistDeleteShortageItem(id: string): Promise<void> {
  await localDb.delete(`shortage_items/${id}`);
}

export async function persistInsertCustomList(list: CustomReplenishmentList): Promise<void> {
  await localDb.insert(`custom_replenishment_lists/${list.id}`, list);
}

export async function persistUpdateCustomList(id: string, updates: Partial<CustomReplenishmentList>): Promise<void> {
  await localDb.update(`custom_replenishment_lists/${id}`, updates);
}

export async function persistDeleteCustomList(id: string): Promise<void> {
  await localDb.delete(`custom_replenishment_lists/${id}`);
}
