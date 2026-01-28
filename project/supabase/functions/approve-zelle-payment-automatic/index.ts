import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'

// @ts-ignore
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with Service Role Key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { user_id, fee_type_global, temp_payment_id, scholarship_ids } = await req.json()

    // Função para mapear fee_type_global para valores aceitos pela constraint
    // Constraint aceita: 'selection_process', 'i20_control_fee', 'application_fee', 'scholarship_fee'
    const mapFeeTypeGlobal = (feeType: string): string => {
      if (!feeType) return feeType;
      
      // Normalizar removendo hífens e underscores extras
      const normalized = feeType.replace(/-/g, '').replace(/_+/g, '_').toLowerCase();
      
      // Mapear valores comuns para valores aceitos pela constraint
      const mapping: { [key: string]: string } = {
        'i20_control': 'i20_control_fee',
        'i20control': 'i20_control_fee',
        'i20controlfee': 'i20_control_fee',
        'selection_process': 'selection_process',
        'selectionprocess': 'selection_process',
        'application_fee': 'application_fee',
        'applicationfee': 'application_fee',
        'scholarship_fee': 'scholarship_fee',
        'scholarshipfee': 'scholarship_fee'
      };
      
      return mapping[normalized] || normalized;
    };

    // Normalizar e mapear fee_type_global
    const normalizedFeeTypeGlobal = mapFeeTypeGlobal(fee_type_global);

    console.log('🔍 [approve-zelle-payment-automatic] Parâmetros recebidos:', {
      user_id,
      fee_type_global,
      normalizedFeeTypeGlobal,
      temp_payment_id,
      scholarship_ids
    })

    // Validar parâmetros obrigatórios
    if (!user_id || !fee_type_global) {
      throw new Error('Required parameters: user_id, fee_type_global')
    }

    // 1. Buscar ou criar o pagamento na tabela zelle_payments
    console.log('📝 [approve-zelle-payment-automatic] Buscando pagamento existente...')
    
    let paymentId: string;
    let paymentAmount: number = 0;
    
    // Primeiro, tentar buscar um pagamento pendente do usuário
    // Buscar tanto pelo valor normalizado quanto pelo original (para compatibilidade)
    const searchValues = [normalizedFeeTypeGlobal];
    if (fee_type_global && fee_type_global !== normalizedFeeTypeGlobal) {
      searchValues.push(fee_type_global);
    }
    // Também buscar por valores alternativos comuns (ex: i20_control vs i20_control_fee)
    if (normalizedFeeTypeGlobal === 'i20_control_fee') {
      searchValues.push('i20_control');
    } else if (fee_type_global === 'i20_control') {
      searchValues.push('i20_control_fee');
    }
    
    const { data: existingPayment, error: searchError } = await supabaseClient
      .from('zelle_payments')
      .select('id, status, amount, fee_type_global')
      .eq('user_id', user_id)
      .in('fee_type_global', searchValues.length > 0 ? searchValues : [normalizedFeeTypeGlobal])
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (searchError) {
      console.error('❌ [approve-zelle-payment-automatic] Erro ao buscar pagamento existente:', searchError)
      throw searchError
    }

    if (existingPayment) {
      // Pagamento existente encontrado
      paymentId = existingPayment.id;
      paymentAmount = existingPayment.amount || 0;
      console.log('✅ [approve-zelle-payment-automatic] Pagamento existente encontrado:', paymentId, 'Amount:', paymentAmount)
      
      // Atualizar o status do pagamento para aprovado e garantir fee_type_global correto
      const { error: paymentError } = await supabaseClient
        .from('zelle_payments')
        .update({
          status: 'approved',
          fee_type_global: normalizedFeeTypeGlobal, // Garantir que está com o valor correto
          admin_approved_at: new Date().toISOString(),
          admin_notes: 'Automatically approved by n8n system'
        })
        .eq('id', paymentId)

      if (paymentError) {
        console.error('❌ [approve-zelle-payment-automatic] Erro ao atualizar pagamento:', paymentError)
        throw paymentError
      }
    } else {
      // Criar novo pagamento
      console.log('📝 [approve-zelle-payment-automatic] Criando novo pagamento...')
      
      const { data: newPayment, error: createError } = await supabaseClient
        .from('zelle_payments')
        .insert({
          user_id: user_id,
          fee_type_global: normalizedFeeTypeGlobal,
          status: 'approved',
          admin_approved_at: new Date().toISOString(),
          admin_notes: 'Automatically approved by n8n system',
          amount: 0, // Valor será preenchido se necessário
          created_at: new Date().toISOString()
        })
        .select('id, amount')
        .single()

      if (createError) {
        console.error('❌ [approve-zelle-payment-automatic] Erro ao criar pagamento:', createError)
        throw createError
      }

      paymentId = newPayment.id;
      paymentAmount = newPayment.amount || 0;
      console.log('✅ [approve-zelle-payment-automatic] Novo pagamento criado:', paymentId, 'Amount:', paymentAmount)
    }

    console.log('✅ [approve-zelle-payment-automatic] Status do pagamento atualizado para approved')

    // 2. MARCAR COMO PAGO NAS TABELAS CORRETAS baseado no fee_type_global
    console.log('💰 [approve-zelle-payment-automatic] Marcando como pago nas tabelas corretas...')
    console.log('🔍 [approve-zelle-payment-automatic] fee_type_global:', normalizedFeeTypeGlobal)

    if (normalizedFeeTypeGlobal === 'selection_process') {
      console.log('🎯 [approve-zelle-payment-automatic] Atualizando has_paid_selection_process_fee...')
      
      const { data: updateData, error: profileError } = await supabaseClient
        .from('user_profiles')
        .update({ 
          has_paid_selection_process_fee: true,
          selection_process_fee_payment_method: 'zelle',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .select()

      if (profileError) {
        console.error('❌ [approve-zelle-payment-automatic] Erro ao marcar selection_process_fee:', profileError)
        throw profileError
      }

      console.log('✅ [approve-zelle-payment-automatic] has_paid_selection_process_fee marcado como true')
      console.log('🔍 [approve-zelle-payment-automatic] Dados atualizados:', updateData)

      // Registrar pagamento na tabela individual_fee_payments
      let individualFeePaymentId = null;
      try {
        const { data: feePaymentData, error: feePaymentError } = await supabaseClient.rpc('insert_individual_fee_payment', {
          p_user_id: user_id,
          p_fee_type: 'selection_process',
          p_amount: paymentAmount,
          p_payment_date: new Date().toISOString(),
          p_payment_method: 'zelle',
          p_payment_intent_id: null,
          p_stripe_charge_id: null,
          p_zelle_payment_id: paymentId
        });

        if (feePaymentError) {
          console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', feePaymentError);
        } else {
          console.log('[Individual Fee Payment] Selection process fee recorded successfully:', feePaymentData);
          individualFeePaymentId = feePaymentData?.id || null;
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
      }

      // Registrar uso do cupom promocional se houver
      try {
        const { data: zellePaymentData, error: zellePaymentError } = await supabaseClient
          .from('zelle_payments')
          .select('metadata, amount')
          .eq('id', paymentId)
          .single();
        
        // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)
      } catch (couponUsageException) {
        // Mantido para compatibilidade, mas não faz mais nada
      }

      // Log the payment action
      try {
        await supabaseClient.rpc('log_student_action', {
          p_student_id: updateData[0]?.id,
          p_action_type: 'fee_payment',
          p_action_description: `Selection Process Fee paid via Zelle (${temp_payment_id})`,
          p_performed_by: user_id,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'selection_process',
            payment_method: 'zelle',
            temp_payment_id: temp_payment_id,
            payment_id: paymentId
          }
        });
      } catch (logError) {
        console.error('Failed to log payment action:', logError);
      }

      // --- MATRICULA REWARDS - ADICIONAR COINS ---
      try {
        console.log('🎁 [approve-zelle-payment-automatic] Processando Matricula Rewards para Selection Process Fee...')
        
        // Buscar se o usuário usou algum código de referência
        const { data: usedCode, error: codeError } = await supabaseClient
          .from('used_referral_codes')
          .select('referrer_id, affiliate_code')
          .eq('user_id', user_id)
          .single();

        if (!codeError && usedCode) {
          console.log('🎁 [approve-zelle-payment-automatic] Usuário usou código de referência, adicionando 180 coins para:', usedCode.referrer_id);
          
          // Buscar nome do usuário que pagou
          const { data: referredUserProfile } = await supabaseClient
            .from('user_profiles')
            .select('full_name, email')
            .eq('user_id', user_id)
            .single();
          
          const referredDisplayName = referredUserProfile?.full_name || referredUserProfile?.email || user_id;
          
          // Adicionar 180 coins para o usuário que fez a indicação
          const { data: coinsResult, error: coinsError } = await supabaseClient
            .rpc('add_coins_to_user_matricula', {
              user_id_param: usedCode.referrer_id,
              coins_to_add: 180,
              reason: `Referral reward: Selection Process Fee paid by ${referredDisplayName}`
            });

          if (coinsError) {
            console.error('❌ [approve-zelle-payment-automatic] Erro ao adicionar coins:', coinsError);
          } else {
            console.log('✅ [approve-zelle-payment-automatic] 180 coins adicionados com sucesso:', coinsResult);
            
            // --- NOTIFICAÇÃO DE RECOMPENSA PARA O ALUNO (PADRINHO) ---
            try {
              console.log('📤 [approve-zelle-payment-automatic] Enviando notificação de recompensa para o padrinho...');
              
              // Buscar dados do padrinho (referrer)
              const { data: referrerProfile } = await supabaseClient
                .from('user_profiles')
                .select('full_name, email')
                .eq('user_id', usedCode.referrer_id)
                .single();
              
              if (referrerProfile?.email) {
                const rewardPayload = {
                  tipo_notf: "Recompensa de MatriculaCoins por Indicacao",
                  email_aluno: referrerProfile.email,
                  nome_aluno: referrerProfile.full_name || "Aluno",
                  referred_student_name: referredDisplayName,
                  referred_student_email: referredUserProfile?.email || "",
                  payment_method: "Zelle",
                  fee_type: "Selection Process Fee",
                  reward_type: "MatriculaCoins",
                  o_que_enviar: `Great news! Your friend ${referredDisplayName} has completed their enrollment process. 180 MatriculaCoins have been added to your account!`
                };

                console.log('📤 [approve-zelle-payment-automatic] Payload de recompensa:', rewardPayload);

                await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(rewardPayload),
                });
                console.log('✅ [approve-zelle-payment-automatic] Notificação de recompensa enviada com sucesso!');
              }
            } catch (rewardNotifError) {
              console.error('❌ [approve-zelle-payment-automatic] Erro ao enviar notificação de recompensa:', rewardNotifError);
            }
          }
        } else {
          console.log('ℹ️ [approve-zelle-payment-automatic] Usuário não usou código de referência, não há coins para adicionar');
        }
      } catch (rewardsError) {
        console.error('❌ [approve-zelle-payment-automatic] Erro ao processar Matricula Rewards:', rewardsError);
      }
      // --- FIM MATRICULA REWARDS ---

    } else if (normalizedFeeTypeGlobal === 'i20_control_fee' || normalizedFeeTypeGlobal === 'i20_control') {
      console.log('🎯 [approve-zelle-payment-automatic] Atualizando has_paid_i20_control_fee...')
      
      const { data: updateData, error: profileError } = await supabaseClient
        .from('user_profiles')
        .update({ 
          has_paid_i20_control_fee: true,
          i20_control_fee_payment_method: 'zelle',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .select()

      if (profileError) {
        console.error('❌ [approve-zelle-payment-automatic] Erro ao marcar i20_control_fee:', profileError)
        throw profileError
      }

      console.log('✅ [approve-zelle-payment-automatic] has_paid_i20_control_fee marcado como true')
      console.log('🔍 [approve-zelle-payment-automatic] Dados atualizados:', updateData)

      // Registrar pagamento na tabela individual_fee_payments
      let individualFeePaymentId = null;
      try {
        const { data: feePaymentData, error: feePaymentError } = await supabaseClient.rpc('insert_individual_fee_payment', {
          p_user_id: user_id,
          p_fee_type: 'i20_control',
          p_amount: paymentAmount,
          p_payment_date: new Date().toISOString(),
          p_payment_method: 'zelle',
          p_payment_intent_id: null,
          p_stripe_charge_id: null,
          p_zelle_payment_id: paymentId
        });

        if (feePaymentError) {
          console.warn('[Individual Fee Payment] Warning: Could not record fee payment:', feePaymentError);
        } else {
          console.log('[Individual Fee Payment] I20 control fee recorded successfully:', feePaymentData);
          individualFeePaymentId = feePaymentData?.id || null;
        }
      } catch (recordError) {
        console.warn('[Individual Fee Payment] Warning: Failed to record individual fee payment:', recordError);
      }

      // Registrar uso do cupom promocional se houver
      try {
        const { data: zellePaymentData, error: zellePaymentError } = await supabaseClient
          .from('zelle_payments')
          .select('metadata, amount')
          .eq('id', paymentId)
          .single();
        
        // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)
      } catch (couponUsageException) {
        // Mantido para compatibilidade, mas não faz mais nada
      }

      // Log the payment action
      try {
        await supabaseClient.rpc('log_student_action', {
          p_student_id: updateData[0]?.id,
          p_action_type: 'fee_payment',
          p_action_description: `I-20 Control Fee paid via Zelle (${temp_payment_id})`,
          p_performed_by: user_id,
          p_performed_by_type: 'student',
          p_metadata: {
            fee_type: 'i20_control',
            payment_method: 'zelle',
            temp_payment_id: temp_payment_id,
            payment_id: paymentId
          }
        });
      } catch (logError) {
        console.error('Failed to log payment action:', logError);
      }

    } else if (normalizedFeeTypeGlobal === 'application_fee' || normalizedFeeTypeGlobal === 'scholarship_fee') {
      console.log('🎯 [approve-zelle-payment-automatic] Atualizando scholarship_applications...')
      
      if (!scholarship_ids) {
        throw new Error('scholarship_ids is required for application_fee and scholarship_fee')
      }

      // Converter scholarship_ids para array se for string
      const scholarshipIdsArray = Array.isArray(scholarship_ids) 
        ? scholarship_ids 
        : scholarship_ids.split(',').map((id: string) => id.trim())

      console.log('🔍 [approve-zelle-payment-automatic] scholarship_ids processados:', scholarshipIdsArray)

      // Atualizar cada aplicação específica
      for (const scholarshipId of scholarshipIdsArray) {
        // Primeiro, buscar o id correto do user_profiles
        const { data: userProfile, error: userError } = await supabaseClient
          .from('user_profiles')
          .select('id')
          .eq('user_id', user_id)
          .single()

        if (userError || !userProfile) {
          console.error('❌ [approve-zelle-payment-automatic] Erro ao buscar user_profile:', userError)
          throw userError
        }

        const correctUserId = userProfile.id
        console.log(`🔍 [approve-zelle-payment-automatic] user_id correto encontrado: ${correctUserId}`)

        // Buscar a scholarship_application existente para o usuário específico
        const { data: existingApp, error: searchError } = await supabaseClient
          .from('scholarship_applications')
          .select('id, student_id')
          .eq('scholarship_id', scholarshipId)
          .eq('student_id', correctUserId)
          .single()

        if (searchError || !existingApp) {
          console.log(`⚠️ [approve-zelle-payment-automatic] Nenhuma scholarship_application encontrada para scholarship_id: ${scholarshipId} e user_id: ${user_id}`)
          console.log(`🔧 [approve-zelle-payment-automatic] Criando nova scholarship_application...`)
          
          // CRÍTICO: Criar individual_fee_payments ANTES de criar a aplicação marcando como pago
          const normalizedFeeType = normalizedFeeTypeGlobal === 'application_fee' ? 'application' : 'scholarship';
          
          console.log(`📝 [approve-zelle-payment-automatic] Criando individual_fee_payments ANTES de criar scholarship_application...`)
          console.log(`🔍 [approve-zelle-payment-automatic] fee_type normalizado: ${normalizedFeeType}, amount: ${paymentAmount}`)
          
          try {
            const { data: feePaymentData, error: feePaymentError } = await supabaseClient.rpc('insert_individual_fee_payment', {
              p_user_id: user_id,
              p_fee_type: normalizedFeeType,
              p_amount: paymentAmount,
              p_payment_date: new Date().toISOString(),
              p_payment_method: 'zelle',
              p_payment_intent_id: null,
              p_stripe_charge_id: null,
              p_zelle_payment_id: paymentId
            });

            if (feePaymentError) {
              console.error(`❌ [approve-zelle-payment-automatic] Erro ao criar individual_fee_payments:`, feePaymentError)
              throw new Error(`Failed to create individual_fee_payment: ${feePaymentError.message}`)
            }

            console.log(`✅ [approve-zelle-payment-automatic] individual_fee_payments criado com sucesso:`, feePaymentData)
          } catch (feePaymentException) {
            console.error(`❌ [approve-zelle-payment-automatic] Exceção ao criar individual_fee_payments:`, feePaymentException)
            throw feePaymentException // Não criar aplicação como paga se o registro individual falhar
          }

          // APENAS DEPOIS de criar o registro individual, criar a aplicação marcando como pago
          const { data: newApp, error: createError } = await supabaseClient
            .from('scholarship_applications')
            .insert({
              student_id: correctUserId,
              scholarship_id: scholarshipId,
              [normalizedFeeTypeGlobal === 'application_fee' ? 'is_application_fee_paid' : 'is_scholarship_fee_paid']: true,
              [normalizedFeeTypeGlobal === 'application_fee' ? 'application_fee_payment_method' : 'scholarship_fee_payment_method']: 'zelle',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single()

          if (createError) {
            console.error('❌ [approve-zelle-payment-automatic] Erro ao criar scholarship_application:', createError)
            console.error('❌ [approve-zelle-payment-automatic] Detalhes do erro:', createError.message)
            throw createError
          }

          console.log(`✅ [approve-zelle-payment-automatic] Nova scholarship_application criada: ${newApp.id}`)
          
          // --- NOTIFICAÇÃO PARA UNIVERSIDADE ---
          try {
            console.log(`📤 [approve-zelle-payment-automatic] Enviando notificação de ${normalizedFeeTypeGlobal} para universidade...`);
            
            const notificationEndpoint = normalizedFeeTypeGlobal === 'application_fee' 
              ? 'notify-university-application-fee-paid'
              : 'notify-university-scholarship-fee-paid';
            
            const notificationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${notificationEndpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                application_id: newApp.id,
                user_id: user_id,
                scholarship_id: scholarshipId
              }),
            });

            if (notificationResponse.ok) {
              const notificationResult = await notificationResponse.json();
              console.log(`✅ [approve-zelle-payment-automatic] Notificação de ${normalizedFeeTypeGlobal} enviada com sucesso:`, notificationResult);
            } else {
              const errorData = await notificationResponse.json();
              console.error(`❌ [approve-zelle-payment-automatic] Erro ao enviar notificação de ${normalizedFeeTypeGlobal}:`, errorData);
            }
          } catch (notificationError) {
            console.error(`❌ [approve-zelle-payment-automatic] Erro ao notificar universidade sobre ${normalizedFeeTypeGlobal}:`, notificationError);
          }
        } else {
          // CRÍTICO: Criar individual_fee_payments ANTES de marcar como pago
          // Isso garante que se o insert falhar, a aplicação não fica marcada como paga
          const normalizedFeeType = normalizedFeeTypeGlobal === 'application_fee' ? 'application' : 'scholarship';
          
          console.log(`📝 [approve-zelle-payment-automatic] Criando individual_fee_payments ANTES de marcar como pago...`)
          console.log(`🔍 [approve-zelle-payment-automatic] fee_type normalizado: ${normalizedFeeType}, amount: ${paymentAmount}`)
          
          let individualFeePaymentId = null;
          try {
            const { data: feePaymentData, error: feePaymentError } = await supabaseClient.rpc('insert_individual_fee_payment', {
              p_user_id: user_id,
              p_fee_type: normalizedFeeType,
              p_amount: paymentAmount,
              p_payment_date: new Date().toISOString(),
              p_payment_method: 'zelle',
              p_payment_intent_id: null,
              p_stripe_charge_id: null,
              p_zelle_payment_id: paymentId
            });

            if (feePaymentError) {
              console.error(`❌ [approve-zelle-payment-automatic] Erro ao criar individual_fee_payments:`, feePaymentError)
              throw new Error(`Failed to create individual_fee_payment: ${feePaymentError.message}`)
            }

            console.log(`✅ [approve-zelle-payment-automatic] individual_fee_payments criado com sucesso:`, feePaymentData)
            individualFeePaymentId = feePaymentData?.id || null;
          } catch (feePaymentException) {
            console.error(`❌ [approve-zelle-payment-automatic] Exceção ao criar individual_fee_payments:`, feePaymentException)
            throw feePaymentException // Não marcar como pago se o registro individual falhar
          }

          // Registrar uso do cupom promocional se houver
          try {
            // Buscar dados do pagamento Zelle para obter informações do cupom do metadata
            const { data: zellePaymentData, error: zellePaymentError } = await supabaseClient
              .from('zelle_payments')
              .select('metadata, amount')
              .eq('id', paymentId)
              .single();
            
            // ✅ REMOVIDO: Registro de uso do cupom promocional - agora é feito apenas na validação (record-promotional-coupon-validation)
          } catch (couponUsageException) {
            // Mantido para compatibilidade, mas não faz mais nada
          }

          // APENAS DEPOIS de criar o registro individual, marcar como pago
          const { data: updateData, error: appError } = await supabaseClient
            .from('scholarship_applications')
            .update({ 
              [normalizedFeeTypeGlobal === 'application_fee' ? 'is_application_fee_paid' : 'is_scholarship_fee_paid']: true,
              [normalizedFeeTypeGlobal === 'application_fee' ? 'application_fee_payment_method' : 'scholarship_fee_payment_method']: 'zelle',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingApp.id)
            .select()

          if (appError) {
            console.error(`❌ [approve-zelle-payment-automatic] Erro ao marcar scholarship_applications para scholarship_id ${scholarshipId}:`, appError)
            throw appError
          }

          console.log(`✅ [approve-zelle-payment-automatic] ${normalizedFeeTypeGlobal} marcado como true para scholarship_id: ${scholarshipId} (app_id: ${existingApp.id})`)

          // Log the payment action
          try {
            await supabaseClient.rpc('log_student_action', {
              p_student_id: existingApp.student_id,
              p_action_type: 'fee_payment',
              p_action_description: `${normalizedFeeTypeGlobal.replace('_', ' ')} paid via Zelle (${temp_payment_id})`,
              p_performed_by: user_id,
              p_performed_by_type: 'student',
              p_metadata: {
                fee_type: normalizedFeeTypeGlobal,
                payment_method: 'zelle',
                temp_payment_id: temp_payment_id,
                payment_id: paymentId,
                application_id: existingApp.id,
                scholarship_id: scholarshipId
              }
            });
          } catch (logError) {
            console.error('Failed to log payment action:', logError);
          }
          console.log('🔍 [approve-zelle-payment-automatic] Dados atualizados:', updateData)
          
          // --- NOTIFICAÇÃO PARA UNIVERSIDADE ---
          try {
            console.log(`📤 [approve-zelle-payment-automatic] Enviando notificação de ${normalizedFeeTypeGlobal} para universidade...`);
            
            const notificationEndpoint = normalizedFeeTypeGlobal === 'application_fee' 
              ? 'notify-university-application-fee-paid'
              : 'notify-university-scholarship-fee-paid';
            
            const notificationResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${notificationEndpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify({
                application_id: existingApp.id,
                user_id: user_id,
                scholarship_id: scholarshipId
              }),
            });

            if (notificationResponse.ok) {
              const notificationResult = await notificationResponse.json();
              console.log(`✅ [approve-zelle-payment-automatic] Notificação de ${normalizedFeeTypeGlobal} enviada com sucesso:`, notificationResult);
            } else {
              const errorData = await notificationResponse.json();
              console.error(`❌ [approve-zelle-payment-automatic] Erro ao enviar notificação de ${normalizedFeeTypeGlobal}:`, errorData);
            }
          } catch (notificationError) {
            console.error(`❌ [approve-zelle-payment-automatic] Erro ao notificar universidade sobre ${normalizedFeeTypeGlobal}:`, notificationError);
          }
        }
      }
    }

    // 3. ENVIAR WEBHOOK PARA NOTIFICAR O ALUNO SOBRE APROVAÇÃO
    console.log('📤 [approve-zelle-payment-automatic] Enviando notificação de aprovação para o aluno...')
    
    try {
      // Buscar dados do usuário para o webhook
      const { data: userProfile, error: userError } = await supabaseClient
        .from('user_profiles')
        .select('full_name, email, phone')
        .eq('user_id', user_id)
        .single()

      if (userError) {
        console.error('❌ [approve-zelle-payment-automatic] Erro ao buscar dados do usuário:', userError)
        // Continuar mesmo com erro, pois a aprovação já foi feita
      } else {
        // Payload para notificar o aluno sobre a aprovação
        const approvalPayload = {
          tipo_notf: "Payment automatically approved",
          email_aluno: userProfile.email,
          nome_aluno: userProfile.full_name,
          email_universidade: "",
          o_que_enviar: `Your ${normalizedFeeTypeGlobal} payment has been automatically approved by the system!`,
          payment_id: paymentId,
          fee_type: normalizedFeeTypeGlobal,
          approved_by: "Automatic System"
        }

        console.log('📤 [approve-zelle-payment-automatic] Payload de aprovação:', approvalPayload)

        const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(approvalPayload),
        })

        if (webhookResponse.ok) {
          console.log('✅ [approve-zelle-payment-automatic] Notificação de aprovação enviada com sucesso!')
        } else {
          console.warn('⚠️ [approve-zelle-payment-automatic] Erro ao enviar notificação de aprovação:', webhookResponse.status)
        }
      }
    } catch (webhookError) {
      console.error('❌ [approve-zelle-payment-automatic] Erro ao enviar webhook de aprovação:', webhookError)
      // Não falhar a operação por causa do webhook
    }

    // --- NOTIFICAÇÕES PARA ADMIN, AFFILIATE ADMIN E SELLER ---
    try {
      console.log(`📤 [approve-zelle-payment-automatic] Buscando informações do seller e affiliate admin...`)
      
      // Buscar informações do seller relacionado ao pagamento
      const { data: sellerData, error: sellerError } = await supabaseClient
        .from('sellers')
        .select(`
          id,
          user_id,
          name,
          email,
          referral_code,
          commission_rate,
          affiliate_admin_id,
          affiliate_admin:affiliate_admins!sellers_affiliate_admin_id_fkey(
            user_id,
            user_profiles!affiliate_admins_user_id_fkey(full_name, email)
          )
        `)
        .eq('user_id', user_id)
        .single()

      if (sellerData && !sellerError) {
        console.log(`📤 [approve-zelle-payment-automatic] Seller encontrado:`, sellerData)

        const { data: sellerProfile, error: sellerProfileError } = await supabaseClient.from('user_profiles').select('phone').eq('user_id', sellerData.user_id).single();
        const sellerPhone = sellerProfile?.phone;

        // Helper logic to safely extract Affiliate Admin data (handling array/object ambiguity)
        const affiliateAdminRaw = Array.isArray(sellerData.affiliate_admin) 
          ? sellerData.affiliate_admin[0] 
          : (sellerData.affiliate_admin as any);
        
        const affiliateUserInfo = affiliateAdminRaw?.user_profiles 
          ? (Array.isArray(affiliateAdminRaw.user_profiles) 
              ? affiliateAdminRaw.user_profiles[0] 
              : affiliateAdminRaw.user_profiles)
          : null;
            
        const affiliateAdminEmail = affiliateUserInfo?.email || "";
        const affiliateAdminName = affiliateUserInfo?.full_name || "Affiliate Admin";
        const affiliateAdminId = affiliateAdminRaw?.user_id;
        
        // Define userProfile here to ensure it's available in all scopes if previously defined in if blocks
        let userProfileData = null;
        if (normalizedFeeTypeGlobal === 'application_fee' || normalizedFeeTypeGlobal === 'scholarship_fee') {
             // It was processed in the loop above, but we need fresh data for notifications if it wasn't fetched in step 3
             const { data: userData } = await supabaseClient.from('user_profiles').select('full_name, email, phone').eq('user_id', user_id).single();
             userProfileData = userData;
        } else {
             // Try to use the one from step 3 if available
             const { data: userData } = await supabaseClient.from('user_profiles').select('full_name, email, phone').eq('user_id', user_id).single();
             userProfileData = userData;
        }

        // NOTIFICAÇÃO PARA ADMIN
        try {
          const adminNotificationPayload = {
            tipo_notf: "Pagamento de aluno aprovado automaticamente",
            email_admin: "admin@matriculausa.com",
            nome_admin: "Admin MatriculaUSA",
            email_aluno: userProfileData?.email || "",
            nome_aluno: userProfileData?.full_name || "Aluno",
            email_seller: sellerData.email,
            nome_seller: sellerData.name,
            email_affiliate_admin: affiliateAdminEmail,
            nome_affiliate_admin: affiliateAdminName,
            o_que_enviar: `Pagamento de ${normalizedFeeTypeGlobal} no valor de ${paymentAmount} do aluno ${userProfileData?.full_name || "Aluno"} foi aprovado automaticamente pelo sistema. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
            payment_id: paymentId,
            fee_type: normalizedFeeTypeGlobal,
            amount: paymentAmount,
            seller_id: sellerData.user_id,
            referral_code: sellerData.referral_code,
            commission_rate: sellerData.commission_rate,
            approved_by: "Automatic System"
          }

          console.log('📧 [approve-zelle-payment-automatic] Enviando notificação para admin:', adminNotificationPayload)

          const adminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(adminNotificationPayload),
          })

          if (adminNotificationResponse.ok) {
            console.log('✅ [approve-zelle-payment-automatic] Notificação para admin enviada com sucesso!')
          } else {
            console.warn('⚠️ [approve-zelle-payment-automatic] Erro ao enviar notificação para admin:', adminNotificationResponse.status)
          }
        } catch (adminNotificationError) {
          console.error('❌ [approve-zelle-payment-automatic] Erro ao enviar notificação para admin:', adminNotificationError)
        }

        // NOTIFICAÇÃO PARA AFFILIATE ADMIN
        if (affiliateAdminEmail) {
          try {
            // Buscar telefone do affiliate admin
            let affiliateAdminPhone = "";
            if (affiliateAdminId) {
                const { data: affiliateAdminProfile } = await supabaseClient.from('user_profiles').select('phone').eq('user_id', affiliateAdminId).single();
                affiliateAdminPhone = affiliateAdminProfile?.phone || "";
            }
            
            const affiliateAdminNotificationPayload = {
              tipo_notf: "Pagamento de aluno do seu seller aprovado automaticamente",
              email_affiliate_admin: affiliateAdminEmail,
              nome_affiliate_admin: affiliateAdminName,
              phone_affiliate_admin: affiliateAdminPhone,
              email_aluno: userProfileData?.email || "",
              nome_aluno: userProfileData?.full_name || "Aluno",
              phone_aluno: userProfileData?.phone || "",
              email_seller: sellerData.email,
              nome_seller: sellerData.name,
              phone_seller: sellerPhone || "",
              o_que_enviar: `Pagamento de ${normalizedFeeTypeGlobal} no valor de ${paymentAmount} do aluno ${userProfileData?.full_name || "Aluno"} foi aprovado automaticamente pelo sistema. Seller responsável: ${sellerData.name} (${sellerData.referral_code})`,
              payment_id: paymentId,
              fee_type: normalizedFeeTypeGlobal,
              amount: paymentAmount,
              seller_id: sellerData.user_id,
              referral_code: sellerData.referral_code,
              commission_rate: sellerData.commission_rate,
              approved_by: "Automatic System"
            }

            console.log('📧 [approve-zelle-payment-automatic] Enviando notificação para affiliate admin:', affiliateAdminNotificationPayload)

            const affiliateAdminNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(affiliateAdminNotificationPayload),
            })

            if (affiliateAdminNotificationResponse.ok) {
              console.log('✅ [approve-zelle-payment-automatic] Notificação para affiliate admin enviada com sucesso!')
            } else {
              console.warn('⚠️ [approve-zelle-payment-automatic] Erro ao enviar notificação para affiliate admin:', affiliateAdminNotificationResponse.status)
            }
          } catch (affiliateAdminNotificationError) {
            console.error('❌ [approve-zelle-payment-automatic] Erro ao enviar notificação para affiliate admin:', affiliateAdminNotificationError)
          }
        }

        // NOTIFICAÇÃO PARA SELLER
        try {
          const sellerNotificationPayload = {
            tipo_notf: "Pagamento do seu aluno aprovado automaticamente",
            email_seller: sellerData.email,
            nome_seller: sellerData.name,
            phone_seller: sellerPhone || "",
            email_aluno: userProfileData?.email || "",
            nome_aluno: userProfileData?.full_name || "Aluno",
            phone_aluno: userProfileData?.phone || "",
            o_que_enviar: `Parabéns! O pagamento de ${normalizedFeeTypeGlobal} no valor de ${paymentAmount} do seu aluno ${userProfileData?.full_name || "Aluno"} foi aprovado automaticamente pelo sistema. Você ganhará comissão sobre este pagamento!`,
            payment_id: paymentId,
            fee_type: normalizedFeeTypeGlobal,
            amount: paymentAmount,
            seller_id: sellerData.user_id,
            referral_code: sellerData.referral_code,
            commission_rate: sellerData.commission_rate,
            estimated_commission: paymentAmount * sellerData.commission_rate,
            approved_by: "Automatic System"
          }

          console.log('📧 [approve-zelle-payment-automatic] Enviando notificação para seller:', sellerNotificationPayload)

          const sellerNotificationResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(sellerNotificationPayload),
          })

          if (sellerNotificationResponse.ok) {
            console.log('✅ [approve-zelle-payment-automatic] Notificação para seller enviada com sucesso!')
          } else {
            console.warn('⚠️ [approve-zelle-payment-automatic] Erro ao enviar notificação para seller:', sellerNotificationResponse.status)
          }
        } catch (sellerNotificationError) {
          console.error('❌ [approve-zelle-payment-automatic] Erro ao enviar notificação para seller:', sellerNotificationError)
        }

      } else {
        console.log(`ℹ️ [approve-zelle-payment-automatic] Nenhum seller encontrado para o usuário ${user_id}`)
      }
    } catch (sellerLookupError) {
      console.error('❌ [approve-zelle-payment-automatic] Erro ao buscar informações do seller:', sellerLookupError)
      // Não falhar o processo se a busca do seller falhar
    }

    console.log('🎉 [approve-zelle-payment-automatic] Aprovação automática concluída com sucesso!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment automatically approved successfully',
        fee_type_global: normalizedFeeTypeGlobal,
        payment_id: paymentId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('❌ [approve-zelle-payment-automatic] Erro:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
