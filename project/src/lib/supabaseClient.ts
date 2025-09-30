import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Instância única do cliente Supabase para evitar múltiplas instâncias GoTrueClient
const supabaseUrl = config.getSupabaseUrl();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configurações para evitar múltiplas instâncias
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  }
});

// Função para obter instância única do Supabase
export const getSupabaseClient = () => {
  return supabase;
};

// Função para limpar instâncias duplicadas (se necessário)
export const clearSupabaseInstances = () => {
  // Limpar instâncias antigas do localStorage se existirem
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('supabase') && key !== 'supabase.auth.token') {
      localStorage.removeItem(key);
    }
  });
};
