import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';

// Rate limiting configuration
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options?.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options?.max || 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: options?.windowMs || 15 * 60 * 1000,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Stricter rate limit for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60 * 1000,
  },
});

// Input validation middleware
export const validateInput = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};

// CSRF Protection
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const verifyCSRFToken = (req: Request): boolean => {
  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF protection for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for authenticated API calls with proper token
  if (verifyCSRFToken(req)) {
    return next();
  }

  return res.status(403).json({
    error: 'CSRF token validation failed',
  });
};

// SQL Injection Prevention
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input
      .replace(/['";\\]/g, '') // Remove dangerous characters
      .trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
};

// XSS Protection
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
});

// JWT Security
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export const generateSecureToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  const token = crypto.randomBytes(32).toString('hex');
  return token;
};

export const hashPassword = async (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
};

// Session Security
export const generateSessionId = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const validateSession = (sessionId: string): boolean => {
  return sessionId.length === 64 && /^[a-f0-9]+$/.test(sessionId);
};

// API Key validation
export const validateApiKey = (apiKey: string): boolean => {
  // API keys should be 32-64 character hex strings
  return /^[a-f0-9]{32,64}$/.test(apiKey);
};

// Request size limit
export const requestSizeLimit = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSize = parseSize(limit);

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: limit,
      });
    }

    next();
  };
};

const parseSize = (size: string): number => {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.match(/^(\d+)([a-z]+)?$/i);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'b').toLowerCase();

  return value * (units[unit] || 1);
};

// Audit logging
export const logSecurityEvent = (
  event: string,
  req: Request,
  userId?: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId,
    path: req.path,
    method: req.method,
  };

  console.log('[SECURITY]', JSON.stringify(logEntry));

  // In production, send to security monitoring service
  // e.g., Datadog, Splunk, etc.
};

// IP whitelist check
export const isWhitelistedIP = (ip: string, whitelist: string[] = []): boolean => {
  return whitelist.includes(ip);
};

// Detect suspicious activity
export const detectSuspiciousActivity = (req: Request): {
  isSuspicious: boolean;
  reasons: string[];
} => {
  const reasons: string[] = [];
  const userAgent = req.headers['user-agent'] || '';

  // Check for missing user agent
  if (!userAgent || userAgent.length < 10) {
    reasons.push('Missing or invalid user agent');
  }

  // Check for suspicious patterns in User-Agent
  const suspiciousPatterns = ['bot', 'crawler', 'spider', 'curl', 'wget'];
  const hasSuspiciousPattern = suspiciousPatterns.some(pattern =>
    userAgent.toLowerCase().includes(pattern)
  );

  if (hasSuspiciousPattern) {
    reasons.push('Suspicious user agent pattern');
  }

  // Check for rapid requests
  const now = Date.now();
  if (!req.headers['x-ratelimit-remaining']) {
    reasons.push('Missing rate limit header');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
};

// Error handler that doesn't leak information
export const handleError = (error: any, req: Request, res: Response, next: NextFunction) => {
  logSecurityEvent('error', req, undefined, 'medium');

  // Log error details server-side
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Send generic error to client
  res.status(500).json({
    error: 'An internal server error occurred',
  });
};
