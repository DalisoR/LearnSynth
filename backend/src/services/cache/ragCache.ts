import { supabase } from '../../config/supabase';

export interface CachedSearchResult {
  id: string;
  userId: string;
  subjectId?: string;
  query: string;
  queryHash: string;
  results: any[];
  timestamp: Date;
  ttl: number; // Time to live in seconds
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export class RAGCache {
  private memoryCache: Map<string, CachedSearchResult> = new Map();
  private maxMemoryItems: number = 1000;
  private defaultTTL: number = 3600; // 1 hour in seconds
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  /**
   * Generate a hash for the query to use as cache key
   */
  private generateQueryHash(query: string, userId: string, subjectId?: string): string {
    const str = `${query}|${userId}|${subjectId || 'global'}`;
    // Simple hash function (in production, use a more robust hash like SHA-256)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached search results
   */
  async get(
    query: string,
    userId: string,
    subjectId?: string
  ): Promise<CachedSearchResult | null> {
    this.stats.totalRequests++;

    const queryHash = this.generateQueryHash(query, userId, subjectId);

    // Check memory cache first
    const memoryKey = this.getCacheKey(queryHash, userId);
    const memoryResult = this.memoryCache.get(memoryKey);

    if (memoryResult) {
      // Check if expired
      const now = Date.now();
      const expiry = memoryResult.timestamp.getTime() + (memoryResult.ttl * 1000);

      if (now < expiry) {
        this.stats.hits++;
        return memoryResult;
      } else {
        // Remove expired entry
        this.memoryCache.delete(memoryKey);
      }
    }

    // Check database cache
    try {
      const { data, error } = await supabase
        .from('search_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('search_query', query)
        .eq('subject_id', subjectId || null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        this.stats.misses++;
        return null;
      }

      // Check if cache is still valid
      const now = new Date();
      const created = new Date(data.created_at);
      const ageInSeconds = (now.getTime() - created.getTime()) / 1000;

      if (ageInSeconds > this.defaultTTL) {
        this.stats.misses++;
        return null;
      }

      // Cache hit - store in memory and return
      const cachedResult: CachedSearchResult = {
        id: data.id,
        userId: data.user_id,
        subjectId: data.subject_id || undefined,
        query: data.search_query,
        queryHash,
        results: [], // Would need to store actual results in a separate cache_results table
        timestamp: created,
        ttl: this.defaultTTL
      };

      this.addToMemoryCache(cachedResult);
      this.stats.hits++;
      return cachedResult;
    } catch (error) {
      console.error('Error fetching from cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store search results in cache
   */
  async set(
    query: string,
    userId: string,
    subjectId: string | undefined,
    results: any[],
    responseTimeMs?: number
  ): Promise<void> {
    const queryHash = this.generateQueryHash(query, userId, subjectId);
    const cacheKey = this.getCacheKey(queryHash, userId);

    // Store in memory cache
    const memoryResult: CachedSearchResult = {
      id: `mem-${Date.now()}`,
      userId,
      subjectId,
      query,
      queryHash,
      results,
      timestamp: new Date(),
      ttl: this.defaultTTL
    };

    this.addToMemoryCache(memoryResult);

    // Store in database
    try {
      const { error } = await supabase
        .from('search_tracking')
        .insert({
          user_id: userId,
          subject_id: subjectId || null,
          search_query: query,
          results_count: results.length,
          response_time_ms: responseTimeMs || null,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing in cache database:', error);
      }
    } catch (error) {
      console.error('Error storing in cache:', error);
    }
  }

  /**
   * Invalidate cache for a specific subject
   */
  async invalidateSubject(subjectId: string): Promise<void> {
    // Remove from memory cache
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.subjectId === subjectId) {
        this.memoryCache.delete(key);
      }
    }

    // Note: Database cache invalidation would require a cache_results table
    // For now, the cache will expire naturally with TTL
  }

  /**
   * Invalidate cache for a user
   */
  async invalidateUser(userId: string): Promise<void> {
    // Remove from memory cache
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.userId === userId) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    // Database clear would require DELETE query
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.totalRequests === 0
      ? 0
      : (this.stats.hits / this.stats.totalRequests) * 100;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Get cache size information
   */
  getSizeInfo(): {
    memoryItems: number;
    maxMemoryItems: number;
    memoryUsage: string;
  } {
    const memoryItems = this.memoryCache.size;
    const memoryUsage = this.estimateMemoryUsage();

    return {
      memoryItems,
      maxMemoryItems: this.maxMemoryItems,
      memoryUsage
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.memoryCache.entries()) {
      const expiry = value.timestamp.getTime() + (value.ttl * 1000);
      if (now >= expiry) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Add item to memory cache with LRU eviction if needed
   */
  private addToMemoryCache(result: CachedSearchResult): void {
    const memoryKey = this.getCacheKey(result.queryHash, result.userId);

    // If cache is full, remove oldest item
    if (this.memoryCache.size >= this.maxMemoryItems) {
      this.evictOldest();
    }

    this.memoryCache.set(memoryKey, result);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(queryHash: string, userId: string): string {
    return `${queryHash}:${userId}`;
  }

  /**
   * Evict oldest cache entry using LRU approximation
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, value] of this.memoryCache.entries()) {
      const time = value.timestamp.getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): string {
    let bytes = 0;

    for (const [key, value] of this.memoryCache.entries()) {
      bytes += key.length * 2; // UTF-16 encoding
      bytes += JSON.stringify(value).length * 2;
    }

    if (bytes < 1024) {
      return `${bytes} bytes`;
    } else if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    } else {
      return `${Math.round(bytes / (1024 * 1024))} MB`;
    }
  }
}

// Export singleton instance
export const ragCache = new RAGCache();

// Periodically clean up expired cache entries (every 5 minutes)
setInterval(() => {
  const removed = ragCache.cleanup();
  if (removed > 0) {
    console.log(`Cache cleanup: removed ${removed} expired entries`);
  }
}, 5 * 60 * 1000);
