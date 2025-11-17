import Redis from 'ioredis';
import { redisClient } from './redisClient';
import { logger } from '../../utils/logger';

export interface GenericCacheOptions {
  ttl?: number;
  prefix?: string;
  maxSize?: number;
}

export class GenericCache<T = any> {
  private redis: Redis | null = null;
  private prefix: string;
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: GenericCacheOptions = {}) {
    this.redis = redisClient.getClient();
    this.prefix = options.prefix || 'learnsynth:cache:';
    this.defaultTTL = options.ttl || 3600;
    this.maxSize = options.maxSize || 10000;
  }

  /**
   * Store data in cache
   */
  async set(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      logger.warn('Redis not available, data not cached');
      return false;
    }

    try {
      const cacheKey = this.getCacheKey(key);
      const ttl = ttlSeconds || this.defaultTTL;
      const serialized = JSON.stringify(value);

      await client.setex(cacheKey, ttl, serialized);
      return true;
    } catch (error) {
      logger.error('Error caching data:', error);
      return false;
    }
  }

  /**
   * Get data from cache
   */
  async get(key: string): Promise<T | null> {
    const client = this.redis;
    if (!client) {
      return null;
    }

    try {
      const cacheKey = this.getCacheKey(key);
      const cached = await client.get(cacheKey);

      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as T;
    } catch (error) {
      logger.error('Error retrieving cached data:', error);
      return null;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    try {
      const cacheKey = this.getCacheKey(key);
      const result = await client.del(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Error deleting cached data:', error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    try {
      const cacheKey = this.getCacheKey(key);
      const result = await client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Error checking cache key existence:', error);
      return false;
    }
  }

  /**
   * Clear all cache with this prefix
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

      const deleted = await client.del(...keys);
      return deleted;
    } catch (error) {
      logger.error('Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(keys: string[]): Promise<(T | null)[]> {
    const client = this.redis;
    if (!client) {
      return keys.map(() => null);
    }

    try {
      const cacheKeys = keys.map((key) => this.getCacheKey(key));
      const values = await client.mget(...cacheKeys);

      return values.map((value) => (value ? (JSON.parse(value) as T) : null));
    } catch (error) {
      logger.error('Error getting multiple cache keys:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset(items: Record<string, T>, ttlSeconds?: number): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    try {
      const ttl = ttlSeconds || this.defaultTTL;
      const pipeline = client.pipeline();

      for (const [key, value] of Object.entries(items)) {
        const cacheKey = this.getCacheKey(key);
        pipeline.setex(cacheKey, ttl, JSON.stringify(value));
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Error setting multiple cache keys:', error);
      return false;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, by: number = 1): Promise<number | null> {
    const client = this.redis;
    if (!client) {
      return null;
    }

    try {
      const cacheKey = this.getCacheKey(key);
      const result = await client.incrby(cacheKey, by);
      await client.expire(cacheKey, this.defaultTTL);
      return result;
    } catch (error) {
      logger.error('Error incrementing cache value:', error);
      return null;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    const client = this.redis;
    if (!client) {
      return -1;
    }

    try {
      const cacheKey = this.getCacheKey(key);
      const ttl = await client.ttl(cacheKey);
      return ttl;
    } catch (error) {
      logger.error('Error getting TTL:', error);
      return -1;
    }
  }

  /**
   * Extend TTL for a key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    try {
      const cacheKey = this.getCacheKey(key);
      const result = await client.expire(cacheKey, ttlSeconds);
      return result === 1;
    } catch (error) {
      logger.error('Error extending TTL:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    memoryUsage: string;
  }> {
    const client = this.redis;
    if (!client) {
      return {
        totalEntries: 0,
        memoryUsage: '0 KB',
      };
    }

    try {
      const keys = await client.keys(`${this.prefix}*`);
      const totalEntries = keys.length;

      const info = await client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'N/A';

      return {
        totalEntries,
        memoryUsage,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        memoryUsage: '0 KB',
      };
    }
  }

  private getCacheKey(key: string): string {
    return `${this.prefix}${key}`;
  }
}

// Export pre-configured instances for common use cases
export const userPreferencesCache = new GenericCache({
  prefix: 'learnsynth:user:prefs:',
  ttl: 86400, // 24 hours
});

export const apiResponseCache = new GenericCache({
  prefix: 'learnsynth:api:response:',
  ttl: 300, // 5 minutes
});

export const contentMetadataCache = new GenericCache({
  prefix: 'learnsynth:content:metadata:',
  ttl: 3600, // 1 hour
});

export default GenericCache;
