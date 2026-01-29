/**
 * Utility to convert private Supabase Storage URLs to n8n-accessible proxy URLs
 */

const N8N_STORAGE_SECRET = 'n8n_default_secret_2026'; // Should match the Edge Function
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fitpynguasqqutuhzifx.supabase.co';

export const getN8nProxyUrl = (originalUrl: string): string => {
  if (!originalUrl) return '';
  
  // Only proxy URLs that are from our Supabase Storage
  if (!originalUrl.includes(SUPABASE_URL) || !originalUrl.includes('/storage/v1/object/')) {
    return originalUrl;
  }

  // Build the proxy URL
  // Format: FUNCTIONS_URL/n8n-storage-access?url=ORIGINAL_URL&token=SECRET
  const proxyBaseUrl = `${SUPABASE_URL}/functions/v1/n8n-storage-access`;
  const urlWithToken = `${proxyBaseUrl}?url=${encodeURIComponent(originalUrl)}&token=${N8N_STORAGE_SECRET}`;
  
  return urlWithToken;
};
