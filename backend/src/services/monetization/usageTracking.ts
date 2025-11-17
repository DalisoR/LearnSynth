/**
 * Usage Tracking Middleware
 * Automatically tracks and enforces feature limits based on subscription tier
 */

import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from './subscriptionService';

interface UsageTrackingOptions {
  feature: 'documents' | 'ai_questions' | 'certificates' | 'study_hours';
  increment?: number;
  strict?: boolean; // If true, return 402 Payment Required instead of allowing
}

/**
 * Middleware to track and enforce usage limits
 */
export function trackUsage(options: UsageTrackingOptions) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

      // Check current usage
      const limitCheck = await subscriptionService.checkLimit(userId, options.feature);

      // Add usage info to request object for use in route handlers
      req.usage = req.usage || {};
      req.usage[options.feature] = limitCheck;

      // If strict mode and limit exceeded, return paywall
      if (options.strict && !limitCheck.allowed) {
        return res.status(402).json({
          error: 'Payment Required',
          message: getLimitExceededMessage(options.feature, limitCheck),
          code: 'LIMIT_EXCEEDED',
          feature: options.feature,
          usage: limitCheck,
          upgradeUrl: '/pricing'
        });
      }

      // Track the usage (for non-strict mode, track after successful operation)
      if (!options.strict) {
        await subscriptionService.trackUsage(userId, options.feature, options.increment || 1);
      }

      next();
    } catch (error) {
      console.error('Usage tracking error:', error);
      next(); // Continue on error to avoid breaking the app
    }
  };
}

/**
 * Middleware to check if user has access before allowing an action
 */
export function requireFeatureAccess(feature: UsageTrackingOptions['feature']) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';

      const hasAccess = await subscriptionService.hasFeatureAccess(userId, feature);

      if (!hasAccess) {
        const limitCheck = await subscriptionService.checkLimit(userId, feature);

        return res.status(402).json({
          error: 'Payment Required',
          message: getLimitExceededMessage(feature, limitCheck),
          code: 'FEATURE_LOCKED',
          feature,
          usage: limitCheck,
          upgradeUrl: '/pricing'
        });
      }

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      next();
    }
  };
}

/**
 * Helper to get user-friendly message when limit is exceeded
 */
function getLimitExceededMessage(
  feature: string,
  usage: { current: number; limit: number }
): string {
  switch (feature) {
    case 'documents':
      return `You've reached your limit of ${usage.limit} documents. Upgrade to upload more textbooks.`;

    case 'ai_questions':
      return `You've used all ${usage.limit} AI questions this month. Upgrade for unlimited questions.`;

    case 'certificates':
      return `You've reached your limit of ${usage.limit} certificates. Upgrade to generate more.`;

    case 'study_hours':
      return `You've reached your monthly limit of ${usage.limit} study hours.`;

    default:
      return 'You have reached your usage limit for this feature.';
  }
}

/**
 * Wrapper for route handlers that need to track usage after success
 */
export function withUsageTracking(
  handler: Function,
  options: UsageTrackingOptions
) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // Execute the handler
      const result = await handler(req, res, next);

      // If we get here without a response, track usage
      if (!res.headersSent) {
        const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';
        await subscriptionService.trackUsage(userId, options.feature, options.increment || 1);
      }

      return result;
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Middleware to add usage info to response headers (for transparency)
 */
export function addUsageHeaders(feature: UsageTrackingOptions['feature']) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const limitCheck = await subscriptionService.checkLimit(userId, feature);

      // Add custom headers
      res.set({
        'X-Usage-Current': limitCheck.current.toString(),
        'X-Usage-Limit': limitCheck.limit.toString(),
        'X-Usage-Remaining': limitCheck.limit === -1
          ? '-1'
          : Math.max(0, limitCheck.limit - limitCheck.current).toString()
      });

      next();
    } catch (error) {
      next();
    }
  };
}

export default {
  trackUsage,
  requireFeatureAccess,
  withUsageTracking,
  addUsageHeaders
};
