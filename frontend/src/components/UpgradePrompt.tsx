import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Crown, Lock, Zap } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  message?: string;
  compact?: boolean;
  inline?: boolean;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  message,
  compact = false,
  inline = false
}) => {
  const navigate = useNavigate();
  const { isFreeTier } = useSubscription();

  if (!isFreeTier) return null;

  const getFeatureName = (feat: string) => {
    const names: Record<string, string> = {
      ai_questions: 'AI Questions',
      enhanced_lessons: 'Enhanced Lessons',
      flashcards: 'Flashcards',
      practice_problems: 'Practice Problems',
      mind_maps: 'Mind Maps',
      analytics: 'Advanced Analytics',
      certificates: 'Certificates',
      study_planner: 'Study Planner'
    };
    return names[feat] || feat;
  };

  const defaultMessage = `Unlock ${getFeatureName(feature).toLowerCase()} with a premium plan.`;

  if (inline) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Lock className="w-4 h-4" />
        <span>{message || defaultMessage}</span>
        <Button
          size="sm"
          variant="link"
          className="p-0 h-auto text-blue-600"
          onClick={() => navigate('/pricing')}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">
              {message || `Upgrade to unlock ${getFeatureName(feature)}`}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/pricing')}
          >
            Upgrade
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-blue-100 rounded-full">
          <Crown className="w-8 h-8 text-blue-600" />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">
        {message || `Unlock ${getFeatureName(feature)}`}
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        Get unlimited access with our premium plans starting at just $9.99/month.
      </p>

      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={() => navigate('/pricing')}
        >
          <Zap className="w-4 h-4 mr-2" />
          Upgrade Now
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
        >
          Continue with Free Plan
        </Button>
      </div>
    </div>
  );
};

export default UpgradePrompt;
