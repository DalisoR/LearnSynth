import { useState, useEffect, useCallback } from 'react';
import { cacheManager, cachedFetch, invalidateCache } from '@/utils/cache';

interface UseCacheOptions {
  ttl?: number;
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isCached: boolean;
  cacheStats: { memorySize: number; keys: string[] };
}

export function useCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: UseCacheOptions = {}
): UseCacheReturn<T> {
  const { ttl = 5 * 60 * 1000, enabled = true, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isCached = cacheManager.has(key);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFn();
      setData(result);
      cacheManager.set(key, result, ttl);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, ttl, enabled, onSuccess, onError]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Check cache first
    const cached = cacheManager.get<T>(key);

    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    // Fetch fresh data
    fetchData();
  }, [key, fetchData]);

  const cacheStats = cacheManager.getCacheStats();

  return {
    data,
    loading,
    error,
    refetch,
    isCached,
    cacheStats,
  };
}

interface UseApiCacheOptions<T> extends UseCacheOptions {
  url: string;
  method?: string;
  body?: any;
}

export function useApiCache<T>(
  url: string,
  options: UseApiCacheOptions<T>
): UseCacheReturn<T> & { invalidate: () => void } {
  const { method = 'GET', body, ...cacheOptions } = options;
  const cacheKey = `api_${url}`;

  const fetchFn = useCallback(async () => {
    return cachedFetch<T>(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
    });
  }, [url, method, body]);

  const cacheResult = useCache(cacheKey, fetchFn, cacheOptions);

  const invalidate = useCallback(() => {
    cacheManager.delete(cacheKey);
  }, [cacheKey]);

  return {
    ...cacheResult,
    invalidate,
  };
}

export { invalidateCache, cacheManager };
