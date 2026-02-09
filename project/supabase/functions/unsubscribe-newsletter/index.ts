import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Decodifica token de unsubscribe
 * Formato: base64 URL-safe (user_id:timestamp)
 */
function decodeUnsubscribeToken(token: string): { user_id: string; timestamp: number } | null {
  try {
    // Decodificar URL encoding primeiro
    const decodedToken = decodeURIComponent(token);
    
    // Restaurar caracteres base64 (URL-safe usa - e _ em vez de + e /)
    let restored = decodedToken.replace(/-/g, '+').replace(/_/g, '/');
    
    // Adicionar padding se necessário (base64 precisa de múltiplos de 4)
    const paddingNeeded = (4 - (restored.length % 4)) % 4;
    if (paddingNeeded > 0) {
      restored = restored + '='.repeat(paddingNeeded);
    }
    
    // Decodificar base64
    const decoded = atob(restored);
    const [user_id, timestamp] = decoded.split(':');
    
    if (!user_id || !timestamp) {
      return null;
    }

    return {
      user_id,
      timestamp: parseInt(timestamp, 10)
    };
  } catch (error) {
    console.error('[Unsubscribe] Erro ao decodificar token:', error);
    return null;
  }
}

/**
 * Verifica se token é válido (não expirado - 30 dias)
 */
function isTokenValid(tokenData: { user_id: string; timestamp: number }): boolean {
  const tokenAge = Date.now() - tokenData.timestamp;
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias em milissegundos
  
  return tokenAge < maxAge;
}

/**
 * Processa unsubscribe de um usuário
 */
async function processUnsubscribe(userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
  try {
    // Verificar se usuário existe
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return {
        success: false,
        message: 'Usuário não encontrado'
      };
    }

    // Atualizar ou criar preferências
    const { error: updateError } = await supabase
      .from('newsletter_user_preferences')
      .upsert({
        user_id: userId,
        email_opt_out: true,
        opt_out_reason: reason || null,
        opt_out_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('[Unsubscribe] Erro ao atualizar preferências:', updateError);
      return {
        success: false,
        message: 'Erro ao processar cancelamento de inscrição'
      };
    }

    return {
      success: true,
      message: 'Você foi removido da lista de newsletter com sucesso'
    };
  } catch (error) {
    console.error('[Unsubscribe] Erro ao processar unsubscribe:', error);
    return {
      success: false,
      message: 'Erro interno ao processar cancelamento'
    };
  }
}

/**
 * Verifica status de unsubscribe de um usuário
 */
async function checkUnsubscribeStatus(userId: string): Promise<{ is_opted_out: boolean; opt_out_at?: string }> {
  const { data: preferences } = await supabase
    .from('newsletter_user_preferences')
    .select('email_opt_out, opt_out_at')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    is_opted_out: preferences?.email_opt_out || false,
    opt_out_at: preferences?.opt_out_at || undefined
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const userId = url.searchParams.get('user_id');

    // Se for GET, mostrar página de confirmação ou status
    if (req.method === 'GET') {
      if (!token && !userId) {
        return new Response(
          JSON.stringify({ error: 'Token ou user_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let targetUserId: string | null = null;

      // Se tem token, decodificar
      if (token) {
        const tokenData = decodeUnsubscribeToken(token);
        if (!tokenData || !isTokenValid(tokenData)) {
          return new Response(
            JSON.stringify({ error: 'Token inválido ou expirado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        targetUserId = tokenData.user_id;
      } else if (userId) {
        targetUserId = userId;
      }

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: 'Não foi possível identificar o usuário' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar status atual
      const status = await checkUnsubscribeStatus(targetUserId);

      return new Response(
        JSON.stringify({
          user_id: targetUserId,
          is_opted_out: status.is_opted_out,
          opt_out_at: status.opt_out_at,
          message: status.is_opted_out 
            ? 'Você já está removido da lista de newsletter'
            : 'Você ainda está inscrito na newsletter'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se for POST, processar unsubscribe
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { token, user_id, reason } = body;

      if (!token && !user_id) {
        return new Response(
          JSON.stringify({ error: 'Token ou user_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let targetUserId: string | null = null;

      // Se tem token, decodificar
      if (token) {
        const tokenData = decodeUnsubscribeToken(token);
        if (!tokenData || !isTokenValid(tokenData)) {
          return new Response(
            JSON.stringify({ error: 'Token inválido ou expirado' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        targetUserId = tokenData.user_id;
      } else if (user_id) {
        targetUserId = user_id;
      }

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: 'Não foi possível identificar o usuário' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Processar unsubscribe
      const result = await processUnsubscribe(targetUserId, reason);

      return new Response(
        JSON.stringify(result),
        { 
          status: result.success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Unsubscribe] Erro crítico:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}, { verify_jwt: false });

