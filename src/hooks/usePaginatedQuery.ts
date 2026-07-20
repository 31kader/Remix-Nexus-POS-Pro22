import { useState, useEffect, useCallback, useRef } from 'react';
import { queryLocalState, QueryOptions } from '../lib/local-db';
import { localDb } from '../services/LocalDatabase';

export function usePaginatedQuery<T>(path: string, options: QueryOptions, pageSize: number = 50) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchPage = useCallback((reset: boolean = false) => {
    setLoading(true);
    const currentOffset = reset ? 0 : offset;
    
    // Query local DB (which is in memory)
    const results = queryLocalState(path, {
      ...options,
      offset: currentOffset,
      limit: pageSize
    }) as T[];

    if (isMounted.current) {
      setData(prev => reset ? results : [...prev, ...results]);
      setOffset(currentOffset + results.length);
      setHasMore(results.length === pageSize);
      setLoading(false);
    }
  }, [path, options.orderBy, options.orderDirection, offset, pageSize]);

  // Initial fetch and subscription
  useEffect(() => {
    fetchPage(true);
    
    const unsubscribe = localDb.subscribe(path, () => {
      // Refresh current data if DB changes
      fetchPage(true);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [path]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage();
    }
  }, [loading, hasMore, fetchPage]);

  return { data, loading, hasMore, loadMore };
}
