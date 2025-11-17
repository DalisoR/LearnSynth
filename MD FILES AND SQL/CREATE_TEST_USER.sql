-- ============================================================
-- Create Test User for Demo
-- This creates the mock user that the frontend uses
-- ============================================================

-- Insert mock user (if not exists)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  'mock-user-id',
  'demo@learnsynth.com',
  '$2a$10$example.encrypted.password.hash',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo User"}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Verify the user was created
SELECT id, email FROM auth.users WHERE id = 'mock-user-id';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
