import Redis from 'ioredis';
import { redisClient } from './redisClient';
import { logger } from '../../utils/logger';

export interface UserSession {
  userId: string;
  sessionId: string;
  data: Record<string, any>;
  createdAt: Date;
  lastAccessed: Date;
  expiresAt: Date;
}

export interface SessionCacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class SessionCache {
  private redis: Redis | null = null;
  private prefix: string;
  private defaultTTL: number;

  constructor(options: SessionCacheOptions = {}) {
    this.redis = redisClient.getClient();
    this.prefix = options.prefix || 'learnsynth:session:';
    this.defaultTTL = options.ttl || 3600; // 1 hour default
  }

  /**
   * Store session data
   */
  async setSession(
    userId: string,
    sessionId: string,
    data: Record<string, any>,
    ttlSeconds?: number
  ): Promise<void> {
    const client = this.redis;
    if (!client) {
      logger.warn('Redis not available, session not cached');
      return;
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      const ttl = ttlSeconds || this.defaultTTL;

      const sessionData: UserSession = {
        userId,
        sessionId,
        data,
        createdAt: new Date(),
        lastAccessed: new Date(),
        expiresAt: new Date(Date.now() + ttl * 1000),
      };

      await client.setex(key, ttl, JSON.stringify(sessionData));

      // Also store a user-to-session mapping for cleanup
      const userSessionsKey = this.getUserSessionsKey(userId);
      await client.sadd(userSessionsKey, sessionId);
      await client.expire(userSessionsKey, ttl);

      logger.debug(`Session cached: ${sessionId} for user ${userId}`);
    } catch (error) {
      logger.error('Failed to cache session:', error);
    }
  }

  /**
   * Get session data
   */
  async getSession(userId: string, sessionId: string): Promise<UserSession | null> {
    const client = this.redis;
    if (!client) {
      logger.warn('Redis not available, cannot retrieve session');
      return null;
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      const cached = await client.get(key);

      if (!cached) {
        return null;
      }

      const sessionData: UserSession = JSON.parse(cached);

      // Update last accessed time
      sessionData.lastAccessed = new Date();
      await this.setSession(userId, sessionId, sessionData.data);

      return sessionData;
    } catch (error) {
      logger.error('Failed to retrieve session:', error);
      return null;
    }
  }

  /**
   * Update session data without changing TTL
   */
  async updateSession(
    userId: string,
    sessionId: string,
    data: Partial<Record<string, any>>
  ): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      const cached = await client.get(key);

      if (!cached) {
        return false;
      }

      const sessionData: UserSession = JSON.parse(cached);
      sessionData.data = { ...sessionData.data, ...data };
      sessionData.lastAccessed = new Date();

      await client.setex(key, this.defaultTTL, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      logger.error('Failed to update session:', error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      const userSessionsKey = this.getUserSessionsKey(userId);

      await client.del(key);
      await client.srem(userSessionsKey, sessionId);

      logger.debug(`Session deleted: ${sessionId} for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    const client = this.redis;
    if (!client) {
      return 0;
    }

    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await client.smembers(userSessionsKey);

      if (sessionIds.length === 0) {
        return 0;
      }

      const keys = sessionIds.map((sessionId) => this.getSessionKey(userId, sessionId));
      await client.del(...keys);
      await client.del(userSessionsKey);

      logger.debug(`Deleted ${sessionIds.length} sessions for user ${userId}`);
      return sessionIds.length;
    } catch (error) {
      logger.error('Failed to delete user sessions:', error);
      return 0;
    }
  }

  /**
   * Check if session exists
   */
  async hasSession(userId: string, sessionId: string): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check session existence:', error);
      return false;
    }
  }

  /**
   * Get all session IDs for a user
   */
  async getUserSessionIds(userId: string): Promise<string[]> {
    const client = this.redis;
    if (!client) {
      return [];
    }

    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await client.smembers(userSessionsKey);
      return sessionIds;
    } catch (error) {
      logger.error('Failed to get user session IDs:', error);
      return [];
    }
  }

  /**
   * Extend session TTL
   */
  async extendSession(userId: string, sessionId: string, ttlSeconds?: number): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    try {
      const key = this.getSessionKey(userId, sessionId);
      const ttl = ttlSeconds || this.defaultTTL;
      const result = await client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Failed to extend session TTL:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalSessions: number;
    totalUsers: number;
    memoryUsage: string;
  }> {
    const client = this.redis;
    if (!client) {
      return {
        totalSessions: 0,
        totalUsers: 0,
        memoryUsage: '0 KB',
      };
    }

    try {
      const keys = await client.keys(`${this.prefix}*`);
      const totalSessions = keys.length;

      // Count unique users
      const userKeys = await client.keys(`${this.prefix}user:*`);
      const totalUsers = userKeys.length;

      // Get memory info
      const info = await client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'N/A';

      return {
        totalSessions,
        totalUsers,
        memoryUsage,
      };
    } catch (error) {
      logger.error('Failed to get session cache stats:', error);
      return {
        totalSessions: 0,
        totalUsers: 0,
        memoryUsage: '0 KB',
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanup(): Promise<number> {
    const client = this.redis;
    if (!client) {
      return 0;
    }

    try {
      // Redis automatically expires keys with EXPIRE, so this is mainly for metrics
      const keys = await client.keys(`${this.prefix}*`);
      let expiredCount = 0;

      for (const key of keys) {
        const ttl = await client.ttl(key);
        if (ttl < 0) {
          await client.del(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        logger.info(`Cleaned up ${expiredCount} expired session keys`);
      }

      return expiredCount;
    } catch (error) {
      logger.error('Failed to clean up expired sessions:', error);
      return 0;
    }
  }

  private getSessionKey(userId: string, sessionId: string): string {
    return `${this.prefix}${userId}:${sessionId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `${this.prefix}user:${userId}:sessions`;
  }
}

// Export singleton instance with default options
export const sessionCache = new SessionCache();

// Periodic cleanup (every 10 minutes)
setInterval(async () => {
  try {
    const removed = await sessionCache.cleanup();
    if (removed > 0) {
      logger.info(`Session cache cleanup: removed ${removed} expired keys`);
    }
  } catch (error) {
    logger.error('Session cache cleanup error:', error);
  }
}, 10 * 60 * 1000);

export default sessionCache;
