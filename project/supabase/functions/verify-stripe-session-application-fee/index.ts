import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { getStripeConfig } from '../stripe-config.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Função auxiliar para determinar moeda e símbolo baseado na session do Stripe
function getCurrencyInfo(session) {
  const currency = session.currency?.toLowerCase() || 'usd';
  const isPix = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
  
  // Se for PIX ou currency for BRL, usar Real
  if (currency === 'brl' || isPix) {
    return {
      currency: 'BRL',
      symbol: 'R$',
      code: 'brl'
    };
  }
  
  // Caso contrário, usar Dólar
  return {
    currency: 'USD',
    symbol: '$',
    code: 'usd'
  };
}

// Função auxiliar para formatar valor com moeda
function formatAmountWithCurrency(amount, session) {
  const currencyInfo = getCurrencyInfo(session);
  return `${currencyInfo.symbol}${amount.toFixed(2)}`;
}

/**
 * Busca todos os administradores do sistema
 * Retorna array com email, nome e telefone de cada admin
 * Em ambiente de desenvolvimento (localhost), filtra emails específicos
 */
async function getAllAdmins(supabase, isDevelopment: boolean = false): Promise<Array<{
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
}>> {
  // Emails a serem filtrados em ambiente de desenvolvimento
  const devBlockedEmails = [
    'luizedmiola@gmail.com',
    'chimentineto@gmail.com',
    'fsuaiden@gmail.com',
    'rayssathefuture@gmail.com',
    'gui.reis@live.com',
    'admin@matriculausa.com'
  ];
  
  try {
    // Buscar todos os admins da tabela user_profiles onde role = 'admin'
    const { data: adminProfiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, phone')
      .eq('role', 'admin');

    if (profileError) {
      console.error('[getAllAdmins] Erro ao buscar admins de user_profiles:', profileError);
      
      // Fallback: tentar buscar de auth.users
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter(user => user.user_metadata?.role === 'admin' || user.email === 'admin@matriculausa.com')
            .map(user => ({
              user_id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin MatriculaUSA',
              phone: user.user_metadata?.phone || ''
            }))
            .filter(admin => admin.email);
          
          if (adminUsers.length > 0) {
            const filteredAdmins = isDevelopment 
              ? adminUsers.filter(admin => !devBlockedEmails.includes(admin.email))
              : adminUsers;
            console.log(`[getAllAdmins] Encontrados ${filteredAdmins.length} admin(s) via auth.users${isDevelopment ? ' (filtrados para dev)' : ''}:`, filteredAdmins.map(a => a.email));
            return filteredAdmins.length > 0 ? filteredAdmins : [{
              user_id: '',
              email: 'admin@matriculausa.com',
              full_name: 'Admin MatriculaUSA',
              phone: ''
            }];
          }
        }
      } catch (authFallbackError) {
        console.error('[getAllAdmins] Erro no fallback para auth.users:', authFallbackError);
      }
      
      return [{
        user_id: '',
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin encontrado em user_profiles, tentando auth.users...');
      
      // Fallback: tentar buscar de auth.users
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authUsers) {
          const adminUsers = authUsers.users
            .filter(user => user.user_metadata?.role === 'admin' || user.email === 'admin@matriculausa.com')
            .map(user => ({
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin MatriculaUSA',
              phone: user.user_metadata?.phone || ''
            }))
            .filter(admin => admin.email);
          
          if (adminUsers.length > 0) {
            const filteredAdmins = isDevelopment 
              ? adminUsers.filter(admin => !devBlockedEmails.includes(admin.email))
              : adminUsers;
            console.log(`[getAllAdmins] Encontrados ${filteredAdmins.length} admin(s) via auth.users${isDevelopment ? ' (filtrados para dev)' : ''}:`, filteredAdmins.map(a => a.email));
            return filteredAdmins.length > 0 ? filteredAdmins : [{
              email: 'admin@matriculausa.com',
              full_name: 'Admin MatriculaUSA',
              phone: ''
            }];
          }
        }
      } catch (authFallbackError) {
        console.error('[getAllAdmins] Erro no fallback para auth.users:', authFallbackError);
      }
      
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    // Se algum admin não tem email em user_profiles, buscar de auth.users
    const adminsWithEmail = await Promise.all(
      adminProfiles.map(async (profile) => {
        if (profile.email) {
          return {
            user_id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name || 'Admin MatriculaUSA',
            phone: profile.phone || ''
          };
        } else {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
            return {
              user_id: profile.user_id,
              email: authUser?.user?.email || '',
              full_name: profile.full_name || authUser?.user?.user_metadata?.full_name || 'Admin MatriculaUSA',
              phone: profile.phone || authUser?.user?.user_metadata?.phone || ''
            };
          } catch (e) {
            console.warn(`[getAllAdmins] Erro ao buscar email para user_id ${profile.user_id}:`, e);
            return null;
          }
        }
      })
    );

    // Filtrar nulos e admins sem email
    let admins = adminsWithEmail
      .filter((admin): admin is { user_id: string; email: string; full_name: string; phone: string } => 
        admin !== null && !!admin.email
      );

    // Filtrar emails bloqueados em desenvolvimento
    if (isDevelopment) {
      const beforeFilter = admins.length;
      admins = admins.filter(admin => !devBlockedEmails.includes(admin.email));
      if (beforeFilter !== admins.length) {
        console.log(`[getAllAdmins] Filtrados ${beforeFilter - admins.length} admin(s) em ambiente de desenvolvimento`);
      }
    }

    if (admins.length === 0) {
      console.warn('[getAllAdmins] Nenhum admin válido encontrado após processamento, usando admin padrão');
      return [{
        email: 'admin@matriculausa.com',
        full_name: 'Admin MatriculaUSA',
        phone: ''
      }];
    }

    console.log(`[getAllAdmins] Encontrados ${admins.length} admin(s)${isDevelopment ? ' (filtrados para dev)' : ''}:`, admins.map(a => a.email));

    return admins;
  } catch (error) {
    console.error('[getAllAdmins] Erro inesperado ao buscar admins:', error);
    return [{
      email: 'admin@matriculausa.com',
      full_name: 'Admin MatriculaUSA',
      phone: ''
    }];
  }
}

function corsResponse(body, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json'
  };
  if (status === 204) {
    return new Response(null, {
      status,
      headers
    });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers
    }
  });
}
Deno.serve(async (req)=>{
  console.log('--- verify-stripe-session-application-fee: Request received ---');
  console.log('--- TESTE: Edge Function funcionando ---');
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 204);
    if (req.method !== 'POST') return corsResponse({
      error: 'Method Not Allowed'
    }, 405);
    
    // Obter configuração do Stripe baseada no ambiente detectado
    const config = getStripeConfig(req);
    const stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-04-10',
      appInfo: {
        name: 'MatriculaUSA Integration',
        version: '1.0.0'
      }
    });
    
    const { sessionId } = await req.json();
    if (!sessionId) return corsResponse({
      error: 'Session ID is required'
    }, 400);
    console.log(`Verifying session ID: ${sessionId}`);
    
    // Verificar se esta sessão já foi processada para evitar duplicação
    const { data: existingLog } = await supabase
      .from('student_action_logs')
      .select('id')
      .eq('action_type', 'fee_payment')
      .eq('metadata->>session_id', sessionId)
      .single();
    
    if (existingLog) {
      console.log(`[DUPLICAÇÃO] Session ${sessionId} já foi processada, retornando sucesso sem reprocessar.`);
      return corsResponse({
        status: 'complete',
        message: 'Session already processed successfully.'
      }, 200);
    }
    
    // Expandir payment_intent para obter o ID completo
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });
    console.log(`Session status: ${session.status}, Payment status: ${session.payment_status}`);
    console.log('Session metadata:', session.metadata);
    if (session.payment_status === 'paid' && session.status === 'complete') {
      const userId = session.client_reference_id;
      const applicationId = session.metadata?.application_id;
      
      // Detectar se é PIX através dos payment_method_types ou metadata
      const isPixPayment = session.payment_method_types?.includes('pix') || session.metadata?.payment_method === 'pix';
      
      // Para pagamentos via Stripe, sempre usar 'stripe' como payment_method na tabela individual_fee_payments
      // Mas para scholarship_applications, usar 'pix' se for PIX, 'stripe' caso contrário
      const paymentMethodForIndividualFee = 'stripe'; // Sempre 'stripe' para individual_fee_payments
      const paymentMethodForApplication = isPixPayment ? 'pix' : (session.metadata?.payment_method || 'stripe'); // 'pix' ou 'stripe' para scholarship_applications
      
      // Variável para lógica de conversão (usada para detectar PIX)
      const paymentMethod = isPixPayment ? 'pix' : (session.metadata?.payment_method || 'stripe');
      
      console.log(`Processing successful payment. UserID: ${userId}, ApplicationID: ${applicationId}, Payment Method: ${paymentMethodForApplication}`);
      if (!userId) return corsResponse({
        error: 'User ID (client_reference_id) missing in session.'
      }, 400);
      if (!applicationId) return corsResponse({
        error: 'Application ID missing in session metadata.'
      }, 400);
      // Busca o perfil do usuário para obter o user_profiles.id correto
      const { data: userProfile, error: profileError } = await supabase.from('user_profiles').select('id, user_id').eq('user_id', userId).single();
      if (profileError || !userProfile) {
        console.error('User profile not found:', profileError);
        return corsResponse({
          error: 'User profile not found'
        }, 404);
      }
      console.log(`User profile found: ${userProfile.id} for auth user: ${userId}`);
      
      // Criar log ANTES de processar para evitar duplicação em chamadas simultâneas
      try {
        await supabase.rpc('log_student_action', {
          p_student_id: userProfile.id,
          p_action_type: 'fee_payment',
          p_action_description: `Application Fee payment processing started (${sessionId})`,
          p_performed_by: userId,
          p_performed_by_type: 'student',
            p_metadata: {
              fee_type: 'application',
              payment_method: paymentMethodForApplication,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              session_id: sessionId,
              application_id: applicationId,
              processing_started: true
            }
        });
        console.log('[DUPLICAÇÃO] Log de processamento criado para evitar duplicação');
      } catch (logError) {
        // Se falhar ao criar log, verificar novamente se já existe (race condition)
        const { data: recheckLog } = await supabase
          .from('student_action_logs')
          .select('id')
          .eq('action_type', 'fee_payment')
          .eq('metadata->>session_id', sessionId)
          .single();
        
        if (recheckLog) {
          console.log(`[DUPLICAÇÃO] Session ${sessionId} já está sendo processada, retornando sucesso.`);
          return corsResponse({
            status: 'complete',
            message: 'Session already being processed.'
          }, 200);
        }
        console.error('[DUPLICAÇÃO] Erro ao criar log, mas continuando processamento:', logError);
      }
      // Verifica se a aplicação existe e pertence ao usuário (usando userProfile.id)
      const { data: application, error: fetchError } = await supabase.from('scholarship_applications').select('id, student_id, scholarship_id, student_process_type, status').eq('id', applicationId).eq('student_id', userProfile.id).single();
      if (fetchError || !application) {
        console.error('Application not found:', fetchError);
        return corsResponse({
          error: 'Application not found or access denied'
        }, 404);
      }
      console.log('Application found:', application);
      // Preparar dados para atualização
      const updateData = {
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        is_application_fee_paid: true,
        application_fee_payment_method: paymentMethodForApplication // 'pix' ou 'stripe'
      };
      // Preservar o status atual se já estiver 'approved' (universidade já aprovou)
      console.log(`[verify-stripe-session-application-fee] Current application status: '${application.status}' for user ${userId}, application ${applicationId}.`);
      if (application.status !== 'approved') {
        updateData.status = 'under_review';
        console.log(`[verify-stripe-session-application-fee] Application status set to 'under_review' for user ${userId}, application ${applicationId}.`);
      } else {
        console.log(`[verify-stripe-session-application-fee] Preserving 'approved' status for user ${userId}, application ${applicationId} (university already approved).`);
      }
      // Se student_process_type não existe na aplicação, tentar obter dos metadados da sessão
      if (!application.student_process_type && session.metadata?.student_process_type) {
        updateData.student_process_type = session.metadata.student_process_type;
        console.log('Adding student_process_type from session metadata:', session.metadata.student_process_type);
      }
      // Atualiza a aplicação
      console.log(`Updating application ${applicationId} with data:`, updateData);
      const { error: updateError } = await supabase.from('scholarship_applications').update(updateData).eq('id', applicationId).eq('student_id', userProfile.id);
      if (updateError) {
        console.error('Failed to update application status:', updateError);
        console.error('Update data that failed:', updateData);
        throw new Error(`Failed to update application status: ${updateError.message}`);
      }
      
      // Verificar se a atualização foi bem-sucedida
      const { data: updatedApplication, error: verifyError } = await supabase
        .from('scholarship_applications')
        .select('id, application_fee_payment_method, is_application_fee_paid, payment_status')
        .eq('id', applicationId)
        .single();
      
      if (verifyError) {
        console.error('Failed to verify update:', verifyError);
      } else {
        console.log('Application updated successfully:', updatedApplication);
      }
      if (updateData.status) {
        console.log(`Application status updated to '${updateData.status}' with payment info`);
      } else {
        console.log('Application payment info updated (status preserved)');
      }
      // Buscar documentos do user_profiles e vincular à application (usando userId para user_profiles)
      const { data: userProfileDocs, error: userProfileError } = await supabase.from('user_profiles').select('documents').eq('user_id', userId).single();
      if (userProfileError) {
        console.error('Failed to fetch user profile documents:', userProfileError);
      } else if (userProfileDocs?.documents) {
        const documents = Array.isArray(userProfileDocs.documents) ? userProfileDocs.documents : [];
        let formattedDocuments = documents;
        // Se for array de strings (URLs), converter para array de objetos completos
        if (documents.length > 0 && typeof documents[0] === 'string') {
          const docTypes = [
            'passport',
            'diploma',
            'funds_proof'
          ];
          formattedDocuments = documents.map((url, idx)=>({
              type: docTypes[idx] || `doc${idx + 1}`,
              url,
              uploaded_at: new Date().toISOString()
            }));
        }
        if (formattedDocuments.length > 0) {
          const { error: docUpdateError } = await supabase.from('scholarship_applications').update({
            documents: formattedDocuments
          }).eq('id', applicationId).eq('student_id', userProfile.id);
          if (docUpdateError) {
            console.error('Failed to update application documents:', docUpdateError);
          } else {
            console.log('Application documents updated');
          }
        }
      }
      // Atualiza perfil do usuário para marcar que pagou a application fee
      const { error: profileUpdateError } = await supabase.from('user_profiles').update({
        is_application_fee_paid: true,
        application_fee_payment_method: paymentMethodForApplication, // 'pix' ou 'stripe'
        last_payment_date: new Date().toISOString()
      }).eq('user_id', userId);
      if (profileUpdateError) {
        console.error('Failed to update user_profiles:', profileUpdateError);
        throw new Error(`Failed to update user_profiles: ${profileUpdateError.message}`);
      }
      console.log('User profile updated - application fee paid');

      // Tracking vars for duplication control
      let paymentInserted = false;
      let duplicateFound = false;
      let existingPaymentDate: Date | null = null;

      // Registrar pagamento na tabela individual_fee_payments
      try {
        const paymentDate = new Date().toISOString();
        const paymentAmountRaw = session.amount_total ? session.amount_total / 100 : 0;
        const currency = session.currency?.toUpperCase() || 'USD';
        // Obter payment_intent_id: pode ser string ou objeto PaymentIntent
        let paymentIntentId = '';
        if (typeof session.payment_intent === 'string') {
          paymentIntentId = session.payment_intent;
        } else if (session.payment_intent && typeof session.payment_intent === 'object' && 'id' in session.payment_intent) {
          paymentIntentId = (session.payment_intent as any).id;
        }
        
        // Para pagamentos PIX (BRL), buscar o valor líquido recebido em USD do BalanceTransaction
        // Sempre buscar o valor líquido, independente do ambiente
        const shouldFetchNetAmount = true;
        
        // Debug: Log das condições
        console.log(`[Individual Fee Payment] DEBUG - currency: ${currency}, paymentMethod: ${paymentMethod}, paymentIntentId: ${paymentIntentId}, shouldFetchNetAmount: ${shouldFetchNetAmount}, isProduction: ${config.environment.isProduction}`);
        
        let paymentAmount = paymentAmountRaw;
        let grossAmountUsd: number | null = null;
        let feeAmountUsd: number | null = null;

        // Para pagamentos PIX (BRL), buscar o valor líquido recebido em USD do BalanceTransaction
        if (paymentIntentId && currency === "BRL") {
          console.log(`✅ [PIX] Buscando valor real convertido do Stripe: ${paymentIntentId}`);
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
              expand: ['latest_charge.balance_transaction']
            });
            
            const charge = paymentIntent.latest_charge;
            if (charge && typeof charge !== 'string') {
              let bt = charge.balance_transaction;
              
              // Se não veio expandido, buscar explicitamente
              if (!bt || typeof bt === 'string') {
                const bts = await stripe.balanceTransactions.list({
                  source: charge.id,
                  limit: 1
                });
                if (bts.data.length > 0) bt = bts.data[0];
              }

              if (bt && typeof bt !== 'string' && bt.currency === 'usd') {
                paymentAmount = bt.net / 100;
                grossAmountUsd = bt.amount / 100;
                feeAmountUsd = bt.fee / 100;
                console.log(`[BalanceTransaction] Sucesso! Valor líquido: $${paymentAmount} USD`);
              }
            }
          } catch (stripeError) {
            console.error("[BalanceTransaction] Erro ao buscar do Stripe:", stripeError);
          }
        } else if (currency === "BRL" && session.metadata?.exchange_rate) {
          // Fallback mínimo apenas se a API do Stripe falhar criticamente
          const exchangeRate = parseFloat(session.metadata.exchange_rate);
          if (exchangeRate > 0) paymentAmount = paymentAmountRaw / exchangeRate;
        }

        
        // ✅ Verificar se já existe registro com este payment_intent_id para evitar duplicação
        // IMPORTANTE: Fazer verificação dupla para evitar race conditions
        if (paymentIntentId) {
          // Primeira verificação
          const { data: existingPayment, error: checkError } = await supabase
            .from('individual_fee_payments')
            .select('id, payment_intent_id, payment_date, created_at')
            .eq('payment_intent_id', paymentIntentId)
            .eq('fee_type', 'application')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (checkError) {
            console.warn('[Individual Fee Payment] Warning: Erro ao verificar duplicação:', checkError);
          } else if (existingPayment) {
            console.log(`[DUPLICAÇÃO] Payment já registrado em individual_fee_payments com payment_intent_id: ${paymentIntentId}, pulando inserção.`);
            duplicateFound = true;
            existingPaymentDate = existingPayment.created_at ? new Date(existingPayment.created_at) : (existingPayment.payment_date ? new Date(existingPayment.payment_date) : null);
            // Não inserir novamente, mas continuar o fluxo normalmente
          } else {
            // ✅ SEGUNDA VERIFICAÇÃO imediatamente antes de inserir (para evitar race condition)
            const { data: doubleCheckPayment, error: doubleCheckError } = await supabase
              .from('individual_fee_payments')
              .select('id, payment_intent_id, payment_date, created_at')
              .eq('payment_intent_id', paymentIntentId)
              .eq('fee_type', 'application')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (doubleCheckError) {
              console.warn('[Individual Fee Payment] Warning: Erro na segunda verificação de duplicação:', doubleCheckError);
            } else if (doubleCheckPayment) {
              console.log(`[DUPLICAÇÃO] Payment já registrado (segunda verificação) com payment_intent_id: ${paymentIntentId}, pulando inserção.`);
              duplicateFound = true;
              existingPaymentDate = doubleCheckPayment.created_at ? new Date(doubleCheckPayment.created_at) : (doubleCheckPayment.payment_date ? new Date(doubleCheckPayment.payment_date) : null);
              // Não inserir novamente
            } else {
              // Não existe, pode inserir
              console.log('[Individual Fee Payment] Recording application fee payment...');
              console.log(`[Individual Fee Payment] Valor original: ${paymentAmountRaw} ${currency}, Valor em USD (líquido): ${paymentAmount} USD${grossAmountUsd ? `, Valor bruto: ${grossAmountUsd} USD` : ''}${feeAmountUsd ? `, Taxas: ${feeAmountUsd} USD` : ''}`);
              const { data: insertResult, error: insertError } = await supabase.rpc('insert_individual_fee_payment', {
                p_user_id: userId,
                p_fee_type: 'application',
                p_amount: paymentAmount, // Sempre em USD (líquido)
                p_payment_date: paymentDate,
                p_payment_method: 'stripe',
                p_payment_intent_id: paymentIntentId,
                p_stripe_charge_id: null,
                p_zelle_payment_id: null,
                p_gross_amount_usd: grossAmountUsd, // Valor bruto em USD (quando disponível)
                p_fee_amount_usd: feeAmountUsd // Taxas em USD (quando disponível)
              });
              
              if (insertError) {
                // Se o erro for de constraint única ou duplicação, verificar novamente
                if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
                  console.log(`[DUPLICAÇÃO] Erro de constraint única detectado, verificando se o registro foi criado por outra chamada...`);
                  const { data: finalCheckPayment } = await supabase
                    .from('individual_fee_payments')
                    .select('id, payment_intent_id, payment_date, created_at')
                    .eq('payment_intent_id', paymentIntentId)
                    .eq('fee_type', 'application')
                    .eq('user_id', userId)
                    .maybeSingle();
                  
                  if (finalCheckPayment) {
                    console.log(`[DUPLICAÇÃO] Registro foi criado por outra chamada simultânea, continuando normalmente.`);
                    duplicateFound = true;
                    existingPaymentDate = finalCheckPayment.created_at ? new Date(finalCheckPayment.created_at) : (finalCheckPayment.payment_date ? new Date(finalCheckPayment.payment_date) : null);
                  } else {
                    console.warn('[Individual Fee Payment] Warning: Erro ao inserir mas registro não encontrado:', insertError);
                  }
                } else {
                  console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', insertError);
                }
              } else {
                console.log('[Individual Fee Payment] Application fee recorded successfully:', insertResult);
                paymentInserted = true;
              }
            }
          }
        } else {
          console.warn('[Individual Fee Payment] Warning: payment_intent_id não disponível, não é possível verificar duplicação. Pulando inserção.');
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
        // Não quebra o fluxo - continua normalmente
      }
      // Limpa carrinho
      const { error: cartError } = await supabase.from('user_cart').delete().eq('user_id', userId);
      if (cartError) {
        console.error('Failed to clear user_cart:', cartError);
      } else {
        console.log('User cart cleared');
      }
      
      // Verificar novamente se já foi processado ANTES de enviar notificações
      // (proteção adicional contra race conditions - verifica se há um log que foi criado há mais de 5 segundos)
      const { data: finalCheckLog } = await supabase
        .from('student_action_logs')
        .select('id, created_at, metadata')
        .eq('action_type', 'fee_payment')
        .eq('metadata->>session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (finalCheckLog && finalCheckLog.length > 0) {
        // Verificar se há um log que foi criado há mais de 5 segundos (indicando que o processamento já foi concluído)
        const now = new Date();
        const logsWithTime = finalCheckLog.filter(log => {
          const logTime = new Date(log.created_at);
          const secondsDiff = (now.getTime() - logTime.getTime()) / 1000;
          return secondsDiff > 5; // Log criado há mais de 5 segundos
        });
        
        if (logsWithTime.length > 0) {
          console.log(`[DUPLICAÇÃO] Log antigo detectado para session ${sessionId}, retornando sucesso para evitar duplicação.`);
          return corsResponse({
            status: 'complete',
            message: 'Session already processed (old log detected)'
          }, 200);
        }
        
        // Se há múltiplos logs recentes (criados há menos de 5 segundos), verificar se algum deles tem notifications_sent
        // Isso indica que o processamento foi concluído e as notificações já foram enviadas
        const logsWithNotificationsSent = finalCheckLog.filter(log => {
          const metadata = log.metadata || {};
          return metadata.notifications_sent === true;
        });
        
        if (logsWithNotificationsSent.length > 0) {
          console.log(`[DUPLICAÇÃO] Log com notifications_sent detectado para session ${sessionId}, retornando sucesso para evitar duplicação.`);
          return corsResponse({
            status: 'complete',
            message: 'Session already processed (notifications already sent)'
          }, 200);
        }
      }
      
      // --- NOTIFICAÇÕES VIA WEBHOOK N8N (para PIX e cartão) ---
      
      // Decidir se deve enviar notificações
      // 1. Se nós inserimos o pagamento agora -> ENVIAR
      // 2. Se não foi inserido (duplicata), verificar quão antiga é a duplicata
      //    - Se < 2 minutos: Provável race condition, outro processo está enviando -> NÃO ENVIAR
      //    - Se > 2 minutos: Provável retry após falha -> ENVIAR
      // 3. Se não temos info de data (fallback) -> NÃO ENVIAR para evitar spam
      
      let shouldSendNotifications = false;
      const TWO_MINUTES_MS = 2 * 60 * 1000;
      
      if (paymentInserted) {
        shouldSendNotifications = true;
        console.log('🔔 [NOTIFICAÇÕES] Pagamento inserido com sucesso nesta execução. Enviando notificações.');
      } else if (duplicateFound && existingPaymentDate) {
        const timeDiff = new Date().getTime() - existingPaymentDate.getTime();
        if (timeDiff > TWO_MINUTES_MS) {
           shouldSendNotifications = true;
           console.log(`🔔 [NOTIFICAÇÕES] Duplicata encontrada, mas registro é antigo (${timeDiff}ms > 2min). Assumindo retry e enviando notificações.`);
        } else {
           shouldSendNotifications = false;
           console.log(`🔇 [NOTIFICAÇÕES] Duplicata encontrada e registro é recente (${timeDiff}ms < 2min). Assumindo race condition e PULANDO notificações.`);
        }
      } else if (duplicateFound && !existingPaymentDate) {
         shouldSendNotifications = false;
         console.log('🔇 [NOTIFICAÇÕES] Duplicata encontrada mas sem data de criação. Por segurança, PULANDO notificações.');
      } else {
         // Fallback default: se não foi duplicata mas também não inserted (ex: erro, ou sem paymentIntentId), permitimos enviar ou não?
         // Se chegou aqui, provavelmente paymentInserted=false e duplicateFound=false.
         // Talvez erro na inserção. Se houve erro na inserção, melhor tentar notificar?
         // Mas se paymentIntentId não existe... 
         shouldSendNotifications = true;
         console.log('🔔 [NOTIFICAÇÕES] Caso não coberto por proteção de duplicata (ex: sem paymentIntentId). Enviando notificações por precaução.');
      }

      if (shouldSendNotifications) {
        try {
        console.log(`📤 [verify-stripe-session-application-fee] Iniciando notificações...`);
        // Buscar dados do aluno (incluindo seller_referral_code e phone)
        const { data: alunoData, error: alunoError } = await supabase.from('user_profiles').select('id, full_name, email, phone, seller_referral_code').eq('user_id', userId).single();
        // Detectar ambiente de desenvolvimento
        const isDevelopment = config.environment.isTest || config.environment.environment === 'test';
        // Buscar todos os admins do sistema
        // Em ambiente de desenvolvimento (test), filtrar emails específicos
        const admins = await getAllAdmins(supabase, isDevelopment);
        if (alunoError || !alunoData) {
          console.error('[NOTIFICAÇÃO] Erro ao buscar dados do aluno:', alunoError);
          return corsResponse({
            status: 'complete',
            message: 'Session verified and processed successfully.'
          }, 200);
        }
        // Buscar dados da aplicação (já temos application.scholarship_id)
        const scholarshipId = application.scholarship_id;
        // Buscar dados da bolsa
        const { data: scholarship, error: scholarshipError } = await supabase.from('scholarships').select('id, title, university_id').eq('id', scholarshipId).single();
        if (scholarshipError || !scholarship) throw new Error('Bolsa não encontrada para notificação');
        // Buscar dados da universidade
        const { data: universidade, error: univError } = await supabase.from('universities').select('id, name, contact').eq('id', scholarship.university_id).single();
        if (univError || !universidade) throw new Error('Universidade não encontrada para notificação');
        const contact = universidade.contact || {};
        const emailUniversidade = contact.admissionsEmail || contact.email || '';
        
        // Preparar informações de moeda
        const currencyInfo = getCurrencyInfo(session);
        const amountValue = session.amount_total ? session.amount_total / 100 : (parseFloat(session.metadata?.amount || '10'));
        const formattedAmount = formatAmountWithCurrency(amountValue, session);
        
        // 1. NOTIFICAÇÃO PARA O ALUNO
        const mensagemAluno = `O aluno ${alunoData.full_name} selecionou a bolsa "${scholarship.title}" da universidade ${universidade.name} e pagou a taxa de aplicação. Acesse o painel para revisar a candidatura.`;
        const alunoNotificationPayload = {
          tipo_notf: 'Novo pagamento de application fee',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          phone_aluno: alunoData.phone || "",
          nome_bolsa: scholarship.title,
          nome_universidade: universidade.name,
          email_universidade: emailUniversidade,
          o_que_enviar: mensagemAluno,
          payment_amount: amountValue,
          amount: amountValue,
          currency: currencyInfo.currency,
          currency_symbol: currencyInfo.symbol,
          formatted_amount: formattedAmount,
          payment_method: 'stripe',
          payment_id: sessionId,
          fee_type: 'application',
          notification_target: 'student'
        };
        console.log('[NOTIFICAÇÃO ALUNO] Enviando notificação para aluno:', alunoNotificationPayload);
        const alunoNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostmanRuntime/7.36.3'
          },
          body: JSON.stringify(alunoNotificationPayload)
        });
        const alunoResult = await alunoNotificationResponse.text();
        console.log('[NOTIFICAÇÃO ALUNO] Resposta do n8n (aluno):', alunoNotificationResponse.status, alunoResult);

        // ✅ IN-APP NOTIFICATION FOR STUDENT (Application Fee)
        try {
          if (alunoData?.id) {
            console.log('[NOTIFICAÇÃO ALUNO] Criando notificação in-app de Application Fee...');
            const { error: inAppError } = await supabase
              .from('student_notifications')
              .insert({
                student_id: alunoData.id,
                title: 'Application Fee Confirmd',
                message: `Your Application Fee for ${scholarship.title} at ${universidade.name} has been confirmed.`,
                link: '/student/dashboard/applications',
                created_at: new Date().toISOString()
              });

            if (inAppError) {
              console.error('[NOTIFICAÇÃO ALUNO] Erro ao criar notificação in-app:', inAppError);
            } else {
              console.log('[NOTIFICAÇÃO ALUNO] Notificação in-app criada com sucesso!');
            }
          } else {
            console.warn('[NOTIFICAÇÃO ALUNO] Dados do aluno (ID) não encontrados para notificação in-app.');
          }
        } catch (inAppEx) {
            console.error('[NOTIFICAÇÃO ALUNO] Exceção ao criar notificação in-app:', inAppEx);
        }
        // 2. NOTIFICAÇÃO PARA A UNIVERSIDADE
        const mensagemUniversidade = `O aluno ${alunoData.full_name} pagou a taxa de aplicação de ${formattedAmount} via Stripe para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Acesse o painel para revisar a candidatura.`;
        const universidadeNotificationPayload = {
          tipo_notf: 'Notificação para Universidade - Pagamento de Application Fee',
          email_aluno: alunoData.email,
          nome_aluno: alunoData.full_name,
          phone_aluno: alunoData.phone || "",
          nome_bolsa: scholarship.title,
          nome_universidade: universidade.name,
          email_universidade: emailUniversidade,
          o_que_enviar: mensagemUniversidade,
          payment_amount: amountValue,
          amount: amountValue,
          currency: currencyInfo.currency,
          currency_symbol: currencyInfo.symbol,
          formatted_amount: formattedAmount,
          payment_method: 'stripe',
          payment_id: sessionId,
          fee_type: 'application',
          notification_target: 'university'
        };
        console.log('[NOTIFICAÇÃO UNIVERSIDADE] Enviando notificação para universidade:', universidadeNotificationPayload);
        const universidadeNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PostmanRuntime/7.36.3'
          },
          body: JSON.stringify(universidadeNotificationPayload)
        });
        const universidadeResult = await universidadeNotificationResponse.text();
        console.log('[NOTIFICAÇÃO UNIVERSIDADE] Resposta do n8n (universidade):', universidadeNotificationResponse.status, universidadeResult);
        // 3. NOTIFICAÇÃO PARA SELLER/ADMIN/AFFILIATE (se houver código de seller)
        console.log(`📤 [verify-stripe-session-application-fee] DEBUG - alunoData.seller_referral_code:`, alunoData.seller_referral_code);
        if (alunoData.seller_referral_code) {
          console.log(`📤 [verify-stripe-session-application-fee] Buscando seller através do seller_referral_code: ${alunoData.seller_referral_code}`);
          // Buscar informações do seller através do seller_referral_code
          console.log(`📤 [verify-stripe-session-application-fee] Executando query: SELECT * FROM sellers WHERE referral_code = '${alunoData.seller_referral_code}'`);
          // Query simplificada para evitar erro de relacionamento
          const { data: sellerData, error: sellerError } = await supabase.from('sellers').select(`
              id,
              user_id,
              name,
              email,
              referral_code,
              commission_rate,
              affiliate_admin_id
            `).eq('referral_code', alunoData.seller_referral_code).single();
          console.log(`📤 [verify-stripe-session-application-fee] Resultado da busca do seller:`, {
            sellerData,
            sellerError
          });
          if (sellerData && !sellerError) {
            console.log(`📤 [verify-stripe-session-application-fee] Seller encontrado:`, sellerData);
            // Buscar telefone do seller
            const { data: sellerProfile, error: sellerProfileError } = await supabase.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
            const sellerPhone = sellerProfile?.phone || "";
            // Buscar dados do affiliate_admin se houver
            let affiliateAdminData = {
              user_id: "",
              email: "",
              name: "Affiliate Admin",
              phone: ""
            };
            if (sellerData.affiliate_admin_id) {
              console.log(`📤 [verify-stripe-session-application-fee] Buscando affiliate_admin: ${sellerData.affiliate_admin_id}`);
              const { data: affiliateData, error: affiliateError } = await supabase.from('affiliate_admins').select('user_id').eq('id', sellerData.affiliate_admin_id).single();
              if (affiliateData && !affiliateError) {
                const { data: affiliateProfile, error: profileError } = await supabase.from('user_profiles').select('email, full_name, phone').eq('user_id', affiliateData.user_id).single();
                if (affiliateProfile && !profileError) {
                  affiliateAdminData = {
                    user_id: affiliateData.user_id,
                    email: affiliateProfile.email || "",
                    name: affiliateProfile.full_name || "Affiliate Admin",
                    phone: affiliateProfile.phone || ""
                  };
                  console.log(`📤 [verify-stripe-session-application-fee] Affiliate admin encontrado:`, affiliateAdminData);
                }
              }
            }
            // 3.1. NOTIFICAÇÃO PARA O SELLER
            const sellerNotificationPayload = {
              tipo_notf: "Pagamento Stripe de application fee confirmado - Seller",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              nome_bolsa: scholarship.title,
              nome_universidade: universidade.name,
              o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seu código de referência: ${sellerData.referral_code}`,
              payment_id: sessionId,
              fee_type: 'application',
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              payment_method: "stripe",
              notification_target: 'seller'
            };
            console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para seller:', sellerNotificationPayload);
            const sellerNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3'
              },
              body: JSON.stringify(sellerNotificationPayload)
            });
            if (sellerNotificationResponse.ok) {
              const sellerResult = await sellerNotificationResponse.text();
              console.log('📧 [verify-stripe-session-application-fee] Notificação para seller enviada com sucesso:', sellerResult);
            } else {
              const sellerError = await sellerNotificationResponse.text();
              console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para seller:', sellerError);
            }

            // ✅ IN-APP NOTIFICATION FOR SELLER
            if (sellerData.user_id) {
                try {
                  await supabase.from('admin_notifications').insert({
                    user_id: sellerData.user_id,
                    title: 'New Commission Potential (Application)',
                    message: `Your student ${alunoData.full_name} has paid the Application Fee for "${scholarship.title}" (${formattedAmount}).`,
                    type: 'payment',
                    link: '/admin/dashboard/users',
                    metadata: {
                       student_id: alunoData.id,
                       student_name: alunoData.full_name,
                       amount: amountValue,
                       fee_type: 'application_fee',
                       payment_id: sessionId
                    }
                  });
                } catch (sellerInAppErr) {
                   console.error(`[NOTIFICAÇÃO SELLER] Erro ao criar in-app notification para seller ${sellerData.email}:`, sellerInAppErr);
                }
            }
            // 3.2. NOTIFICAÇÃO PARA O AFFILIATE ADMIN (se existir)
            if (affiliateAdminData.email) {
              const affiliateNotificationPayload = {
                tipo_notf: "Pagamento Stripe de application fee confirmado - Affiliate Admin",
                email_affiliate_admin: affiliateAdminData.email,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: affiliateAdminData.phone,
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                phone_aluno: alunoData.phone || "",
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                phone_seller: sellerPhone,
                nome_bolsa: scholarship.title,
                nome_universidade: universidade.name,
                o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                payment_id: sessionId,
                fee_type: 'application',
                amount: amountValue,
                currency: currencyInfo.currency,
                currency_symbol: currencyInfo.symbol,
                formatted_amount: formattedAmount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: "stripe",
                notification_target: 'affiliate_admin'
              };
              console.log('📧 [verify-stripe-session-application-fee] Enviando notificação para affiliate admin:', affiliateNotificationPayload);
              const affiliateNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'PostmanRuntime/7.36.3'
                },
                body: JSON.stringify(affiliateNotificationPayload)
              });
              if (affiliateNotificationResponse.ok) {
                const affiliateResult = await affiliateNotificationResponse.text();
                console.log('📧 [verify-stripe-session-application-fee] Notificação para affiliate admin enviada com sucesso:', affiliateResult);
              } else {
                const affiliateError = await affiliateNotificationResponse.text();
                console.error('📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para affiliate admin:', affiliateError);
              }

              // ✅ IN-APP NOTIFICATION FOR AFFILIATE ADMIN
              if (affiliateAdminData.user_id) {
                  try {
                    await supabase.from('admin_notifications').insert({
                      user_id: affiliateAdminData.user_id,
                      title: 'Affiliate Application Fee',
                      message: `A student from your network (${alunoData.full_name}) has paid the Application Fee for "${scholarship.title}" (${formattedAmount}).`,
                      type: 'payment',
                      link: '/admin/dashboard/affiliate-management',
                      metadata: {
                         student_id: alunoData.id,
                         student_name: alunoData.full_name,
                         amount: amountValue,
                         fee_type: 'application_fee',
                         payment_id: sessionId
                      }
                    });
                  } catch (affiliateInAppErr) {
                     console.error(`[NOTIFICAÇÃO AFFILIATE] Erro ao criar in-app notification para affiliate ${affiliateAdminData.email}:`, affiliateInAppErr);
                  }
              }
            }
            // 3.3. NOTIFICAÇÃO PARA TODOS OS ADMINS
            const adminNotificationPromises = admins.map(async (admin) => {
              const adminNotificationPayload = {
                tipo_notf: "Pagamento Stripe de application fee confirmado - Admin",
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone,
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                phone_aluno: alunoData.phone || "",
                email_seller: sellerData.email,
                nome_seller: sellerData.name,
                phone_seller: sellerPhone,
                email_affiliate_admin: affiliateAdminData.email,
                nome_affiliate_admin: affiliateAdminData.name,
                phone_affiliate_admin: affiliateAdminData.phone,
                nome_bolsa: scholarship.title,
                nome_universidade: universidade.name,
                o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
                payment_id: sessionId,
                fee_type: 'application',
                amount: amountValue,
                currency: currencyInfo.currency,
                currency_symbol: currencyInfo.symbol,
                formatted_amount: formattedAmount,
                seller_id: sellerData.user_id,
                referral_code: sellerData.referral_code,
                commission_rate: sellerData.commission_rate,
                payment_method: "stripe",
                notification_target: 'admin'
              };
              console.log(`📧 [verify-stripe-session-application-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA ADMIN ${admin.email}:`, adminNotificationPayload);
              const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'PostmanRuntime/7.36.3'
                },
                body: JSON.stringify(adminNotificationPayload)
              });
              if (adminNotificationResponse.ok) {
                const adminResult = await adminNotificationResponse.text();
                console.log(`📧 [verify-stripe-session-application-fee] Notificação para ADMIN ${admin.email} enviada com sucesso:`, adminResult);
              } else {
                const adminError = await adminNotificationResponse.text();
                console.error(`📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`, adminError);
              }

              // ✅ IN-APP NOTIFICATION FOR ADMIN
              if (admin.user_id) {
                try {
                  const { error: insertError } = await supabase.from('admin_notifications').insert({
                    user_id: admin.user_id,
                    title: 'New Application Fee Payment',
                    message: `Student ${alunoData.full_name} has paid the Application Fee (${formattedAmount}).`,
                    type: 'payment',
                    link: '/admin/dashboard/payments',
                    metadata: {
                       student_id: alunoData.id,
                       student_name: alunoData.full_name,
                       amount: amountValue,
                       fee_type: 'application',
                       payment_id: sessionId
                    }
                  });
                  
                  if (insertError) {
                    console.error(`[NOTIFICAÇÃO ADMIN] Erro ao criar in-app notification para admin ${admin.email}:`, insertError);
                  } else {
                    console.log(`[NOTIFICAÇÃO ADMIN] ✅ In-app notification criada com sucesso para admin ${admin.email} (ID: ${admin.user_id})`);
                  }
                } catch (adminInAppErr) {
                   console.error(`[NOTIFICAÇÃO ADMIN] Exceção ao criar in-app notification para admin ${admin.email}:`, adminInAppErr);
                }
              } else {
                 console.warn(`[NOTIFICAÇÃO ADMIN] ⚠️ Admin ${admin.email} não possui user_id, pulando in-app notification.`);
              }
            });
            await Promise.allSettled(adminNotificationPromises);
          } else {
            console.log(`📤 [verify-stripe-session-application-fee] Seller não encontrado para seller_referral_code: ${alunoData.seller_referral_code}`);
            
            // Notificação para TODOS OS ADMINS quando NÃO há seller
            const adminNotificationPromises = admins.map(async (admin) => {
              const adminNotificationPayload = {
                tipo_notf: "Pagamento Stripe de application fee confirmado - Admin",
                email_admin: admin.email,
                nome_admin: admin.full_name,
                phone_admin: admin.phone,
                email_aluno: alunoData.email,
                nome_aluno: alunoData.full_name,
                phone_aluno: alunoData.phone || "",
                nome_bolsa: scholarship.title,
                nome_universidade: universidade.name,
                email_universidade: emailUniversidade,
                o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}.`,
                payment_id: sessionId,
                fee_type: 'application',
                amount: amountValue,
                currency: currencyInfo.currency,
                currency_symbol: currencyInfo.symbol,
                formatted_amount: formattedAmount,
                payment_method: 'stripe',
                notification_target: 'admin'
              };
              console.log(`📧 [verify-stripe-session-application-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA ADMIN ${admin.email} (sem seller):`, adminNotificationPayload);
              const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'PostmanRuntime/7.36.3'
                },
                body: JSON.stringify(adminNotificationPayload)
              });
              if (adminNotificationResponse.ok) {
                const adminResult = await adminNotificationResponse.text();
                console.log(`📧 [verify-stripe-session-application-fee] Notificação para ADMIN ${admin.email} enviada com sucesso:`, adminResult);
              } else {
                const adminError = await adminNotificationResponse.text();
                console.error(`📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`, adminError);
              }

              // ✅ IN-APP NOTIFICATION FOR ADMIN
              if (admin.user_id) {
                try {
                  const { error: insertError } = await supabase.from('admin_notifications').insert({
                    user_id: admin.user_id,
                    title: 'New Application Fee Payment',
                    message: `Student ${alunoData.full_name} has paid the Application Fee (${formattedAmount}).`,
                    type: 'payment',
                    link: '/admin/dashboard/payments',
                    metadata: {
                       student_id: alunoData.id,
                       student_name: alunoData.full_name,
                       amount: amountValue,
                       fee_type: 'application',
                       payment_id: sessionId
                    }
                  });
                  
                  if (insertError) {
                    console.error(`[NOTIFICAÇÃO ADMIN] Erro ao criar in-app notification para admin ${admin.email}:`, insertError);
                  } else {
                    console.log(`[NOTIFICAÇÃO ADMIN] ✅ In-app notification criada com sucesso para admin ${admin.email} (ID: ${admin.user_id})`);
                  }
                } catch (adminInAppErr) {
                   console.error(`[NOTIFICAÇÃO ADMIN] Exceção ao criar in-app notification para admin ${admin.email}:`, adminInAppErr);
                }
              } else {
                 console.warn(`[NOTIFICAÇÃO ADMIN] ⚠️ Admin ${admin.email} não possui user_id, pulando in-app notification.`);
              }
            });
            await Promise.allSettled(adminNotificationPromises);
          }
        } else {
          console.log(`📤 [verify-stripe-session-application-fee] Nenhum seller_referral_code encontrado, não há seller para notificar`);
          
          // Notificação para TODOS OS ADMINS quando NÃO há seller_referral_code
          const adminNotificationPromises = admins.map(async (admin) => {
            const adminNotificationPayload = {
              tipo_notf: "Pagamento Stripe de application fee confirmado - Admin",
              email_admin: admin.email,
              nome_admin: admin.full_name,
              phone_admin: admin.phone,
              email_aluno: alunoData.email,
              nome_aluno: alunoData.full_name,
              phone_aluno: alunoData.phone || "",
              nome_bolsa: scholarship.title,
              nome_universidade: universidade.name,
              email_universidade: emailUniversidade,
              o_que_enviar: `Pagamento Stripe de application fee no valor de ${formattedAmount} do aluno ${alunoData.full_name} foi processado com sucesso para a bolsa "${scholarship.title}" da universidade ${universidade.name}.`,
              payment_id: sessionId,
              fee_type: 'application',
              amount: amountValue,
              currency: currencyInfo.currency,
              currency_symbol: currencyInfo.symbol,
              formatted_amount: formattedAmount,
              payment_method: 'stripe',
              notification_target: 'admin'
            };
            console.log(`📧 [verify-stripe-session-application-fee] ✅ ENVIANDO NOTIFICAÇÃO PARA ADMIN ${admin.email} (sem seller_referral_code):`, adminNotificationPayload);
            const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PostmanRuntime/7.36.3'
              },
              body: JSON.stringify(adminNotificationPayload)
            });
            if (adminNotificationResponse.ok) {
              const adminResult = await adminNotificationResponse.text();
              console.log(`📧 [verify-stripe-session-application-fee] Notificação para ADMIN ${admin.email} enviada com sucesso:`, adminResult);
            } else {
              const adminError = await adminNotificationResponse.text();
              console.error(`📧 [verify-stripe-session-application-fee] Erro ao enviar notificação para ADMIN ${admin.email}:`, adminError);
            }

            // ✅ IN-APP NOTIFICATION FOR ADMIN
            if (admin.user_id) {
                try {
                  const { error: insertError } = await supabase.from('admin_notifications').insert({
                    user_id: admin.user_id,
                    title: 'New Application Fee Payment',
                    message: `Student ${alunoData.full_name} has paid the Application Fee (${formattedAmount}).`,
                    type: 'payment',
                    link: '/admin/dashboard/payments',
                    metadata: {
                       student_id: alunoData.id,
                       student_name: alunoData.full_name,
                       amount: amountValue,
                       fee_type: 'application',
                       payment_id: sessionId
                    }
                  });
                  
                  if (insertError) {
                    console.error(`[NOTIFICAÇÃO ADMIN] Erro ao criar in-app notification para admin ${admin.email}:`, insertError);
                  } else {
                    console.log(`[NOTIFICAÇÃO ADMIN] ✅ In-app notification criada com sucesso para admin ${admin.email} (ID: ${admin.user_id})`);
                  }
                } catch (adminInAppErr) {
                   console.error(`[NOTIFICAÇÃO ADMIN] Exceção ao criar in-app notification para admin ${admin.email}:`, adminInAppErr);
                }
            } else {
                 console.warn(`[NOTIFICAÇÃO ADMIN] ⚠️ Admin ${admin.email} não possui user_id, pulando in-app notification.`);
            }
          });
          await Promise.allSettled(adminNotificationPromises);
        }
      } catch (notifErr) {
        console.error('[NOTIFICAÇÃO] Erro ao notificar application fee via n8n:', notifErr);
      }
      }
      
      // Criar log DEPOIS das notificações para marcar que o processamento foi concluído
      try {
        const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('user_id', userId).single();
        if (userProfile) {
          await supabase.rpc('log_student_action', {
            p_student_id: userProfile.id,
            p_action_type: 'fee_payment',
            p_action_description: `Application Fee paid via Stripe (${sessionId}) - Notifications sent`,
            p_performed_by: userId,
            p_performed_by_type: 'student',
            p_metadata: {
              fee_type: 'application',
              payment_method: 'stripe',
              amount: session.amount_total ? session.amount_total / 100 : 0,
              session_id: sessionId,
              application_id: applicationId,
              notifications_sent: true
            }
          });
          console.log('[DUPLICAÇÃO] Log de conclusão criado após envio de notificações');
        }
      } catch (logError) {
        console.error('Failed to log payment completion:', logError);
      }
      // --- FIM DAS NOTIFICAÇÕES ---
      
      // Para PIX, retornar resposta especial que força redirecionamento
      if (paymentMethod === 'pix') {
        console.log('[PIX] Forçando redirecionamento para PIX...');
        return corsResponse({
          status: 'complete',
          message: 'PIX payment verified and processed successfully.',
          payment_method: 'pix',
          redirect_required: true,
          redirect_url: 'http://localhost:5173/student/dashboard/application-fee-success'
        }, 200);
      }
      
      return corsResponse({
        status: 'complete',
        message: 'Session verified and processed successfully.',
        applicationId: applicationId,
        studentProcessType: application.student_process_type || session.metadata?.student_process_type
      }, 200);
    } else {
      console.log('Session not paid or complete.');
      return corsResponse({
        message: 'Session not ready.',
        status: session.status
      }, 202);
    }
  } catch (error) {
    console.error(`--- CRITICAL ERROR in verify-stripe-session-application-fee ---:`, error.message);
    return corsResponse({
      error: 'An unexpected error occurred.',
      details: error.message
    }, 500);
  }
});
