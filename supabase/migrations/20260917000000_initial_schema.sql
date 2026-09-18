-- =============================================================================
-- Base Framework Initial Schema Migration
-- Features: Auth, Account Profiles, Social (Follows), Realtime Notifications, Sessions
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ACCOUNTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  banner_url text,
  banner_position text DEFAULT 'center',
  bio text,
  is_private boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$')
);

CREATE INDEX IF NOT EXISTS idx_accounts_username ON public.accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_is_private ON public.accounts(is_private);

-- -----------------------------------------------------------------------------
-- 2. ACCOUNT EMAILS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_emails_account_id ON public.account_emails(account_id);
CREATE INDEX IF NOT EXISTS idx_account_emails_email ON public.account_emails(lower(email));

-- -----------------------------------------------------------------------------
-- 3. ACCOUNT FOLLOWS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_account_follows UNIQUE (follower_id, following_id),
  CONSTRAINT chk_no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_account_follows_follower ON public.account_follows(follower_id, status);
CREATE INDEX IF NOT EXISTS idx_account_follows_following ON public.account_follows(following_id, status);

-- -----------------------------------------------------------------------------
-- 4. AUTH SESSIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  session_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON public.auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_last_seen ON public.auth_sessions(last_seen_at DESC);

-- -----------------------------------------------------------------------------
-- 5. NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. TIMESTAMP AUTO-UPDATE TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_account_follows_updated_at ON public.account_follows;
CREATE TRIGGER trg_account_follows_updated_at
  BEFORE UPDATE ON public.account_follows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 7. NEW USER SIGNUP TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_username text;
  clean_username text;
BEGIN
  raw_username := COALESCE(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'user_name',
    split_part(new.email, '@', 1)
  );

  clean_username := lower(regexp_replace(raw_username, '[^a-zA-Z0-9_-]', '', 'g'));
  IF clean_username IS NULL OR length(clean_username) < 3 THEN
    clean_username := 'user_' || substr(new.id::text, 1, 8);
  END IF;

  IF EXISTS (SELECT 1 FROM public.accounts WHERE username = clean_username) THEN
    clean_username := clean_username || '_' || substr(new.id::text, 1, 4);
  END IF;

  INSERT INTO public.accounts (
    id,
    username,
    display_name,
    avatar_url,
    is_private
  ) VALUES (
    new.id,
    clean_username,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', clean_username),
    COALESCE(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', NULL),
    false
  )
  ON CONFLICT (id) DO NOTHING;

  IF new.email IS NOT NULL THEN
    INSERT INTO public.account_emails (
      id,
      account_id,
      email,
      is_primary,
      verified_at
    ) VALUES (
      new.id,
      new.id,
      new.email,
      true,
      new.email_confirmed_at
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 8. RPC FUNCTIONS
-- -----------------------------------------------------------------------------

-- 8.1 Touch Auth Session
CREATE OR REPLACE FUNCTION public.touch_auth_session(
  p_session_id text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auth_sessions (session_id, user_id, ip_address, user_agent, last_seen_at)
  VALUES (p_session_id, auth.uid(), p_ip_address, p_user_agent, now())
  ON CONFLICT (session_id) DO UPDATE
  SET last_seen_at = now(),
      ip_address = COALESCE(EXCLUDED.ip_address, public.auth_sessions.ip_address),
      user_agent = COALESCE(EXCLUDED.user_agent, public.auth_sessions.user_agent);
END;
$$;

-- 8.2 Revoke Single Auth Session
CREATE OR REPLACE FUNCTION public.revoke_auth_session(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.auth_sessions
  SET revoked_at = now()
  WHERE session_id = p_session_id AND user_id = auth.uid();
END;
$$;

-- 8.3 Revoke Other Auth Sessions
CREATE OR REPLACE FUNCTION public.revoke_other_auth_sessions(p_current_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.auth_sessions
  SET revoked_at = now()
  WHERE user_id = auth.uid() AND session_id != p_current_session_id AND revoked_at IS NULL;
END;
$$;

-- 8.4 Update Account Profile
CREATE OR REPLACE FUNCTION public.update_account(
  p_avatar_url text DEFAULT NULL,
  p_banner_url text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_is_private boolean DEFAULT NULL,
  p_username text DEFAULT NULL
)
RETURNS SETOF public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  UPDATE public.accounts
  SET
    avatar_url = COALESCE(p_avatar_url, accounts.avatar_url),
    banner_url = COALESCE(p_banner_url, accounts.banner_url),
    bio = COALESCE(p_bio, accounts.bio),
    display_name = COALESCE(p_display_name, accounts.display_name),
    is_private = COALESCE(p_is_private, accounts.is_private),
    username = COALESCE(p_username, accounts.username),
    updated_at = now()
  WHERE id = v_user_id
  RETURNING *;
END;
$$;

-- 8.5 Deactivate Current Account
CREATE OR REPLACE FUNCTION public.deactivate_current_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.accounts
  SET is_active = false, updated_at = now()
  WHERE id = auth.uid();
END;
$$;

-- 8.6 Reactivate Current Account
CREATE OR REPLACE FUNCTION public.reactivate_current_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.accounts
  SET is_active = true, updated_at = now()
  WHERE id = auth.uid();
END;
$$;

-- 8.7 Get Follow Target Info
CREATE OR REPLACE FUNCTION public.get_account_follow_target(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  is_private boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, is_private
  FROM public.accounts
  WHERE id = p_user_id
  LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 9.1 ACCOUNTS POLICIES
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.accounts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own account"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own account"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 9.2 ACCOUNT EMAILS POLICIES
CREATE POLICY "Users can view their own emails"
  ON public.account_emails FOR SELECT
  USING (auth.uid() = account_id);

CREATE POLICY "Users can update their own emails"
  ON public.account_emails FOR UPDATE
  USING (auth.uid() = account_id);

-- 9.3 ACCOUNT FOLLOWS POLICIES
CREATE POLICY "Accepted follows are public"
  ON public.account_follows FOR SELECT
  USING (status = 'accepted' OR auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can create follow requests"
  ON public.account_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update follows involving them"
  ON public.account_follows FOR UPDATE
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can delete follows involving them"
  ON public.account_follows FOR DELETE
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- 9.4 AUTH SESSIONS POLICIES
CREATE POLICY "Users can view their own sessions"
  ON public.auth_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
  ON public.auth_sessions FOR ALL
  USING (auth.uid() = user_id);

-- 9.5 NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.uid() = actor_id);

-- -----------------------------------------------------------------------------
-- 10. REALTIME PUBLICATION
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.account_follows;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
