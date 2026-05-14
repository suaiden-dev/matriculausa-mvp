import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceKey);

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  } as const;
  if (status === 204) return new Response(null, { status, headers });
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
}

// Desconto removido: códigos de afiliado não geram mais cupons Stripe.
// Esta função mantém apenas a validação de existência dos códigos no banco.
Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);

    const body = (await req.json().catch(() => ({}))) as { code?: string };

    if (body.code) {
      const normalized = body.code.trim().toUpperCase();
      const { data } = await supabase
        .from('affiliate_codes')
        .select('code, is_active')
        .eq('code', normalized)
        .maybeSingle();

      return corsResponse({ success: true, synced: data ? 1 : 0, exists: !!data });
    }

    const { data, error } = await supabase
      .from('affiliate_codes')
      .select('code, is_active')
      .eq('is_active', true);

    if (error) {
      console.error('[sync-affiliate-codes] DB error:', error);
      return corsResponse({ success: false, error: 'DB error' }, 500);
    }

    return corsResponse({ success: true, synced: (data ?? []).length });
  } catch (e) {
    console.error('[sync-affiliate-codes] Error:', e);
    return corsResponse({ success: false, error: 'Unexpected error' }, 500);
  }
});
