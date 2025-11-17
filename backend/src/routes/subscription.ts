/**
 * Subscription Routes
 * API endpoints for subscription management, billing, and feature access
 */

import { Router } from 'express';
import { subscriptionService } from '../services/monetization/subscriptionService';
import { currencyService } from '../services/monetization/currencyService';
import { supabase } from '../services/supabase';

const router = Router();

// Mock auth middleware for development
const mockAuth = async (req: any, res: any, next: any) => {
  // In development, use mock user
  req.user = { id: '00000000-0000-0000-0000-000000000000' };
  next();
};

// Currency detection middleware
const detectCurrency = async (req: any, res: any, next: any) => {
  try {
    const countryCode = req.headers['x-country-code'] as string;
    const ip = req.ip;
    req.currency = await currencyService.detectUserCurrency(ip, countryCode);
    next();
  } catch (error) {
    console.error('Currency detection error:', error);
    // Fallback to USD
    req.currency = {
      country: 'US',
      currency: 'USD',
      symbol: '$',
      rate: 1
    };
    next();
  }
};

// Apply middleware
router.use(mockAuth);
router.use(detectCurrency);

/**
 * GET /api/subscription/plans
 * Get all available subscription plans with localized pricing
 */
router.get('/plans', async (req: any, res) => {
  try {
    const plans = subscriptionService.getPlans();
    const userCurrency = req.currency;

    // Add localized pricing to each plan
    const localizedPlans = plans.map((plan: any) => ({
      ...plan,
      localizedPrice: {
        monthly: currencyService.formatPrice(plan.price / 100, userCurrency.currency),
        yearly: plan.price > 0
          ? currencyService.formatPrice((plan.price * 10) / 100, userCurrency.currency)
          : '$0'
      },
      currency: {
        code: userCurrency.currency,
        symbol: userCurrency.symbol,
        rate: userCurrency.rate
      }
    }));

    res.json({
      success: true,
      plans: localizedPlans,
      userCurrency
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscription/current
 * Get user's current subscription
 */
router.get('/current', async (req: any, res) => {
  try {
    const { userId } = req.user;
    const subscription = await subscriptionService.getUserSubscription(userId);

    res.json({
      success: true,
      subscription
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/create
 * Create a new subscription (Stripe integration placeholder)
 */
router.post('/create', async (req: any, res) => {
  try {
    const { userId } = req.user;
    const { planId, paymentMethodId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    // In production, integrate with Stripe here
    // For now, just create the subscription directly
    const subscription = await subscriptionService.createSubscription(
      userId,
      planId
    );

    res.json({
      success: true,
      subscription,
      message: 'Subscription created successfully'
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel user's subscription
 */
router.post('/cancel', async (req: any, res) => {
  try {
    const { userId } = req.user;

    await subscriptionService.cancelSubscription(userId);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period'
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscription/usage/:feature
 * Get usage for a specific feature
 */
router.get('/usage/:feature', async (req: any, res) => {
  try {
    const { userId } = req.user;
    const { feature } = req.params;

    const limitCheck = await subscriptionService.checkLimit(userId, feature as any);

    res.json({
      success: true,
      feature,
      usage: limitCheck
    });
  } catch (error: any) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/track-usage
 * Track usage of a feature
 */
router.post('/track-usage', async (req: any, res) => {
  try {
    const { userId } = req.user;
    const { feature, amount } = req.body;

    if (!feature) {
      return res.status(400).json({ error: 'feature is required' });
    }

    await subscriptionService.trackUsage(userId, feature, amount || 1);

    res.json({
      success: true,
      message: 'Usage tracked successfully'
    });
  } catch (error: any) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscription/check-feature/:feature
 * Check if user has access to a feature
 */
router.get('/check-feature/:feature', async (req: any, res) => {
  try {
    const { userId } = req.user;
    const { feature } = req.params;

    const hasAccess = await subscriptionService.hasFeatureAccess(userId, feature as any);

    res.json({
      success: true,
      feature,
      hasAccess
    });
  } catch (error: any) {
    console.error('Error checking feature access:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/verify-student
 * Verify student status for discounts
 */
router.post('/verify-student', async (req: any, res) => {
  try {
    const { userId } = req.user;
    const { email, verificationMethod } = req.body;

    if (!email || !verificationMethod) {
      return res.status(400).json({ error: 'email and verificationMethod are required' });
    }

    // Check if email is a valid .edu email
    const isEduEmail = email.endsWith('.edu') ||
                       email.endsWith('.ac.uk') ||
                       email.endsWith('.edu.au') ||
                       email.includes('university') ||
                       email.includes('college');

    const verified = isEduEmail;

    await supabase
      .from('student_verification')
      .upsert({
        user_id: userId,
        email,
        verification_method: verificationMethod,
        verified,
        verification_data: { is_edu_email: isEduEmail },
        verified_at: verified ? new Date().toISOString() : null
      });

    res.json({
      success: true,
      verified,
      message: verified
        ? 'Student status verified successfully'
        : 'Email does not appear to be a valid student email'
    });
  } catch (error: any) {
    console.error('Error verifying student status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscription/summary
 * Get comprehensive subscription summary for user
 */
router.get('/summary', async (req: any, res) => {
  try {
    const { userId } = req.user;

    // Get subscription and plan info
    const subscription = await subscriptionService.getUserSubscription(userId);
    const effectivePlan = subscription ? subscription.planId : 'free';

    // Get current usage for each feature
    const features = ['documents', 'ai_questions', 'certificates', 'study_hours'];
    const usage: any = {};

    for (const feature of features) {
      usage[feature] = await subscriptionService.checkLimit(userId, feature as any);
    }

    res.json({
      success: true,
      subscription: {
        plan: effectivePlan,
        status: subscription?.status || 'active',
        currentPeriodEnd: subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd
      },
      usage,
      isFreeTier: effectivePlan === 'free'
    });
  } catch (error: any) {
    console.error('Error fetching subscription summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
