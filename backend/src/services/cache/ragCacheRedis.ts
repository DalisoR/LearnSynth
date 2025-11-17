import Redis from 'ioredis';
import { redisClient } from './redisClient';
import { logger } from '../../utils/logger';

export interface CachedRAGResult {
  id: string;
  userId: string;
  subjectId?: string;
  query: string;
  queryHash: string;
  results: any[];
  context: any;
  timestamp: Date;
  ttl: number;
  queryType: 'similarity' | 'keyword' | 'hybrid';
  responseTimeMs?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  totalBytes: number;
}

export interface RAGCacheOptions {
  defaultTTL?: number;
  maxCacheSize?: number;
  enableCompression?: boolean;
}

export class RAGCacheRedis {
  private redis: Redis | null = null;
  private defaultTTL: number;
  private prefix: string;
  private stats: CacheStats;
  private maxCacheSize: number;
  private enableCompression: boolean;

  constructor(options: RAGCacheOptions = {}) {
    this.redis = redisClient.getClient();
    this.defaultTTL = options.defaultTTL || 3600; // 1 hour
    this.maxCacheSize = options.maxCacheSize || 10000; // Max 10k entries
    this.enableCompression = options.enableCompression || false;
    this.prefix = 'learnsynth:rag:';
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      totalBytes: 0,
    };
  }

  /**
   * Generate a hash for the query to use as cache key
   */
  private generateQueryHash(
    query: string,
    userId: string,
    subjectId?: string,
    queryType: string = 'similarity'
  ): string {
    const str = `${query}|${userId}|${subjectId || 'global'}|${queryType}`;
    // Use Redis SHA256 if available, otherwise use simple hash
    return this.simpleHash(str);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString(36);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached RAG results
   */
  async get(
    query: string,
    userId: string,
    subjectId?: string,
    queryType: 'similarity' | 'keyword' | 'hybrid' = 'similarity'
  ): Promise<CachedRAGResult | null> {
    this.stats.totalRequests++;

    const client = this.redis;
    if (!client) {
      this.stats.misses++;
      return null;
    }

    try {
      const queryHash = this.generateQueryHash(query, userId, subjectId, queryType);
      const cacheKey = this.getCacheKey(queryHash, userId, queryType);

      const cached = await client.get(cacheKey);

      if (!cached) {
        this.stats.misses++;
        return null;
      }

      const cachedResult: CachedRAGResult = JSON.parse(cached);
      this.stats.hits++;
      this.stats.totalBytes += Buffer.byteLength(cached, 'utf-8');

      return cachedResult;
    } catch (error) {
      logger.error('Error fetching from RAG cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store RAG results in cache
   */
  async set(
    query: string,
    userId: string,
    subjectId: string | undefined,
    results: any[],
    context: any,
    queryType: 'similarity' | 'keyword' | 'hybrid' = 'similarity',
    ttlSeconds?: number,
    responseTimeMs?: number
  ): Promise<void> {
    const client = this.redis;
    if (!client) {
      logger.warn('Redis not available, RAG results not cached');
      return;
    }

    try {
      const queryHash = this.generateQueryHash(query, userId, subjectId, queryType);
      const cacheKey = this.getCacheKey(queryHash, userId, queryType);
      const ttl = ttlSeconds || this.defaultTTL;

      const cachedResult: CachedRAGResult = {
        id: `cache-${Date.now()}`,
        userId,
        subjectId,
        query,
        queryHash,
        results,
        context,
        timestamp: new Date(),
        ttl,
        queryType,
        responseTimeMs,
      };

      // Check cache size before storing
      await this.checkCacheSize();

      await client.setex(cacheKey, ttl, JSON.stringify(cachedResult));

      // Store metadata for invalidation
      await this.storeMetadata(userId, subjectId, queryHash, queryType, ttl);

      logger.debug(`RAG result cached: ${queryHash} for user ${userId}`);
    } catch (error) {
      logger.error('Error storing RAG result in cache:', error);
    }
  }

  /**
   * Invalidate cache for a specific subject
   */
  async invalidateSubject(subjectId: string): Promise<number> {
    const client = this.redis;
    if (!client) {
      return 0;
    }

    try {
      const metadataKey = `learnsynth:rag:metadata:subject:${subjectId}`;
      const queryHashes = await client.smembers(metadataKey);

      if (queryHashes.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      const userIds = await client.smembers(`learnsynth:rag:metadata:subject:${subjectId}:users`);

      for (const userId of userIds) {
        for (const queryHash of queryHashes) {
          const cacheKey = `${this.prefix}${userId}:${queryHash}:*`;
          const keys = await client.keys(cacheKey);
          if (keys.length > 0) {
            await client.del(...keys);
            deletedCount += keys.length;
          }
        }
      }

      // Clean up metadata
      await client.del(metadataKey);
      await client.del(`learnsynth:rag:metadata:subject:${subjectId}:users`);

      logger.info(`Invalidated ${deletedCount} cached entries for subject ${subjectId}`);
      return deletedCount;
    } catch (error) {
      logger.error('Error invalidating subject cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache for a user
   */
  async invalidateUser(userId: string): Promise<number> {
    const client = this.redis;
    if (!client) {
      return 0;
    }

    try {
      const keys = await client.keys(`${this.prefix}${userId}:*`);
      let deletedCount = 0;

      if (keys.length > 0) {
        deletedCount = await client.del(...keys);
      }

      // Clean up metadata
      const metadataKeys = await client.keys(`learnsynth:rag:metadata:*:${userId}`);
      if (metadataKeys.length > 0) {
        await client.del(...metadataKeys);
      }

      logger.info(`Invalidated ${deletedCount} cached entries for user ${userId}`);
      return deletedCount;
    } catch (error) {
      logger.error('Error invalidating user cache:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache by query type
   */
  async invalidateByType(queryType: 'similarity' | 'keyword' | 'hybrid'): Promise<number> {
    const client = this.redis;
    if (!client) {
      return 0;
    }

    try {
      const keys = await client.keys(`${this.prefix}*:${queryType}`);
      let deletedCount = 0;

      if (keys.length > 0) {
        deletedCount = await client.del(...keys);
      }

      logger.info(`Invalidated ${deletedCount} cached entries of type ${queryType}`);
      return deletedCount;
    } catch (error) {
      logger.error(`Error invalidating cache by type ${queryType}:`, error);
      return 0;
    }
  }

  /**
   * Clear all RAG cache
   */
  async clear(): Promise<number> {
    const client = this.redis;
    if (!client) {
      return 0;
    }

    try {
      const keys = await client.keys(`${this.prefix}*`);
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await client.del(...keys);
      logger.info(`Cleared ${deletedCount} cached RAG entries`);
      return deletedCount;
    } catch (error) {
      logger.error('Error clearing RAG cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate =
      this.stats.totalRequests === 0
        ? 0
        : (this.stats.hits / this.stats.totalRequests) * 100;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Get cache size information
   */
  async getSizeInfo(): Promise<{
    totalEntries: number;
    memoryUsage: string;
    entriesByType: Record<string, number>;
  }> {
    const client = this.redis;
    if (!client) {
      return {
        totalEntries: 0,
        memoryUsage: '0 KB',
        entriesByType: { similarity: 0, keyword: 0, hybrid: 0 },
      };
    }

    try {
      const keys = await client.keys(`${this.prefix}*`);
      const totalEntries = keys.length;

      // Count by type
      const entriesByType: Record<string, number> = {
        similarity: 0,
        keyword: 0,
        hybrid: 0,
      };

      for (const key of keys) {
        if (key.includes(':similarity')) entriesByType.similarity++;
        else if (key.includes(':keyword')) entriesByType.keyword++;
        else if (key.includes(':hybrid')) entriesByType.hybrid++;
      }

      // Get memory info
      const info = await client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'N/A';

      return {
        totalEntries,
        memoryUsage,
        entriesByType,
      };
    } catch (error) {
      logger.error('Failed to get cache size info:', error);
      return {
        totalEntries: 0,
        memoryUsage: '0 KB',
        entriesByType: { similarity: 0, keyword: 0, hybrid: 0 },
      };
    }
  }

  /**
   * Warm up cache with common queries
   */
  async warmUp(commonQueries: Array<{
    query: string;
    userId: string;
    subjectId?: string;
    queryType?: 'similarity' | 'keyword' | 'hybrid';
    results: any[];
    context: any;
  }>): Promise<void> {
    const client = this.redis;
    if (!client) {
      logger.warn('Redis not available, cannot warm up cache');
      return;
    }

    logger.info(`Warming up RAG cache with ${commonQueries.length} queries`);

    for (const item of commonQueries) {
      await this.set(
        item.query,
        item.userId,
        item.subjectId,
        item.results,
        item.context,
        item.queryType || 'similarity',
        this.defaultTTL
      );
    }

    logger.info('RAG cache warm-up completed');
  }

  private getCacheKey(queryHash: string, userId: string, queryType: string): string {
    return `${this.prefix}${userId}:${queryHash}:${queryType}`;
  }

  private async storeMetadata(
    userId: string,
    subjectId: string | undefined,
    queryHash: string,
    queryType: string,
    ttl: number
  ): Promise<void> {
    const client = this.redis;
    if (!client) return;

    try {
      // Store subject -> queryHash mapping
      if (subjectId) {
        const subjectMetadataKey = `learnsynth:rag:metadata:subject:${subjectId}`;
        await client.sadd(subjectMetadataKey, queryHash);
        await client.expire(subjectMetadataKey, ttl);

        const subjectUsersKey = `learnsynth:rag:metadata:subject:${subjectId}:users`;
        await client.sadd(subjectUsersKey, userId);
        await client.expire(subjectUsersKey, ttl);
      }

      // Store user -> queryHash mapping for quick invalidation
      const userMetadataKey = `learnsynth:rag:metadata:user:${userId}`;
      await client.sadd(userMetadataKey, queryHash);
      await client.expire(userMetadataKey, ttl);
    } catch (error) {
      logger.error('Error storing cache metadata:', error);
    }
  }

  private async checkCacheSize(): Promise<void> {
    const client = this.redis;
    if (!client) return;

    try {
      const keys = await client.keys(`${this.prefix}*`);
      if (keys.length >= this.maxCacheSize) {
        // Remove oldest 10% of entries
        const toRemove = Math.ceil(this.maxCacheSize * 0.1);
        const keysToDelete = keys.slice(0, toRemove);
        if (keysToDelete.length > 0) {
          await client.del(...keysToDelete);
          logger.info(`Evicted ${toRemove} oldest cache entries`);
        }
      }
    } catch (error) {
      logger.error('Error checking cache size:', error);
    }
  }
}

// Export singleton instance
export const ragCacheRedis = new RAGCacheRedis();

export default ragCacheRedis;
