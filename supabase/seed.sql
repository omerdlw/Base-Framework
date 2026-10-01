
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  confirmed_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  is_anonymous
) VALUES
  (
    'a1111111-1111-4111-a111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alex@baseframework.dev',
    NULL,
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"username": "alex_creator", "full_name": "Alex Rivers", "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80"}'::jsonb,
    false,
    now() - interval '30 days',
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    now(),
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
  ),
  (
    'a2222222-2222-4222-a222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sarah@baseframework.dev',
    NULL,
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now() - interval '1 hour',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"username": "sarah_dev", "full_name": "Sarah Chen", "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80"}'::jsonb,
    false,
    now() - interval '25 days',
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    now(),
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
  ),
  (
    'a3333333-3333-4333-a333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'elena@baseframework.dev',
    NULL,
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now() - interval '3 hours',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"username": "elena_design", "full_name": "Elena Rostova", "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80"}'::jsonb,
    false,
    now() - interval '20 days',
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    now(),
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
  ),
  (
    'a4444444-4444-4444-a444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'marcus@baseframework.dev',
    NULL,
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now() - interval '1 day',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"username": "marcus_mobile", "full_name": "Marcus Vance", "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80"}'::jsonb,
    false,
    now() - interval '15 days',
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    now(),
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
  ),
  (
    'a5555555-5555-4555-a555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@baseframework.dev',
    NULL,
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now() - interval '2 days',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"username": "test_user", "full_name": "Base QA Tester", "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&auto=format&fit=crop&q=80"}'::jsonb,
    false,
    now() - interval '10 days',
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    now(),
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    'a1111111-1111-4111-a111-111111111111',
    'a1111111-1111-4111-a111-111111111111',
    format('{"sub":"%s","email":"%s"}', 'a1111111-1111-4111-a111-111111111111', 'alex@baseframework.dev')::jsonb,
    'email',
    'a1111111-1111-4111-a111-111111111111',
    now(),
    now(),
    now()
  ),
  (
    'a2222222-2222-4222-a222-222222222222',
    'a2222222-2222-4222-a222-222222222222',
    format('{"sub":"%s","email":"%s"}', 'a2222222-2222-4222-a222-222222222222', 'sarah@baseframework.dev')::jsonb,
    'email',
    'a2222222-2222-4222-a222-222222222222',
    now(),
    now(),
    now()
  ),
  (
    'a3333333-3333-4333-a333-333333333333',
    'a3333333-3333-4333-a333-333333333333',
    format('{"sub":"%s","email":"%s"}', 'a3333333-3333-4333-a333-333333333333', 'elena@baseframework.dev')::jsonb,
    'email',
    'a3333333-3333-4333-a333-333333333333',
    now(),
    now(),
    now()
  ),
  (
    'a4444444-4444-4444-a444-444444444444',
    'a4444444-4444-4444-a444-444444444444',
    format('{"sub":"%s","email":"%s"}', 'a4444444-4444-4444-a444-444444444444', 'marcus@baseframework.dev')::jsonb,
    'email',
    'a4444444-4444-4444-a444-444444444444',
    now(),
    now(),
    now()
  ),
  (
    'a5555555-5555-4555-a555-555555555555',
    'a5555555-5555-4555-a555-555555555555',
    format('{"sub":"%s","email":"%s"}', 'a5555555-5555-4555-a555-555555555555', 'test@baseframework.dev')::jsonb,
    'email',
    'a5555555-5555-4555-a555-555555555555',
    now(),
    now(),
    now()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

INSERT INTO public.accounts (
  id,
  username,
  display_name,
  avatar_url,
  banner_url,
  banner_position,
  bio,
  is_private,
  is_active,
  created_at,
  updated_at
) VALUES
  (
    'a1111111-1111-4111-a111-111111111111',
    'alex_creator',
    'Alex Rivers',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    'center',
    'Full-stack architect & design engineer building Base Framework. Obsessed with high-performance UI, OKLCH color spaces, and distributed systems.',
    false,
    true,
    now() - interval '30 days',
    now()
  ),
  (
    'a2222222-2222-4222-a222-222222222222',
    'sarah_dev',
    'Sarah Chen',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80',
    'center',
    'Core infrastructure & backend engineer. Distributed state, Supabase SSR, Cloudflare Workers, and zero-latency caching.',
    false,
    true,
    now() - interval '25 days',
    now()
  ),
  (
    'a3333333-3333-4333-a333-333333333333',
    'elena_design',
    'Elena Rostova',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&auto=format&fit=crop&q=80',
    'center',
    'Design Systems & Micro-Interactions lead. Apple human interface design enthusiast, fluid spring physics, and typography craftsman.',
    true, -- Private account for testing follow approval flows
    true,
    now() - interval '20 days',
    now()
  ),
  (
    'a4444444-4444-4444-a444-444444444444',
    'marcus_mobile',
    'Marcus Vance',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    'center',
    'Mobile web engineer & PWA specialist. Gesture-driven docks, tactile feedback, and hardware-accelerated layouts.',
    false,
    true,
    now() - interval '15 days',
    now()
  ),
  (
    'a5555555-5555-4555-a555-555555555555',
    'test_user',
    'Base QA Tester',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
    'center',
    'Standard testing account for automated end-to-end integration tests, dock interaction verification, and smoke tests.',
    false,
    true,
    now() - interval '10 days',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  banner_url = EXCLUDED.banner_url,
  banner_position = EXCLUDED.banner_position,
  bio = EXCLUDED.bio,
  is_private = EXCLUDED.is_private,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.account_emails (
  id,
  account_id,
  email,
  is_primary,
  verified_at,
  created_at
) VALUES
  ('b1111111-1111-4111-b111-111111111111', 'a1111111-1111-4111-a111-111111111111', 'alex@baseframework.dev', true, now(), now() - interval '30 days'),
  ('b1111111-1111-4111-b111-111111111112', 'a1111111-1111-4111-a111-111111111111', 'alex.rivers@pm.me', false, now(), now() - interval '28 days'),
  ('b2222222-2222-4222-b222-222222222222', 'a2222222-2222-4222-a222-222222222222', 'sarah@baseframework.dev', true, now(), now() - interval '25 days'),
  ('b3333333-3333-4333-b333-333333333333', 'a3333333-3333-4333-a333-333333333333', 'elena@baseframework.dev', true, now(), now() - interval '20 days'),
  ('b4444444-4444-4444-b444-444444444444', 'a4444444-4444-4444-a444-444444444444', 'marcus@baseframework.dev', true, now(), now() - interval '15 days'),
  ('b5555555-5555-4555-b555-555555555555', 'a5555555-5555-4555-a555-555555555555', 'test@baseframework.dev', true, now(), now() - interval '10 days')
ON CONFLICT (email) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  verified_at = EXCLUDED.verified_at;

INSERT INTO public.account_follows (
  id,
  follower_id,
  following_id,
  status,
  created_at,
  updated_at
) VALUES
  (
    'c1111111-1111-4111-c111-111111111111',
    'a2222222-2222-4222-a222-222222222222',
    'a1111111-1111-4111-a111-111111111111',
    'accepted',
    now() - interval '14 days',
    now() - interval '14 days'
  ),
  (
    'c2222222-2222-4222-c222-222222222222',
    'a4444444-4444-4444-a444-444444444444',
    'a1111111-1111-4111-a111-111111111111',
    'accepted',
    now() - interval '10 days',
    now() - interval '10 days'
  ),
  (
    'c3333333-3333-4333-c333-333333333333',
    'a1111111-1111-4111-a111-111111111111',
    'a2222222-2222-4222-a222-222222222222',
    'accepted',
    now() - interval '8 days',
    now() - interval '8 days'
  ),
  (
    'c4444444-4444-4444-c444-444444444444',
    'a4444444-4444-4444-a444-444444444444',
    'a3333333-3333-4333-a333-333333333333',
    'accepted',
    now() - interval '6 days',
    now() - interval '5 days'
  ),
  (
    'c5555555-5555-4555-c555-555555555555',
    'a1111111-1111-4111-a111-111111111111',
    'a3333333-3333-4333-a333-333333333333',
    'pending',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    'c6666666-6666-4666-c666-666666666666',
    'a5555555-5555-4555-a555-555555555555',
    'a3333333-3333-4333-a333-333333333333',
    'pending',
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    'c7777777-7777-4777-c777-777777777777',
    'a5555555-5555-4555-a555-555555555555',
    'a1111111-1111-4111-a111-111111111111',
    'accepted',
    now() - interval '12 hours',
    now() - interval '12 hours'
  )
ON CONFLICT (follower_id, following_id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO public.notifications (
  id,
  user_id,
  actor_id,
  type,
  payload,
  read,
  read_at,
  created_at
) VALUES
  (
    'd1111111-1111-4111-d111-111111111111',
    'a3333333-3333-4333-a333-333333333333',
    'a1111111-1111-4111-a111-111111111111',
    'FOLLOW_REQUEST',
    '{
      "title": "Follow Request",
      "message": "Alex Rivers requested to follow you",
      "href": "/account/alex_creator",
      "actor": {
        "id": "a1111111-1111-4111-a111-111111111111",
        "username": "alex_creator",
        "displayName": "Alex Rivers",
        "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80"
      }
    }'::jsonb,
    false,
    NULL,
    now() - interval '2 days'
  ),
  (
    'd2222222-2222-4222-d222-222222222222',
    'a3333333-3333-4333-a333-333333333333',
    'a5555555-5555-4555-a555-555555555555',
    'FOLLOW_REQUEST',
    '{
      "title": "Follow Request",
      "message": "Base QA Tester requested to follow you",
      "href": "/account/test_user",
      "actor": {
        "id": "a5555555-5555-4555-a555-555555555555",
        "username": "test_user",
        "displayName": "Base QA Tester",
        "avatarUrl": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&auto=format&fit=crop&q=80"
      }
    }'::jsonb,
    false,
    NULL,
    now() - interval '1 day'
  ),
  (
    'd3333333-3333-4333-d333-333333333333',
    'a1111111-1111-4111-a111-111111111111',
    'a2222222-2222-4222-a222-222222222222',
    'MENTION',
    '{
      "title": "Architecture Boundaries",
      "message": "Sarah Chen mentioned you in Architecture Boundaries",
      "href": "/docs/architecture",
      "actor": {
        "id": "a2222222-2222-4222-a222-222222222222",
        "username": "sarah_dev",
        "displayName": "Sarah Chen",
        "avatarUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80"
      },
      "subject": {
        "title": "Architecture Boundaries",
        "href": "/docs/architecture"
      }
    }'::jsonb,
    false,
    NULL,
    now() - interval '5 hours'
  ),
  (
    'd4444444-4444-4444-d444-444444444444',
    'a1111111-1111-4111-a111-111111111111',
    'a4444444-4444-4444-a444-444444444444',
    'NEW_FOLLOWER',
    '{
      "title": "New Follower",
      "message": "Marcus Vance started following you",
      "href": "/account/marcus_mobile",
      "actor": {
        "id": "a4444444-4444-4444-a444-444444444444",
        "username": "marcus_mobile",
        "displayName": "Marcus Vance",
        "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80"
      }
    }'::jsonb,
    true,
    now() - interval '9 days',
    now() - interval '10 days'
  ),
  (
    'd5555555-5555-4555-d555-555555555555',
    'a1111111-1111-4111-a111-111111111111',
    'a2222222-2222-4222-a222-222222222222',
    'FOLLOW_ACCEPTED',
    '{
      "title": "Follow Accepted",
      "message": "Sarah Chen accepted your follow request",
      "href": "/account/sarah_dev",
      "actor": {
        "id": "a2222222-2222-4222-a222-222222222222",
        "username": "sarah_dev",
        "displayName": "Sarah Chen",
        "avatarUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80"
      }
    }'::jsonb,
    true,
    now() - interval '7 days',
    now() - interval '8 days'
  ),
  (
    'd6666666-6666-4666-d666-666666666666',
    'a1111111-1111-4111-a111-111111111111',
    NULL,
    'SYSTEM_ANNOUNCEMENT',
    '{
      "title": "Welcome to Base Framework",
      "message": "Base Framework v0.1.0 is initialized with local seed data, AST knowledge graph, and architecture validation.",
      "href": "/docs"
    }'::jsonb,
    false,
    NULL,
    now() - interval '3 hours'
  ),
  (
    'd7777777-7777-4777-d777-777777777777',
    'a2222222-2222-4222-a222-222222222222',
    'a1111111-1111-4111-a111-111111111111',
    'NEW_FOLLOWER',
    '{
      "title": "New Follower",
      "message": "Alex Rivers started following you",
      "href": "/account/alex_creator",
      "actor": {
        "id": "a1111111-1111-4111-a111-111111111111",
        "username": "alex_creator",
        "displayName": "Alex Rivers",
        "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80"
      }
    }'::jsonb,
    false,
    NULL,
    now() - interval '8 days'
  )
ON CONFLICT (id) DO UPDATE SET
  read = EXCLUDED.read,
  read_at = EXCLUDED.read_at,
  payload = EXCLUDED.payload;

INSERT INTO public.auth_sessions (
  session_id,
  user_id,
  user_agent,
  ip_address,
  created_at,
  last_seen_at,
  revoked_at
) VALUES
  (
    'sess_alex_desktop_01',
    'a1111111-1111-4111-a111-111111111111',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    '127.0.0.1',
    now() - interval '7 days',
    now(),
    NULL
  ),
  (
    'sess_alex_mobile_02',
    'a1111111-1111-4111-a111-111111111111',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    '192.168.1.42',
    now() - interval '3 days',
    now() - interval '4 hours',
    NULL
  ),
  (
    'sess_sarah_desktop_01',
    'a2222222-2222-4222-a222-222222222222',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    '127.0.0.1',
    now() - interval '5 days',
    now() - interval '15 minutes',
    NULL
  )
ON CONFLICT (session_id) DO UPDATE SET
  last_seen_at = EXCLUDED.last_seen_at,
  user_agent = EXCLUDED.user_agent,
  ip_address = EXCLUDED.ip_address;

COMMIT;
