import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing required Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'suun-terveystalo-auth',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'suun-terveystalo'
    }
  },
  db: {
    schema: 'public'
  }
});

// No automatic session initialization or auth listeners here
// Auth is handled entirely by authContext.tsx