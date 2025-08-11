import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;

console.log('[process-registration-coupon] 🔧 CONFIGURAÇÃO INICIAL');
console.log('[process-registration-coupon] SUPABASE_URL:', Deno.env.get('SUPABASE_URL')?.substring(0, 20) + '...');
console.log('[process-registration-coupon] SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 20) + '...');
console.log('[process-registration-coupon] STRIPE_SECRET_KEY:', stripeSecret?.substring(0, 20) + '...');

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

Deno.serve(async (req) => {
  console.log('[process-registration-coupon] 🚀 FUNÇÃO INICIADA');
  console.log('[process-registration-coupon] Método:', req.method);
  console.log('[process-registration-coupon] URL:', req.url);
  
  try {
    if (req.method === 'OPTIONS') {
      console.log('[process-registration-coupon] 📋 Respondendo OPTIONS');
      return corsResponse(null, 204);
    }

    console.log('[process-registration-coupon] 📥 Processando requisição POST');
    const { user_id, affiliate_code } = await req.json();
    
    console.log('[process-registration-coupon] 📊 Dados recebidos:');
    console.log('[process-registration-coupon] - user_id:', user_id);
    console.log('[process-registration-coupon] - affiliate_code:', affiliate_code);
    
    // Durante o registro, o usuário pode não ter sessão ainda
    // Vamos aceitar a chamada se user_id for fornecido
    let authenticatedUser = null;
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        authenticatedUser = user;
        console.log('[process-registration-coupon] ✅ Usuário autenticado:', user.id);
      }
    }

    // Se não há usuário autenticado, verificar se user_id foi fornecido
    if (!authenticatedUser && !user_id) {
      console.log('[process-registration-coupon] ❌ Nenhum usuário autenticado ou user_id fornecido');
      console.log('[process-registration-coupon] Debug - authenticatedUser:', authenticatedUser);
      console.log('[process-registration-coupon] Debug - user_id:', user_id);
      // Durante desenvolvimento, aceitar sem autenticação se user_id for fornecido
      console.log('[process-registration-coupon] ⚠️ Modo desenvolvimento - aceitando sem autenticação');
    }

    // Usar user_id fornecido ou do usuário autenticado
    const targetUserId = user_id || authenticatedUser?.id;
    
    if (!targetUserId) {
      console.log('[process-registration-coupon] ❌ Nenhum user_id válido encontrado');
      console.log('[process-registration-coupon] Debug - targetUserId:', targetUserId);
      return corsResponse({ error: 'No valid user_id found' }, 400);
    }

    console.log('[process-registration-coupon] 🎯 PROCESSANDO CUPOM DE REGISTRO');
    console.log('[process-registration-coupon] User ID:', targetUserId);
    console.log('[process-registration-coupon] Affiliate Code:', affiliate_code);

    if (!affiliate_code) {
      console.log('[process-registration-coupon] ⚠️ Nenhum código de afiliado fornecido');
      return corsResponse({ 
        success: false, 
        message: 'Nenhum código de afiliado fornecido' 
      }, 200);
    }

    // Validar código de afiliado
    console.log('[process-registration-coupon] 🔍 Validando código de afiliado...');
    console.log('[process-registration-coupon] Código a validar:', affiliate_code);
    
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliate_codes')
      .select('*')
      .eq('code', affiliate_code)
      .eq('is_active', true)
      .single();

    console.log('[process-registration-coupon] Resultado da validação:');
    console.log('[process-registration-coupon] - affiliateData:', affiliateData);
    console.log('[process-registration-coupon] - affiliateError:', affiliateError);

    if (affiliateError || !affiliateData) {
      console.log('[process-registration-coupon] ❌ Código de afiliado inválido:', affiliate_code);
      console.log('[process-registration-coupon] Erro detalhado:', affiliateError);
      return corsResponse({ 
        success: false, 
        error: 'Código de afiliado inválido' 
      }, 400);
    }

    console.log('[process-registration-coupon] ✅ Código de afiliado válido encontrado');
    console.log('[process-registration-coupon] Referrer ID:', affiliateData.user_id);

    // Verificar se o usuário já usou um código de referência
    const { data: existingUsage, error: usageError } = await supabase
      .from('used_referral_codes')
      .select('id')
      .eq('user_id', targetUserId)
      .limit(1);

    if (usageError) {
      console.error('[process-registration-coupon] ❌ Erro ao verificar uso:', usageError);
      return corsResponse({ 
        success: false, 
        error: 'Erro ao verificar uso de código de referência' 
      }, 500);
    }

    if (existingUsage && existingUsage.length > 0) {
      console.log('[process-registration-coupon] ⚠️ Usuário já usou um código de referência');
      return corsResponse({ 
        success: false, 
        error: 'Usuário já usou um código de referência' 
      }, 400);
    }

    // Criar cupom no Stripe
    let couponId: string | null = null;
    const discountAmount = 50; // $50 de desconto fixo

    console.log('[process-registration-coupon] 🎯 CRIANDO CUPOM NO STRIPE');
    console.log('[process-registration-coupon] Discount Amount:', discountAmount);
    console.log('[process-registration-coupon] Stripe Secret Key:', stripeSecret.substring(0, 20) + '...');

    try {
      console.log('[process-registration-coupon] 📝 Criando cupom no Stripe...');
      console.log('[process-registration-coupon] Configuração do cupom:', {
        amount_off: discountAmount * 100,
        currency: 'usd',
        duration: 'once',
        name: `Matricula Rewards - ${affiliate_code}`,
        metadata: {
          affiliate_code: affiliate_code,
          user_id: targetUserId,
          referrer_id: affiliateData.user_id
        }
      });
      
      const newCoupon = await stripe.coupons.create({
        amount_off: discountAmount * 100, // Stripe usa centavos
        currency: 'usd',
        duration: 'once',
        name: `Matricula Rewards - ${affiliate_code}`,
        metadata: {
          affiliate_code: affiliate_code,
          user_id: targetUserId,
          referrer_id: affiliateData.user_id
        }
      });
      
      console.log('[process-registration-coupon] ✅ Cupom criado com sucesso!');
      console.log('[process-registration-coupon] Cupom ID:', newCoupon.id);
      console.log('[process-registration-coupon] Amount Off:', newCoupon.amount_off);
      console.log('[process-registration-coupon] Status:', newCoupon.valid);
      console.log('[process-registration-coupon] Cupom completo:', newCoupon);
      couponId = newCoupon.id;
      
    } catch (stripeError: any) {
      console.log('[process-registration-coupon] ⚠️ Erro ao criar cupom:', stripeError.code);
      console.log('[process-registration-coupon] Mensagem de erro:', stripeError.message);
      console.log('[process-registration-coupon] Erro completo:', stripeError);
      return corsResponse({
        success: false,
        error: 'Erro ao criar cupom no Stripe',
        details: {
          code: stripeError.code,
          message: stripeError.message
        }
      }, 500);
    }

    // Verificar se o cupom foi criado corretamente
    try {
      console.log('[process-registration-coupon] 🔍 Verificando se cupom foi criado...');
      const createdCoupon = await stripe.coupons.retrieve(couponId!);
      console.log('[process-registration-coupon] ✅ Cupom verificado com sucesso!');
      console.log('[process-registration-coupon] ID:', createdCoupon.id);
      console.log('[process-registration-coupon] Amount Off:', createdCoupon.amount_off);
      console.log('[process-registration-coupon] Valid:', createdCoupon.valid);
    } catch (verifyError) {
      console.error('[process-registration-coupon] ❌ Erro ao verificar cupom:', verifyError);
      return corsResponse({ 
        success: false, 
        error: 'Erro ao verificar cupom criado' 
      }, 500);
    }

    // Registrar uso do código de referência
    console.log('[process-registration-coupon] 📝 Registrando uso do código de referência...');
    
    const { error: insertError } = await supabase
      .from('used_referral_codes')
      .insert({
        user_id: targetUserId,
        affiliate_code: affiliate_code,
        referrer_id: affiliateData.user_id,
        discount_amount: discountAmount,
        stripe_coupon_id: couponId!,
        status: 'applied',
        applied_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 ano
      });

    if (insertError) {
      console.error('[process-registration-coupon] ❌ Erro ao registrar uso:', insertError);
      return corsResponse({ 
        success: false, 
        error: 'Erro ao registrar uso do código de referência' 
      }, 500);
    }

    console.log('[process-registration-coupon] ✅ Uso do código registrado com sucesso!');

    // Atualizar estatísticas do afiliado
    console.log('[process-registration-coupon] 📊 Atualizando estatísticas do afiliado...');
    
    // Buscar valor atual e incrementar (evita uso de SQL bruto no client)
    const { data: currentStats, error: fetchStatsError } = await supabase
      .from('affiliate_codes')
      .select('total_referrals')
      .eq('id', affiliateData.id)
      .single();

    if (fetchStatsError) {
      console.error('[process-registration-coupon] ⚠️ Erro ao buscar estatísticas:', fetchStatsError);
    } else {
      const newTotalReferrals = (currentStats?.total_referrals || 0) + 1;
      const { error: updateError } = await supabase
        .from('affiliate_codes')
        .update({
          total_referrals: newTotalReferrals,
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateData.id);

      if (updateError) {
        console.error('[process-registration-coupon] ⚠️ Erro ao atualizar estatísticas:', updateError);
        // Não falhar o processo por causa disso
      } else {
        console.log('[process-registration-coupon] ✅ Estatísticas do afiliado atualizadas!');
      }
    }

    console.log('[process-registration-coupon] 🎉 PROCESSO CONCLUÍDO COM SUCESSO!');

    return corsResponse({
      success: true,
      message: 'Cupom de desconto criado com sucesso',
      data: {
        coupon_id: couponId,
        discount_amount: discountAmount,
        affiliate_code: affiliate_code,
        referrer_id: affiliateData.user_id
      }
    }, 200);

  } catch (error) {
    console.error('[process-registration-coupon] ❌ Erro geral:', error);
    return corsResponse({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, 500);
  }
});
