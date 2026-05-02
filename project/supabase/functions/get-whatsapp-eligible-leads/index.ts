import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';
import {
  corsHeaders,
  COOLDOWN_DAYS,
  MIN_HOURS_SINCE_REGISTRATION,
  MAX_LEADS,
  TEST_MODE,
  TEST_PHONE,
} from './constants.ts';

declare const Deno: any;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[WhatsApp] Iniciando busca de leads elegíveis');

    // 1. Busca leads: student, sem pagamento, com telefone preenchido
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, phone')
      .eq('role', 'student')
      .eq('has_paid_selection_process_fee', false)
      .not('phone', 'is', null)
      .neq('phone', '')
      .limit(MAX_LEADS * 3);

    if (profilesError || !profiles) {
      console.error('[WhatsApp] Erro ao buscar profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar leads', details: profilesError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WhatsApp] ${profiles.length} candidatos encontrados com telefone`);

    // 2. Busca datas de criação dos usuários no auth
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authMap = new Map(authData?.users.map((u: any) => [u.id, u.created_at]) ?? []);

    // 3. Filtra quem cadastrou há pelo menos MIN_HOURS_SINCE_REGISTRATION horas
    const minHoursMs = MIN_HOURS_SINCE_REGISTRATION * 60 * 60 * 1000;
    const now = Date.now();

    const agedProfiles = profiles.filter((p: any) => {
      const createdAt = authMap.get(p.user_id);
      if (!createdAt) return false;
      const msSinceCreation = now - new Date(createdAt).getTime();
      return TEST_MODE || msSinceCreation >= minHoursMs;
    });

    console.log(`[WhatsApp] ${agedProfiles.length} leads passaram do filtro de tempo mínimo`);

    // 4. Exclui quem já recebeu WhatsApp dentro do cooldown
    const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    const cooldownCutoff = new Date(now - cooldownMs).toISOString();

    const userIds = agedProfiles.map((p: any) => p.user_id);
    const { data: recentSent } = await supabase
      .from('whatsapp_sent_messages')
      .select('user_id')
      .in('user_id', userIds)
      .gte('sent_at', cooldownCutoff);

    const alreadySentSet = new Set(recentSent?.map((r: any) => r.user_id) ?? []);

    const eligibleLeads = agedProfiles
      .filter((p: any) => !alreadySentSet.has(p.user_id))
      .slice(0, MAX_LEADS);

    console.log(`[WhatsApp] ${alreadySentSet.size} leads já receberam WhatsApp no cooldown de ${COOLDOWN_DAYS}d`);
    console.log(`[WhatsApp] ${eligibleLeads.length} leads elegíveis para envio`);

    // 5. Em modo de teste, retorna apenas o número de teste
    if (TEST_MODE) {
      const filtered = eligibleLeads.filter((p: any) => p.phone === TEST_PHONE);
      console.log(`[WhatsApp] 🧪 MODO DE TESTE: retornando apenas phone=${TEST_PHONE} (${filtered.length} leads)`);
      return new Response(
        JSON.stringify({ leads: filtered.map(formatLead), total: filtered.length, test_mode: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        leads: eligibleLeads.map(formatLead),
        total: eligibleLeads.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[WhatsApp] Erro crítico:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatLead(p: any) {
  return {
    user_id: p.user_id,
    full_name: p.full_name || 'Lead',
    phone: p.phone,
  };
}
