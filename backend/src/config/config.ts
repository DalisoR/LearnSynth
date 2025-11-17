import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // LLM Provider
  llm: {
    provider: process.env.LLM_PROVIDER || 'openai',
    apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4o',
  },

  // TTS Provider
  tts: {
    provider: process.env.TTS_PROVIDER || 'stub',
    apiKey: process.env.ELEVENLABS_API_KEY || process.env.GOOGLE_CLOUD_TTS_KEY || '',
    voice: process.env.TTS_VOICE || 'default',
  },

  // Embeddings
  embeddings: {
    provider: process.env.EMBEDDING_PROVIDER || 'stub',
    apiKey: process.env.HUGGINGFACE_API_KEY || process.env.OPENAI_API_KEY || '',
    model: process.env.EMBEDDINGS_MODEL || 'text-embedding-ada-002',
  },

  // Vector Database
  vectorDb: {
    mode: process.env.VECTOR_DB_MODE || 'supabase',
    chromaHost: process.env.CHROMA_HOST || 'localhost',
    chromaPort: parseInt(process.env.CHROMA_PORT || '8000', 10),
  },

  // Redis (for caching, sessions, job queue)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    enableCaching: process.env.REDIS_ENABLE_CACHING !== 'false',
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10), // 1 hour
    maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '100', 10),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
} as const;

export default config;
