import React, { createContext, useContext, useState, useEffect } from 'react';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    documents: number;
    ai_questions: number;
    study_hours: number;
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

export interface UsageData {
  feature: string;
  allowed: boolean;
  current: number;
  limit: number;
}

interface SubscriptionContextType {
  // Subscription state
  currentSubscription: Subscription | null;
  effectivePlan: string;
  isFreeTier: boolean;

  // Available plans
  plans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;

  // Usage tracking
  usage: Record<string, UsageData>;
  refreshUsage: () => Promise<void>;

  // Actions
  subscribe: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  verifyStudent: (email: string) => Promise<boolean>;
  checkFeatureAccess: (feature: string) => Promise<boolean>;
  trackUsage: (feature: string, amount?: number) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [usage, setUsage] = useState<Record<string, UsageData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to make API calls
  const apiCall = async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`http://localhost:4000/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  // Load subscription data
  const loadSubscription = async () => {
    try {
      const data = await apiCall('/subscription/current');
      setCurrentSubscription(data.subscription);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    }
  };

  // Load available plans
  const loadPlans = async () => {
    try {
      const data = await apiCall('/subscription/plans');
      setPlans(data.plans);
    } catch (err) {
      console.error('Error loading plans:', err);
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    }
  };

  // Load usage data
  const refreshUsage = async () => {
    try {
      const data = await apiCall('/subscription/summary');
      if (data.usage) {
        setUsage(data.usage);
      }
    } catch (err) {
      console.error('Error loading usage:', err);
    }
  };

  // Subscribe to a plan
  const subscribe = async (planId: string) => {
    try {
      setLoading(true);
      await apiCall('/subscription/create', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      await loadSubscription();
      await refreshUsage();
    } catch (err) {
      console.error('Error subscribing:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    try {
      setLoading(true);
      await apiCall('/subscription/cancel', { method: 'POST' });
      await loadSubscription();
      await refreshUsage();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verify student status
  const verifyStudent = async (email: string): Promise<boolean> => {
    try {
      const data = await apiCall('/subscription/verify-student', {
        method: 'POST',
        body: JSON.stringify({ email, verificationMethod: 'edu_email' }),
      });
      return data.verified;
    } catch (err) {
      console.error('Error verifying student:', err);
      return false;
    }
  };

  // Check feature access
  const checkFeatureAccess = async (feature: string): Promise<boolean> => {
    try {
      const data = await apiCall(`/subscription/check-feature/${feature}`);
      return data.hasAccess;
    } catch (err) {
      console.error('Error checking feature access:', err);
      return false;
    }
  };

  // Track usage
  const trackUsage = async (feature: string, amount: number = 1) => {
    try {
      await apiCall('/subscription/track-usage', {
        method: 'POST',
        body: JSON.stringify({ feature, amount }),
      });
      await refreshUsage();
    } catch (err) {
      console.error('Error tracking usage:', err);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadSubscription(), loadPlans(), refreshUsage()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const effectivePlan = currentSubscription?.planId || 'free';
  const isFreeTier = effectivePlan === 'free';

  return (
    <SubscriptionContext.Provider
      value={{
        currentSubscription,
        effectivePlan,
        isFreeTier,
        plans,
        loading,
        error,
        usage,
        refreshUsage,
        subscribe,
        cancelSubscription,
        verifyStudent,
        checkFeatureAccess,
        trackUsage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export default SubscriptionContext;
