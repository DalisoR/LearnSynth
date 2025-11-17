import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription, SubscriptionPlan } from '@/contexts/SubscriptionContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Star, Zap, Crown, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const Pricing = () => {
  const navigate = useNavigate();
  const { plans, subscribe, loading, currentSubscription, verifyStudent } = useSubscription();
  const { formatPrice } = useCurrency();
  const [isYearly, setIsYearly] = useState(false);
  const [verifyingStudent, setVerifyingStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [isVerifiedStudent, setIsVerifiedStudent] = useState(false);

  const handleSubscribe = async (planId: string) => {
    try {
      await subscribe(planId);
      toast.success('Subscription activated successfully!');
      navigate('/');
    } catch (error) {
      toast.error('Failed to activate subscription. Please try again.');
    }
  };

  const handleStudentVerification = async () => {
    if (!studentEmail) {
      toast.error('Please enter your student email');
      return;
    }

    setVerifyingStudent(true);
    const verified = await verifyStudent(studentEmail);
    setVerifyingStudent(false);

    if (verified) {
      setIsVerifiedStudent(true);
      toast.success('Student verification successful! You qualify for 50% discount.');
    } else {
      toast.error('Could not verify student status. Please check your email.');
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    // Check if plan has localized pricing from API
    if ((plan as any).localizedPrice) {
      const localized = (plan as any).localizedPrice;
      const interval = isYearly && plan.id !== 'free' ? 'year' : 'month';
      return {
        price: interval === 'year' ? localized.yearly : localized.monthly,
        interval,
        isLocalized: true
      };
    }

    // Fallback to client-side conversion
    let usdPrice = plan.price / 100;
    let interval = 'month';

    if (isYearly && plan.id !== 'free') {
      usdPrice = usdPrice * 10;
      interval = 'year';
    }

    const discountedPrice = isVerifiedStudent ? usdPrice * 0.5 : usdPrice;

    return {
      price: formatPrice(discountedPrice),
      interval,
      isLocalized: false
    };
  };

  const getDiscountedPrice = (price: number) => {
    return isVerifiedStudent ? Math.round(price * 0.5) : price;
  };

  const getPriceDisplay = (plan: SubscriptionPlan) => {
    const { price, interval, isLocalized } = getPrice(plan);

    if (plan.id === 'free') {
      return { main: '$0', interval: '/month', monthly: null };
    }

    if (isLocalized) {
      // Price is already a formatted string from API
      return { main: price, interval: `/${interval}`, monthly: null };
    } else {
      // Price is formatted string from local context
      return { main: price, interval: `/${interval}`, monthly: null };
    }
  };

  const getIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Star className="w-6 h-6" />;
      case 'student':
        return <Zap className="w-6 h-6" />;
      case 'pro':
        return <Crown className="w-6 h-6" />;
      case 'team':
        return <Building2 className="w-6 h-6" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'student':
        return 'bg-blue-100 text-blue-800';
      case 'pro':
        return 'bg-purple-100 text-purple-800';
      case 'team':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Learning Path</h1>
        <p className="text-xl text-gray-600 mb-8">
          Unlock the power of AI-enhanced learning
        </p>

        {/* Yearly/Monthly Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={`font-medium ${!isYearly ? 'text-blue-600' : 'text-gray-500'}`}>
            Monthly
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <span className={`font-medium ${isYearly ? 'text-blue-600' : 'text-gray-500'}`}>
            Yearly
          </span>
          {isYearly && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Save 17%
            </Badge>
          )}
        </div>

        {/* Student Verification */}
        {!isVerifiedStudent && (
          <Card className="max-w-md mx-auto mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Student Discount</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Get 50% off with your .edu email
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your.email@edu"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button
                  onClick={handleStudentVerification}
                  disabled={verifyingStudent}
                  size="sm"
                >
                  {verifyingStudent ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const { price, interval } = getPrice(plan);
          const isCurrentPlan = currentSubscription?.planId === plan.id;
          const priceDisplay = getPriceDisplay(plan);

          return (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular ? 'border-2 border-blue-500 shadow-lg scale-105' : ''
              } ${isCurrentPlan ? 'bg-blue-50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  <div className={`p-3 rounded-full ${getPlanColor(plan.id)}`}>
                    {getIcon(plan.id)}
                  </div>
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
              </CardHeader>

              <CardContent>
                <div className="text-center mb-6">
                  {plan.id === 'free' ? (
                    <div className="text-4xl font-bold">{priceDisplay.main}</div>
                  ) : (
                    <div>
                      <span className="text-4xl font-bold">
                        {priceDisplay.main}
                      </span>
                      <span className="text-gray-600">{priceDisplay.interval}</span>
                    </div>
                  )}
                  {isYearly && plan.id !== 'free' && (
                    <p className="text-sm text-green-600 mt-1">
                      Billed annually • Save 17%
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.id === 'free' ? 'outline' : 'default'}
                  disabled={loading || isCurrentPlan}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isCurrentPlan
                    ? 'Current Plan'
                    : plan.id === 'free'
                    ? 'Get Started Free'
                    : 'Upgrade Now'}
                </Button>

                {plan.id !== 'free' && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Cancel anytime • No commitment
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I change my plan later?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                We accept all major credit cards, PayPal, and other secure payment methods.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Is there a free trial?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Yes! Our free tier lets you experience the platform with 2 documents and 5 AI questions monthly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How does student discount work?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Verify with your .edu email to get 50% off Student and Pro plans. Discount applies to first year.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
