import { cacheManager } from './cache';

interface ApiCacheOptions {
  ttl?: number;
  key?: string;
  invalidateOn?: string[];
}

const API_CACHE_PREFIX = 'api';

export class ApiCache {
  private defaultTtl: number;

  constructor(defaultTtl: number = 5 * 60 * 1000) {
    this.defaultTtl = defaultTtl;
  }

  async get<T>(url: string, options?: RequestInit): Promise<T> {
    const cacheKey = this.getCacheKey(url, options);
    const cached = cacheManager.get<T>(cacheKey);

    if (cached) {
      return cached;
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    cacheManager.set(cacheKey, data, this.defaultTtl);

    return data;
  }

  async post<T>(
    url: string,
    data: any,
    options?: Omit<ApiCacheOptions, 'key'>
  ): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();

    // Invalidate related caches
    this.invalidatePattern(url);

    return result;
  }

  async put<T>(
    url: string,
    data: any,
    options?: Omit<ApiCacheOptions, 'key'>
  ): Promise<T> {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();

    // Invalidate related caches
    this.invalidatePattern(url);

    return result;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();

    // Invalidate related caches
    this.invalidatePattern(url);

    return result;
  }

  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const cacheKey = options?.method ? `${method}_${url}` : url;
    return `${API_CACHE_PREFIX}_${cacheKey}`;
  }

  invalidate(url: string): void {
    cacheManager.delete(url);
  }

  invalidatePattern(pattern: string): void {
    const stats = cacheManager.getCacheStats();
    const keys = stats.keys.filter((key) => key.includes(pattern));
    keys.forEach((key) => cacheManager.delete(key));
  }

  clear(): void {
    cacheManager.clear();
  }

  isCached(url: string): boolean {
    return cacheManager.has(url);
  }
}

export const apiCache = new ApiCache();

export function cacheApiResponse<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cacheManager.get<T>(key);

  if (cached) {
    return Promise.resolve(cached);
  }

  return fetcher().then((data) => {
    cacheManager.set(key, data, ttl);
    return data;
  });
}

export function invalidateApiCache(pattern?: string): void {
  if (pattern) {
    apiCache.invalidatePattern(pattern);
  } else {
    apiCache.clear();
  }
}
