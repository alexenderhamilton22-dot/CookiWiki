import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
