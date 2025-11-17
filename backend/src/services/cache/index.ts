// Redis Client
export { redisClient, default as redisClientDefault } from './redisClient';

// Session Cache
export {
  sessionCache,
  UserSession,
  SessionCacheOptions,
  default as sessionCacheDefault,
} from './sessionCache';

// RAG Cache
export {
  ragCacheRedis,
  CachedRAGResult,
  CacheStats,
  RAGCacheOptions,
  default as ragCacheRedisDefault,
} from './ragCacheRedis';

// Original in-memory RAG cache (fallback)
export { ragCache, CachedSearchResult, CacheStats as RagCacheStats } from './ragCache';

// Generic Cache
export {
  GenericCache,
  userPreferencesCache,
  apiResponseCache,
  contentMetadataCache,
  default as genericCacheDefault,
} from './genericCache';

// Cache Manager (orchestrates all caching)
export {
  cacheManager,
  CacheConfig,
  CacheMetrics,
  default as cacheManagerDefault,
} from './cacheManager';

// Re-export all from cacheManager as the main API
export { default as default } from './cacheManager';
