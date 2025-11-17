import Redis from 'ioredis';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  retryStrategy?: (times: number) => number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

class RedisClient {
  private static instance: RedisClient;
  private redis: Redis | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isShuttingDown = false;

  private constructor() {
    this.initializeClient();
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  private initializeClient(): void {
    const redisConfig: RedisConfig = {
      host: config.redis.host || 'localhost',
      port: config.redis.port || 6379,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.redis.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.redis.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      if (!this.isShuttingDown) {
        logger.warn('Redis connection closed, attempting to reconnect...');
        this.handleReconnect();
      }
    });

    this.redis.on('reconnecting', (delay: number, attempt: number) => {
      logger.info(`Redis reconnecting. Attempt: ${attempt}, Delay: ${delay}ms`);
    });

    this.redis.on('fail', () => {
      logger.error('Redis connection failed');
      this.isConnected = false;
    });
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectAttempts * 1000, 10000);

    setTimeout(async () => {
      if (this.redis && !this.isShuttingDown) {
        try {
          await this.redis.connect();
        } catch (err) {
          logger.error('Reconnection attempt failed:', err);
        }
      }
    }, delay);
  }

  public async connect(): Promise<void> {
    if (this.redis && !this.isConnected) {
      try {
        await this.redis.connect();
      } catch (err) {
        logger.error('Failed to connect to Redis:', err);
        throw err;
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }

  public getClient(): Redis | null {
    if (!this.isConnected || !this.redis) {
      logger.warn('Redis client is not connected');
      return null;
    }
    return this.redis;
  }

  public async isRedisAvailable(): Promise<boolean> {
    try {
      const client = this.getClient();
      if (!client) return false;

      const result = await client.ping();
      return result === 'PONG';
    } catch (err) {
      logger.error('Redis availability check failed:', err);
      return false;
    }
  }

  public async getStats(): Promise<{
    connected: boolean;
    serverInfo: any;
    memoryUsage: string;
    connectedClients: number;
  }> {
    const client = this.getClient();
    if (!client) {
      return {
        connected: false,
        serverInfo: null,
        memoryUsage: '0 KB',
        connectedClients: 0,
      };
    }

    try {
      const info = await client.info();
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const clientsMatch = info.match(/connected_clients:(\S+)/);

      return {
        connected: true,
        serverInfo: info,
        memoryUsage: memoryMatch ? memoryMatch[1] : 'N/A',
        connectedClients: clientsMatch ? parseInt(clientsMatch[1]) : 0,
      };
    } catch (err) {
      logger.error('Failed to get Redis stats:', err);
      return {
        connected: false,
        serverInfo: null,
        memoryUsage: '0 KB',
        connectedClients: 0,
      };
    }
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    message: string;
    latency?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const client = this.getClient();
      if (!client) {
        return {
          status: 'unhealthy',
          message: 'Redis client not initialized',
        };
      }

      await client.ping();
      const latency = Date.now() - start;

      if (latency > 1000) {
        return {
          status: 'degraded',
          message: 'High latency',
          latency,
        };
      }

      return {
        status: 'healthy',
        message: 'Redis is healthy',
        latency,
      };
    } catch (err) {
      return {
        status: 'unhealthy',
        message: 'Redis is unhealthy',
        latency: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  public setShuttingDown(): void {
    this.isShuttingDown = true;
  }
}

// Export singleton instance
export const redisClient = RedisClient.getInstance();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing Redis connection...');
  redisClient.setShuttingDown();
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing Redis connection...');
  redisClient.setShuttingDown();
  await redisClient.disconnect();
  process.exit(0);
});

export default redisClient;
