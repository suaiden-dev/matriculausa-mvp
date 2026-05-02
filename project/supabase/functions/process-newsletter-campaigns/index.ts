import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from './constants.ts';
import { processCampaign } from './campaign-processor.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method Not Allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { campaign_key, ignore_rate_limit } = body;
    const ignoreRateLimit = ignore_rate_limit === true;

    console.log('[Newsletter] Iniciando processamento de campanhas');

    let query = supabase
      .from('newsletter_campaigns')
      .select('id, campaign_key, name, email_subject_template, email_body_template, cooldown_days, send_once, trigger_conditions')
      .eq('is_active', true);

    if (campaign_key) {
      query = query.eq('campaign_key', campaign_key);
    }

    const { data: campaigns, error: campaignsError } = await query;

    if (campaignsError || !campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active campaigns found', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Record<string, { sent: number; failed: number }> = {};
    for (const campaign of campaigns) {
      results[campaign.campaign_key] = await processCampaign(supabase, campaign, ignoreRateLimit);
    }

    const totalSent = Object.values(results).reduce((sum, r) => sum + r.sent, 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);

    return new Response(
      JSON.stringify({
        message: 'Campaigns processed successfully',
        results,
        total: { sent: totalSent, failed: totalFailed }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Newsletter] Erro crítico:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
