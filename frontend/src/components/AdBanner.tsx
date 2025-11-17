import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, GraduationCap, BookOpen, Trophy } from 'lucide-react';

interface AdBannerProps {
  type?: 'textbook' | 'course' | 'study_tool' | 'tip' | 'upgrade';
  subject?: string;
  className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ type = 'tip', subject, className = '' }) => {
  const navigate = useNavigate();
  const { isFreeTier } = useSubscription();

  // Don't show ads to paid users
  if (!isFreeTier) return null;

  const getAdContent = () => {
    switch (type) {
      case 'textbook':
        return {
          title: `Official ${subject || 'Course'} Textbook`,
          description: 'Get the official textbook with 15% student discount',
          icon: <BookOpen className="w-5 h-5" />,
          cta: 'Shop Now',
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-700'
        };

      case 'course':
        return {
          title: `Continue Learning with ${subject || 'Related'} Courses`,
          description: 'Expand your knowledge with these popular courses',
          icon: <GraduationCap className="w-5 h-5" />,
          cta: 'Browse Courses',
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-700'
        };

      case 'study_tool':
        return {
          title: 'Boost Your Learning',
          description: 'Enhance your study sessions with these tools',
          icon: <Trophy className="w-5 h-5" />,
          cta: 'Explore Tools',
          bgColor: 'bg-purple-50 border-purple-200',
          textColor: 'text-purple-700'
        };

      case 'upgrade':
        return {
          title: 'Unlock Unlimited Learning',
          description: 'Remove limits and access all premium features',
          icon: <ExternalLink className="w-5 h-5" />,
          cta: 'Upgrade Now',
          bgColor: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
          textColor: 'text-white',
          onClick: () => navigate('/pricing')
        };

      case 'tip':
      default:
        return {
          title: 'Study Tip of the Day',
          description: `Try the Pomodoro Technique: 25 min study, 5 min break`,
          icon: <Trophy className="w-5 h-5" />,
          cta: 'Try It',
          bgColor: 'bg-amber-50 border-amber-200',
          textColor: 'text-amber-700'
        };
    }
  };

  const ad = getAdContent();

  return (
    <div
      className={`rounded-lg border p-4 ${ad.bgColor} ${className}`}
      onClick={ad.onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-1 ${ad.textColor}`}>
          {ad.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${ad.textColor}`}>
              {ad.cta === 'Upgrade Now' ? 'Upgrade' : 'Sponsored'}
            </span>
          </div>
          <h4 className={`font-semibold text-sm ${ad.textColor}`}>
            {ad.title}
          </h4>
          <p className={`text-xs mt-1 ${ad.textColor} opacity-80`}>
            {ad.description}
          </p>
          {ad.cta !== 'Try It' && ad.cta !== 'Shop Now' && ad.cta !== 'Browse Courses' && (
            <Badge
              variant="secondary"
              className={`mt-2 text-xs ${ad.textColor} ${
                ad.cta === 'Upgrade Now'
                  ? 'bg-white text-blue-600 hover:bg-gray-100'
                  : 'bg-white/80'
              }`}
            >
              {ad.cta}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdBanner;

// Contextual banner that auto-selects based on current page
export const ContextualAdBanner: React.FC<{ subject?: string }> = ({ subject }) => {
  // In a real implementation, this would determine the best ad based on current context
  const adTypes: AdBannerProps['type'][] = ['tip', 'upgrade', 'study_tool'];
  const randomType = adTypes[Math.floor(Math.random() * adTypes.length)];

  return <AdBanner type={randomType} subject={subject} />;
};
