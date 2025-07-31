import { createClient } from '@supabase/supabase-js';
import { config } from './config';

const supabaseUrl = config.getSupabaseUrl();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);