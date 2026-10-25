import { createClient } from '@supabase/supabase-js';
import { neonAdapter, NEON_DATABASE_URL, neonSql } from './neonClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use Neon Serverless PostgreSQL as the primary database engine when configured
const useNeon = Boolean(NEON_DATABASE_URL && NEON_DATABASE_URL.startsWith('postgresql://'));

export const supabase = useNeon
    ? neonAdapter
    : createClient(
          supabaseUrl || 'https://placeholder-acs-dw.supabase.co',
          supabaseAnonKey || 'public-anon-placeholder-key'
      );

export { neonSql, NEON_DATABASE_URL, useNeon };
