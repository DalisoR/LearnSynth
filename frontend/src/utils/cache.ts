interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class CacheManager {
  private memoryCache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    };

    // Store in memory
    this.memoryCache.set(key, item);

    // Store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to persist cache to localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    // Try memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && !this.isExpired(memoryItem)) {
      return memoryItem.data;
    }

    // Try localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const item: CacheItem<T> = JSON.parse(stored);
        if (!this.isExpired(item)) {
          // Move back to memory cache
          this.memoryCache.set(key, item);
          return item.data;
        }
        // Remove expired item
        localStorage.removeItem(`cache_${key}`);
      }
    } catch (error) {
      console.warn('Failed to read cache from localStorage:', error);
    }

    return null;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.memoryCache.delete(key);
    localStorage.removeItem(`cache_${key}`);
  }

  clear(): void {
    this.memoryCache.clear();
    // Clear all cache items from localStorage
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith('cache_')
    );
    keys.forEach((key) => localStorage.removeItem(key));
  }

  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() > item.expiry;
  }

  getCacheStats(): {
    memorySize: number;
    keys: string[];
  } {
    return {
      memorySize: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
    };
  }
}

export const cacheManager = new CacheManager();

export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  const cacheKey = `fetch_${url}`;
  const cached = cacheManager.get<T>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    cacheManager.set(cacheKey, data, ttl);
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

export function invalidateCache(pattern?: string): void {
  if (pattern) {
    const stats = cacheManager.getCacheStats();
    const keys = stats.keys.filter((key) => key.includes(pattern));
    keys.forEach((key) => cacheManager.delete(key));
  } else {
    cacheManager.clear();
  }
}

export function setCacheItem<T>(key: string, data: T, ttl?: number): void {
  cacheManager.set(key, data, ttl);
}

export function getCacheItem<T>(key: string): T | null {
  return cacheManager.get<T>(key);
}

export function isCached(key: string): boolean {
  return cacheManager.has(key);
}
