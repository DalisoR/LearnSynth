-- Subscription and Monetization Database Schema
-- Creates tables for subscription management, billing, and feature usage tracking

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- Stores user subscription information and billing details
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL, -- 'free', 'student', 'pro', 'team'
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FEATURE_USAGE TABLE
-- Tracks monthly usage of limited features (AI questions, documents, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature VARCHAR(50) NOT NULL, -- 'documents', 'ai_questions', 'certificates', 'study_hours'
  used INTEGER NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL, -- Date when usage resets (first day of next month)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature, reset_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature);
CREATE INDEX IF NOT EXISTS idx_feature_usage_reset ON feature_usage(reset_date);

-- RLS Policies
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feature usage"
  ON feature_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature usage"
  ON feature_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature usage"
  ON feature_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SUBSCRIPTION_PLANS TABLE
-- Master table of available subscription plans (reference data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- price in cents
  price_yearly INTEGER, -- price in cents (annual discount)
  features JSONB NOT NULL,
  limits JSONB NOT NULL, -- { documents: 2, ai_questions: 10, ... }
  popular BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits, popular, active) VALUES
(
  'free',
  'Free',
  'Get started with basic learning features',
  0,
  0,
  '[
    "Upload up to 2 documents",
    "Basic chapter navigation",
    "Simple quizzes",
    "Standard progress tracking",
    "Community access"
  ]'::jsonb,
  '{
    "documents": 2,
    "ai_questions": 5,
    "study_hours": 5,
    "certificates": 0,
    "knowledge_bases": 3,
    "saved_lessons": 5
  }'::jsonb,
  false,
  true
),
(
  'student',
  'Student',
  'Perfect for individual learners',
  999, -- $9.99
  9990, -- $99.99 (17% discount)
  '[
    "Upload unlimited documents",
    "AI Teaching Assistant (unlimited questions)",
    "Enhanced lessons with 4 teaching styles",
    "Text-to-Speech for all lessons",
    "Spaced repetition flashcards",
    "Study planner with Pomodoro timer",
    "Practice problems (AI-generated)",
    "Mind map generation",
    "Comprehensive analytics",
    "All achievements and certificates",
    "Ad-free experience",
    "Priority support"
  ]'::jsonb,
  '{
    "documents": -1,
    "ai_questions": -1,
    "study_hours": -1,
    "certificates": 10,
    "knowledge_bases": 10,
    "saved_lessons": -1
  }'::jsonb,
  true,
  true
),
(
  'pro',
  'Pro',
  'For serious students and professionals',
  1999, -- $19.99
  19990, -- $199.99 (17% discount)
  '[
    "Everything in Student",
    "Unlimited knowledge bases",
    "Advanced AI models (GPT-4 priority)",
    "Group collaboration (up to 5 groups)",
    "Video lecture integration",
    "Advanced analytics dashboard",
    "Custom learning paths",
    "Weakness detection",
    "Performance predictions",
    "API access",
    "Whiteboard mode",
    "Advanced search",
    "Voice input",
    "Custom themes"
  ]'::jsonb,
  '{
    "documents": -1,
    "ai_questions": -1,
    "study_hours": -1,
    "certificates": -1,
    "knowledge_bases": -1,
    "saved_lessons": -1
  }'::jsonb,
  false,
  true
),
(
  'team',
  'Enterprise',
  'For educational institutions and teams',
  4999, -- $49.99 per seat
  49990, -- $499.99 per seat (17% discount)
  '[
    "Everything in Pro",
    "Unlimited groups",
    "Instructor dashboard",
    "Bulk user management",
    "SSO integration",
    "White-label solution",
    "Custom knowledge bases",
    "Advanced reporting",
    "LMS integration",
    "Dedicated account manager",
    "SLA guarantee"
  ]'::jsonb,
  '{
    "documents": -1,
    "ai_questions": -1,
    "study_hours": -1,
    "certificates": -1,
    "knowledge_bases": -1,
    "saved_lessons": -1
  }'::jsonb,
  false,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  popular = EXCLUDED.popular,
  active = EXCLUDED.active;

-- ============================================================================
-- PAYMENT_HISTORY TABLE
-- Track all payment transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255),
  amount INTEGER NOT NULL, -- amount in cents
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL,
  invoice_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(subscription_id);

-- RLS Policies
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment history"
  ON payment_history FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- COUPONS TABLE
-- Manage discount codes and promotional offers
-- ============================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL, -- percentage (0-100) or amount in cents
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  applicable_plans TEXT[], -- array of plan IDs this coupon applies to
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STUDENT_VERIFICATION TABLE
-- Track verified student status for discounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  verification_method VARCHAR(50) NOT NULL, -- 'edu_email', 'student_id', etc.
  verified BOOLEAN DEFAULT FALSE,
  verification_data JSONB, -- stores verification evidence
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_verification_user ON student_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_student_verification_email ON student_verification(email);

-- RLS Policies
ALTER TABLE student_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification"
  ON student_verification FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification"
  ON student_verification FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ADVERTISEMENTS TABLE (For Free Tier)
-- Manage contextual ads for free users
-- ============================================================================
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  click_url VARCHAR(500) NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cpm INTEGER DEFAULT 800, -- cost per 1000 impressions in cents
  target_subjects TEXT[], -- subjects this ad is relevant to
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(active);
CREATE INDEX IF NOT EXISTS idx_advertisements_subjects ON advertisements USING GIN(target_subjects);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_usage_updated_at
  BEFORE UPDATE ON feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user has access to a feature
CREATE OR REPLACE FUNCTION check_feature_limit(
  p_user_id UUID,
  p_feature VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_plan RECORD;
  v_limit INTEGER;
  v_used INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Get user's active subscription
  SELECT s.*, sp.limits, sp.features
  INTO v_subscription
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- If no subscription, use free plan
  IF NOT FOUND THEN
    SELECT * INTO v_plan FROM subscription_plans WHERE id = 'free';
  ELSE
    v_plan := v_subscription;
  END IF;

  -- Get limit for this feature
  v_limit := (v_plan.limits->>p_feature)::INTEGER;

  -- Get current usage
  SELECT COALESCE(SUM(used), 0) INTO v_used
  FROM feature_usage
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND reset_date >= CURRENT_DATE;

  -- Check if allowed
  IF v_limit = -1 THEN
    -- Unlimited
    v_used := COALESCE((
      SELECT COUNT(*)
      FROM (
        SELECT 1
        FROM documents
        WHERE user_id = p_user_id
        LIMIT 1
      ) t
    ), 0);
    v_allowed := TRUE;
  ELSIF v_limit = 0 THEN
    -- Feature not available in this tier
    v_allowed := FALSE;
  ELSE
    -- Limited feature
    v_allowed := v_used < v_limit;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'used', v_used,
    'limit', v_limit,
    'plan', v_plan.id,
    'plan_name', v_plan.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_feature_limit(UUID, VARCHAR) TO authenticated;

-- Create view for user subscription summary
CREATE OR REPLACE VIEW user_subscription_summary AS
SELECT
  u.id as user_id,
  u.email,
  s.id as subscription_id,
  s.plan_id,
  sp.name as plan_name,
  s.status,
  sp.price_monthly,
  sp.features,
  sp.limits,
  s.current_period_end,
  s.cancel_at_period_end,
  CASE
    WHEN s.id IS NULL THEN 'free'
    ELSE s.plan_id
  END as effective_plan,
  CASE
    WHEN s.id IS NULL THEN sp_free.name
    ELSE sp.name
  END as effective_plan_name
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
LEFT JOIN subscription_plans sp_free ON sp_free.id = 'free';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'Stores user subscription information and billing details';
COMMENT ON TABLE feature_usage IS 'Tracks monthly usage of limited features like AI questions and documents';
COMMENT ON TABLE subscription_plans IS 'Reference table of available subscription plans and their features';
COMMENT ON TABLE payment_history IS 'History of all payment transactions';
COMMENT ON TABLE coupons IS 'Discount codes and promotional offers';
COMMENT ON TABLE student_verification IS 'Verified student status for educational discounts';
COMMENT ON TABLE advertisements IS 'Contextual advertisements shown to free tier users';

COMMENT ON FUNCTION check_feature_limit IS 'Checks if a user has access to a feature based on their subscription and current usage';
