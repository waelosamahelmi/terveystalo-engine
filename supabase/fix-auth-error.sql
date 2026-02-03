-- ============================================================================
-- NUCLEAR FIX: Auth "Database error granting user"
-- Run EACH SECTION SEPARATELY and check results
-- ============================================================================

-- =====================
-- SECTION A: DIAGNOSTICS (run this first, share results)
-- =====================

-- A1: ALL triggers on auth.users
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- A2: ALL triggers in the entire database that mention 'user'
SELECT trigger_schema, trigger_name, event_object_schema, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_name ILIKE '%user%' OR event_object_table = 'users';

-- A3: Check for any custom functions that might be called
SELECT routine_name, routine_schema
FROM information_schema.routines 
WHERE routine_name ILIKE '%user%' AND routine_schema = 'public';

-- A4: Check auth.users can be read
SELECT id, email, created_at FROM auth.users LIMIT 1;

-- =====================
-- SECTION B: NUCLEAR DROP (run this to remove ALL custom triggers)
-- =====================

-- Drop every possible trigger name
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS tr_check_user ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile ON auth.users;
DROP TRIGGER IF EXISTS sync_user ON auth.users;
DROP TRIGGER IF EXISTS user_created ON auth.users;
DROP TRIGGER IF EXISTS new_user ON auth.users;

-- Verify no triggers remain
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- =====================
-- SECTION C: CHECK PUBLIC.USERS TABLE
-- =====================

-- C1: Does the table exist?
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
);

-- C2: What are its constraints?
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass;

-- C3: Is RLS enabled?
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace;

-- =====================
-- SECTION D: DISABLE RLS ON USERS (might be blocking)
-- =====================

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Public read" ON public.users;
DROP POLICY IF EXISTS "Own update" ON public.users;
DROP POLICY IF EXISTS "Allow insert" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;

-- =====================
-- SECTION E: TRY LOGIN NOW
-- =====================
-- After running sections A-D, try logging in.
-- If it STILL fails, the issue might be in Supabase's auth hooks or edge functions.

-- =====================
-- SECTION F: CHECK AUTH CONFIG (if still failing)
-- =====================

-- Check if there are any auth hooks configured
SELECT * FROM auth.flow_state LIMIT 5;

-- Check auth schema for any custom objects
SELECT proname, prosrc 
FROM pg_proc 
WHERE pronamespace = 'auth'::regnamespace 
AND proname NOT IN ('uid', 'role', 'email', 'jwt');  -- exclude built-in
