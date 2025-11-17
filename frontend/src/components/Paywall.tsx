import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap } from 'lucide-react';

interface PaywallProps {
  feature: string;
  currentUsage?: { current: number; limit: number };
  title?: string;
  description?: string;
}

const Paywall: React.FC<PaywallProps> = ({
  feature,
  currentUsage,
  title,
  description
}) => {
  const navigate = useNavigate();
  const { subscribe } = useSubscription();

  const getFeatureDisplayName = (feat: string) => {
    const names: Record<string, string> = {
      documents: 'Document Upload',
      ai_questions: 'AI Questions',
      certificates: 'Certificates',
      study_hours: 'Study Hours'
    };
    return names[feat] || feat;
  };

  const getPaywallMessage = () => {
    if (currentUsage && currentUsage.limit > 0) {
      const remaining = Math.max(0, currentUsage.limit - currentUsage.current);
      if (remaining === 0) {
        return `You've reached your limit of ${currentUsage.limit} ${getFeatureDisplayName(feature)} this month.`;
      }
      return `You have ${remaining} ${getFeatureDisplayName(feature).toLowerCase()} remaining this month.`;
    }
    return `Unlock unlimited ${getFeatureDisplayName(feature).toLowerCase()} with a premium plan.`;
  };

  return (
    <Card className="border-2 border-dashed border-blue-300 bg-blue-50/50">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-100 rounded-full">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-2xl">
          {title || 'Premium Feature'}
        </CardTitle>
        <p className="text-gray-600 mt-2">
          {description || getPaywallMessage()}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Feature Preview */}
        <div className="bg-white rounded-lg p-4 border">
          <h4 className="font-semibold mb-2">What you'll get:</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              Unlimited access to {getFeatureDisplayName(feature).toLowerCase()}
            </li>
            <li className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              AI-powered learning features
            </li>
            <li className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              Ad-free experience
            </li>
            <li className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              Priority support
            </li>
          </ul>
        </div>

        {/* Pricing Options */}
        <div className="space-y-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 cursor-pointer hover:shadow-lg transition"
            onClick={() => navigate('/pricing')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">Student Plan</div>
                <div className="text-sm opacity-90">Perfect for individual learners</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">$9.99</div>
                <div className="text-xs opacity-90">/month</div>
              </div>
            </div>
          </div>

          <div
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg p-4 cursor-pointer hover:shadow-lg transition border-2 border-purple-300"
            onClick={() => navigate('/pricing')}
          >
            <div className="flex items-center justify-between">
              <div>
                <Badge className="bg-yellow-400 text-yellow-900 mb-1">Most Popular</Badge>
                <div className="font-bold text-lg">Pro Plan</div>
                <div className="text-sm opacity-90">For serious students</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">$19.99</div>
                <div className="text-xs opacity-90">/month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => navigate('/pricing')}
          >
            View All Plans
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            Maybe Later
          </Button>
        </div>

        {/* Trust Indicators */}
        <p className="text-xs text-gray-500 text-center">
          ✓ Cancel anytime • ✓ 30-day money-back guarantee • ✓ Secure checkout
        </p>
      </CardContent>
    </Card>
  );
};

export default Paywall;
