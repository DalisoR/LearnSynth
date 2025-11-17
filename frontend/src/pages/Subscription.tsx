import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Crown,
  Calendar,
  CreditCard,
  FileText,
  Zap,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const Subscription = () => {
  const navigate = useNavigate();
  const {
    currentSubscription,
    effectivePlan,
    usage,
    loading,
    cancelSubscription
  } = useSubscription();

  const handleCancelSubscription = async () => {
    if (window.confirm('Are you sure you want to cancel your subscription? You will lose access at the end of the billing period.')) {
      try {
        await cancelSubscription();
        toast.success('Subscription will be canceled at the end of the billing period');
      } catch (error) {
        toast.error('Failed to cancel subscription');
      }
    }
  };

  const getPlanDisplayInfo = (planId: string) => {
    const plans: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
      free: { name: 'Free', color: 'bg-gray-100 text-gray-800', icon: <FileText className="w-5 h-5" /> },
      student: { name: 'Student', color: 'bg-blue-100 text-blue-800', icon: <Zap className="w-5 h-5" /> },
      pro: { name: 'Pro', color: 'bg-purple-100 text-purple-800', icon: <Crown className="w-5 h-5" /> },
      team: { name: 'Enterprise', color: 'bg-orange-100 text-orange-800', icon: <CreditCard className="w-5 h-5" /> }
    };
    return plans[planId] || plans.free;
  };

  const planInfo = getPlanDisplayInfo(effectivePlan);

  const getUsagePercentage = (feature: string) => {
    const data = usage[feature];
    if (!data || data.limit === -1) return 0;
    return (data.current / data.limit) * 100;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Subscription & Billing</h1>
        <p className="text-gray-600">Manage your subscription and view usage</p>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {planInfo.icon}
                Current Plan: {planInfo.name}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {effectivePlan === 'free'
                  ? 'You are on the free plan with basic features'
                  : 'Enjoying premium features'}
              </p>
            </div>
            <Badge className={planInfo.color}>
              {currentSubscription?.status || 'active'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {currentSubscription && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">Next Billing Date</div>
                  <div className="text-sm text-gray-600">
                    {formatDate(currentSubscription.currentPeriodEnd)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">Payment Method</div>
                  <div className="text-sm text-gray-600">•••• •••• •••• 4242</div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Button onClick={() => navigate('/pricing')}>
              {effectivePlan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
            </Button>
            {currentSubscription && (
              <Button variant="outline" onClick={handleCancelSubscription}>
                Cancel Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Monthly Usage</CardTitle>
          <p className="text-sm text-gray-600">
            Track your feature usage for this billing period
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(usage).map(([feature, data]) => {
              const percentage = getUsagePercentage(feature);
              const isNearLimit = percentage > 80;
              const isAtLimit = data.limit !== -1 && data.current >= data.limit;

              return (
                <div key={feature}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium capitalize">
                      {feature.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {data.limit === -1
                        ? `${data.current} used (unlimited)`
                        : `${data.current} / ${data.limit} used`}
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-2 ${isNearLimit ? 'bg-orange-100' : ''}`}
                  />
                  {isAtLimit && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>You've reached your limit</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium">Basic Learning Features</span>
              </div>
              <Badge variant="secondary">Included</Badge>
            </div>

            {effectivePlan === 'free' && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-600">
                    AI Teaching Assistant
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/pricing')}
                >
                  Upgrade
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {effectivePlan !== 'free' && (
              <>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">AI Teaching Assistant</span>
                  </div>
                  <Badge variant="secondary">Included</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Enhanced Lessons</span>
                  </div>
                  <Badge variant="secondary">Included</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Ad-Free Experience</span>
                  </div>
                  <Badge variant="secondary">Included</Badge>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;
