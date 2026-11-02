import { CustomReplenishmentList, ShortageItem } from '../../types/shortages';
import { generateLocalId } from '../../lib/db-converters';
import {
  persistInsertCustomList,
  persistUpdateCustomList,
  persistDeleteCustomList,
  persistUpdateShortageItem
} from './shortageDbOperations';

export async function executeCreateCustomList(
  name: string,
  description?: string,
  color?: string
): Promise<CustomReplenishmentList> {
  const id = `list-${generateLocalId()}`;
  const now = new Date().toISOString();

  const newList: CustomReplenishmentList = {
    id,
    name: name.trim(),
    description: description?.trim() || '',
    color: color || '#6366f1',
    createdAt: now,
    updatedAt: now
  };

  await persistInsertCustomList(newList);
  return newList;
}

export async function executeDeleteCustomList(
  items: ShortageItem[],
  listId: string
): Promise<ShortageItem[]> {
  const now = new Date().toISOString();

  const updatedItems = items.map(item => {
    const safeListIds = Array.isArray(item.listIds) ? item.listIds : [];
    if (safeListIds.includes(listId)) {
      const nextListIds = safeListIds.filter(lId => lId !== listId);
      persistUpdateShortageItem(item.id, { listIds: nextListIds, updatedAt: now }).catch(() => {});
      return { ...item, listIds: nextListIds, updatedAt: now };
    }
    return item;
  });

  await persistDeleteCustomList(listId);
  return updatedItems;
}
