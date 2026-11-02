export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filter?: (item: any) => boolean;
}

export function queryLocalStateHelper(
  dbState: Record<string, Record<string, any>>,
  table: string,
  options: QueryOptions = {}
): any[] {
  if (!table || !dbState[table]) return [];

  let results = Object.values(dbState[table]);

  if (options.filter) {
    results = results.filter(options.filter);
  }

  if (options.orderBy) {
    results.sort((a: any, b: any) => {
      const valA = a[options.orderBy!];
      const valB = b[options.orderBy!];
      if (valA < valB) return options.orderDirection === 'desc' ? 1 : -1;
      if (valA > valB) return options.orderDirection === 'desc' ? -1 : 1;
      return 0;
    });
  }

  if (options.offset !== undefined) {
    results = results.slice(options.offset);
  }

  if (options.limit !== undefined) {
    results = results.slice(0, options.limit);
  }

  return results;
}
