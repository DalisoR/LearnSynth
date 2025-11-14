/**
 * Subscription Service
 * Manages user subscriptions, billing, and premium features
 */

import { supabase } from '../supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // monthly price in cents
  interval: 'month' | 'year';
  features: string[];
  limits: {
    documents: number;
    aiQuestions: number;
    studyHours: number;
    certificates: number;
  };
  popular?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export class SubscriptionService {
  private plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Get started with basic learning features',
      price: 0,
      interval: 'month',
      features: [
        'Upload up to 2 documents',
        'Basic chapter navigation',
        'Simple quizzes',
        'Standard progress tracking'
      ],
      limits: {
        documents: 2,
        aiQuestions: 10,
        studyHours: 5,
        certificates: 0
      }
    },
    {
      id: 'student',
      name: 'Student',
      description: 'Perfect for individual learners',
      price: 999, // $9.99
      interval: 'month',
      features: [
        'Upload up to 10 documents',
        'AI Teaching Assistant (unlimited questions)',
        'Embedded contextual quizzes',
        'Personalized analytics',
        'Learning streak tracking',
        'Achievement badges',
        'Progress certificates'
      ],
      limits: {
        documents: 10,
        aiQuestions: -1, // unlimited
        studyHours: 50,
        certificates: 10
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For serious students and professionals',
      price: 1999, // $19.99
      interval: 'month',
      popular: true,
      features: [
        'Unlimited documents',
        'AI Teaching Assistant (priority)',
        'Advanced learning analytics',
        'Personalized study plans',
        'Weak area identification',
        'Performance predictions',
        'Custom learning paths',
        'Priority support',
        'Export certificates'
      ],
      limits: {
        documents: -1, // unlimited
        aiQuestions: -1,
        studyHours: -1,
        certificates: -1
      }
    },
    {
      id: 'team',
      name: 'Team',
      description: 'For educational institutions and teams',
      price: 4999, // $49.99
      interval: 'month',
      features: [
        'Everything in Pro',
        'Team management',
        'Group analytics dashboard',
        'Instructor tools',
        'Custom branding',
        'API access',
        'Dedicated support',
        'Bulk certificate generation'
      ],
      limits: {
        documents: -1,
        aiQuestions: -1,
        studyHours: -1,
        certificates: -1
      }
    }
  ];

  /**
   * Get all subscription plans
   */
  getPlans(): SubscriptionPlan[] {
    return this.plans;
  }

  /**
   * Get plan by ID
   */
  getPlan(planId: string): SubscriptionPlan | undefined {
    return this.plans.find(p => p.id === planId);
  }

  /**
   * Create or update subscription
   */
  async createSubscription(
    userId: string,
    planId: string,
    stripeCustomerId?: string
  ): Promise<Subscription> {
    const plan = this.getPlan(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const now = new Date();
    const endDate = plan.interval === 'month'
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const subscription: Subscription = {
      id: `sub-${Date.now()}-${userId}`,
      userId,
      planId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: endDate,
      cancelAtPeriodEnd: false,
      stripeCustomerId
    };

    await supabase
      .from('subscriptions')
      .insert({
        id: subscription.id,
        user_id: userId,
        plan_id: planId,
        status: subscription.status,
        current_period_start: subscription.currentPeriodStart,
        current_period_end: subscription.currentPeriodEnd,
        cancel_at_period_end: false,
        stripe_customer_id: stripeCustomerId
      });

    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: true
      })
      .eq('user_id', userId)
      .eq('status', 'active');
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('current_period_start', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      status: data.status,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      cancelAtPeriodEnd: data.cancel_at_period_end,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id
    };
  }

  /**
   * Check if user has access to a feature
   */
  async hasFeatureAccess(userId: string, feature: keyof SubscriptionPlan['limits']): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      // Free tier
      const freePlan = this.getPlan('free');
      return freePlan?.limits[feature] !== 0;
    }

    const plan = this.getPlan(subscription.planId);
    if (!plan) return false;

    const limit = plan.limits[feature];
    return limit === -1; // -1 means unlimited
  }

  /**
   * Get feature usage for a user
   */
  async getFeatureUsage(userId: string, feature: string): Promise<number> {
    switch (feature) {
      case 'documents':
        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        return docCount || 0;

      case 'aiQuestions':
        const { count: questionCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id, role', 'user');
        return questionCount || 0;

      case 'certificates':
        const { count: certCount } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id, userId');
        return certCount || 0;

      default:
        return 0;
    }
  }

  /**
   * Check if user has reached feature limit
   */
  async checkLimit(userId: string, feature: keyof SubscriptionPlan['limits']): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
  }> {
    const subscription = await this.getUserSubscription(userId);
    const plan = subscription ? this.getPlan(subscription.planId) : this.getPlan('free');

    if (!plan) {
      return { allowed: false, current: 0, limit: 0 };
    }

    const limit = plan.limits[feature];
    if (limit === -1) {
      // Unlimited
      const current = await this.getFeatureUsage(userId, feature);
      return { allowed: true, current, limit: -1 };
    }

    const current = await this.getFeatureUsage(userId, feature);
    return {
      allowed: current < limit,
      current,
      limit
    };
  }

  /**
   * Track feature usage
   */
  async trackUsage(userId: string, feature: string, amount: number = 1): Promise<void> {
    const { data } = await supabase
      .from('feature_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('feature', feature)
      .gte('reset_date', new Date().toISOString().split('T')[0])
      .single();

    if (data) {
      await supabase
        .from('feature_usage')
        .update({
          used: data.used + amount
        })
        .eq('id', data.id);
    } else {
      await supabase
        .from('feature_usage')
        .insert({
          user_id: userId,
          feature,
          used: amount,
          reset_date: this.getNextResetDate()
        });
    }
  }

  /**
   * Get next billing date
   */
  getNextResetDate(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  }
}

export const subscriptionService = new SubscriptionService();
