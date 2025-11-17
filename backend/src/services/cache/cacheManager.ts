import { ragCache } from './ragCache';
import { ragCacheRedis } from './ragCacheRedis';
import { sessionCache } from './sessionCache';
import { userPreferencesCache, apiResponseCache, contentMetadataCache } from './genericCache';
import { redisClient } from './redisClient';
import { logger } from '../../utils/logger';

export interface CacheConfig {
  enableRedis: boolean;
  enableInMemory: boolean;
  defaultTTL: number;
  maxMemoryItems: number;
}

export interface CacheMetrics {
  redis: {
    connected: boolean;
    latency?: number;
    memoryUsage: string;
    connectedClients: number;
  };
  rag: {
    redisHits: number;
    redisMisses: number;
    memoryHits: number;
    memoryMisses: number;
    hitRate: number;
  };
  sessions: {
    totalSessions: number;
    totalUsers: number;
  };
  generic: {
    userPreferencesEntries: number;
    apiResponseEntries: number;
    contentMetadataEntries: number;
  };
}

export class CacheManager {
  private static instance: CacheManager;
  private config: CacheConfig;

  private constructor() {
    this.config = {
      enableRedis: true,
      enableInMemory: true,
      defaultTTL: 3600,
      maxMemoryItems: 1000,
    };
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Initialize cache systems
   */
  async initialize(): Promise<void> {
    logger.info('Initializing cache systems...');

    // Check Redis availability
    const redisAvailable = await redisClient.isRedisAvailable();
    if (redisAvailable) {
      logger.info('Redis cache is available and ready');
    } else {
      logger.warn('Redis cache is not available, falling back to in-memory cache');
      this.config.enableRedis = false;
    }

    // Initialize RAG cache
    if (this.config.enableRedis) {
      logger.info('Using Redis for RAG caching');
    } else {
      logger.info('Using in-memory cache for RAG');
    }

    logger.info('Cache systems initialized');
  }

  /**
   * Get RAG results with Redis-first strategy
   */
  async getRAGResults(
    query: string,
    userId: string,
    subjectId?: string,
    queryType: 'similarity' | 'keyword' | 'hybrid' = 'similarity'
  ): Promise<any | null> {
    // Try Redis first if enabled
    if (this.config.enableRedis) {
      const redisResult = await ragCacheRedis.get(query, userId, subjectId, queryType);
      if (redisResult) {
        logger.debug(`RAG cache hit (Redis): ${query.substring(0, 50)}...`);
        return redisResult;
      }
    }

    // Fallback to in-memory cache
    if (this.config.enableInMemory) {
      const memoryResult = await ragCache.get(query, userId, subjectId);
      if (memoryResult) {
        logger.debug(`RAG cache hit (Memory): ${query.substring(0, 50)}...`);
        return memoryResult;
      }
    }

    logger.debug(`RAG cache miss: ${query.substring(0, 50)}...`);
    return null;
  }

  /**
   * Store RAG results with Redis-first strategy
   */
  async setRAGResults(
    query: string,
    userId: string,
    subjectId: string | undefined,
    results: any[],
    context: any,
    queryType: 'similarity' | 'keyword' | 'hybrid' = 'similarity',
    ttlSeconds?: number
  ): Promise<void> {
    // Store in Redis if enabled
    if (this.config.enableRedis) {
      await ragCacheRedis.set(
        query,
        userId,
        subjectId,
        results,
        context,
        queryType,
        ttlSeconds
      );
    }

    // Also store in in-memory cache for faster access
    if (this.config.enableInMemory) {
      await ragCache.set(query, userId, subjectId, results);
    }

    logger.debug(`RAG results cached: ${query.substring(0, 50)}...`);
  }

  /**
   * Invalidate RAG cache for a subject
   */
  async invalidateSubject(subjectId: string): Promise<void> {
    logger.info(`Invalidating RAG cache for subject: ${subjectId}`);

    if (this.config.enableRedis) {
      await ragCacheRedis.invalidateSubject(subjectId);
    }

    // Note: In-memory cache invalidation would need to be implemented per subject
    logger.info(`RAG cache invalidated for subject: ${subjectId}`);
  }

  /**
   * Invalidate RAG cache for a user
   */
  async invalidateUser(userId: string): Promise<void> {
    logger.info(`Invalidating RAG cache for user: ${userId}`);

    if (this.config.enableRedis) {
      await ragCacheRedis.invalidateUser(userId);
    }

    if (this.config.enableInMemory) {
      await ragCache.invalidateUser(userId);
    }

    logger.info(`RAG cache invalidated for user: ${userId}`);
  }

  /**
   * Get cache metrics
   */
  async getMetrics(): Promise<CacheMetrics> {
    const redisStats = await redisClient.getStats();

    // Get RAG cache stats
    const ragRedisStats = ragCacheRedis.getStats();
    const ragMemoryStats = ragCache.getStats();

    // Get session stats
    const sessionStats = await sessionCache.getStats();

    // Get generic cache stats
    const userPrefsStats = await userPreferencesCache.getStats();
    const apiRespStats = await apiResponseCache.getStats();
    const contentStats = await contentMetadataCache.getStats();

    return {
      redis: {
        connected: redisStats.connected,
        memoryUsage: redisStats.memoryUsage,
        connectedClients: redisStats.connectedClients,
      },
      rag: {
        redisHits: ragRedisStats.hits,
        redisMisses: ragRedisStats.misses,
        memoryHits: ragMemoryStats.hits,
        memoryMisses: ragMemoryStats.misses,
        hitRate: this.calculateOverallHitRate(
          ragRedisStats,
          ragMemoryStats
        ),
      },
      sessions: {
        totalSessions: sessionStats.totalSessions,
        totalUsers: sessionStats.totalUsers,
      },
      generic: {
        userPreferencesEntries: userPrefsStats.totalEntries,
        apiResponseEntries: apiRespStats.totalEntries,
        contentMetadataEntries: contentStats.totalEntries,
      },
    };
  }

  /**
   * Health check for all cache systems
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    details: {
      redis: any;
      rag: any;
      sessions: any;
    };
  }> {
    const redisHealth = await redisClient.healthCheck();

    // Check RAG cache
    const ragStats = ragCacheRedis.getStats();

    // Check session cache
    const sessionCount = await sessionCache.getStats();

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: string[] = [];

    if (!redisHealth.status || redisHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
      issues.push('Redis is unhealthy');
    } else if (redisHealth.status === 'degraded') {
      overallStatus = 'degraded';
      issues.push(`Redis latency: ${redisHealth.latency}ms`);
    }

    if (ragStats.hitRate < 50) {
      issues.push(`Low RAG cache hit rate: ${ragStats.hitRate}%`);
    }

    if (issues.length > 0) {
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }

    return {
      status: overallStatus,
      message: issues.length > 0 ? `Issues: ${issues.join(', ')}` : 'All cache systems healthy',
      details: {
        redis: redisHealth,
        rag: ragStats,
        sessions: sessionCount,
      },
    };
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<{
    redisCleared: number;
    memoryCleared: void;
    sessionsDeleted: number;
  }> {
    logger.warn('Clearing all caches...');

    let redisCleared = 0;
    if (this.config.enableRedis) {
      redisCleared += await ragCacheRedis.clear();
      await userPreferencesCache.clear();
      await apiResponseCache.clear();
      await contentMetadataCache.clear();
    }

    const memoryCleared = ragCache.clear();
    const sessionsDeleted = await sessionCache.deleteUserSessions('*');

    logger.info('All caches cleared');
    return {
      redisCleared,
      memoryCleared,
      sessionsDeleted,
    };
  }

  /**
   * Warm up caches with common data
   */
  async warmUp(data?: {
    rag?: Array<{
      query: string;
      userId: string;
      subjectId?: string;
      results: any[];
      context: any;
    }>;
    sessions?: Array<{
      userId: string;
      sessionId: string;
      data: Record<string, any>;
    }>;
  }): Promise<void> {
    logger.info('Warming up caches...');

    if (data?.rag && this.config.enableRedis) {
      await ragCacheRedis.warmUp(data.rag);
    }

    logger.info('Cache warm-up completed');
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Cache configuration updated', newConfig);
  }

  private calculateOverallHitRate(
    redisStats: any,
    memoryStats: any
  ): number {
    const totalRequests = redisStats.totalRequests + memoryStats.totalRequests;
    const totalHits = redisStats.hits + memoryStats.hits;

    if (totalRequests === 0) {
      return 0;
    }

    return Math.round((totalHits / totalRequests) * 10000) / 100;
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanup(): Promise<{
    redisCleaned: number;
    memoryCleaned: number;
  }> {
    let redisCleaned = 0;
    let memoryCleaned = 0;

    if (this.config.enableRedis) {
      // Redis handles TTL automatically
      const sizeInfo = await ragCacheRedis.getSizeInfo();
      redisCleaned = sizeInfo.totalEntries;
    }

    if (this.config.enableInMemory) {
      memoryCleaned = ragCache.cleanup();
    }

    if (redisCleaned > 0 || memoryCleaned > 0) {
      logger.info(`Cache cleanup completed: Redis=${redisCleaned}, Memory=${memoryCleaned}`);
    }

    return {
      redisCleaned,
      memoryCleaned,
    };
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

export default cacheManager;
