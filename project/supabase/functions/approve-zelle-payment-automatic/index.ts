import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    // Normalizar fee_type_global para remover hífens e underscores extras
    const normalizedFeeTypeGlobal = fee_type_global?.replace(/-/g, '').replace(/_+/g, '_');

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
    
    // Primeiro, tentar buscar um pagamento pendente do usuário
    const { data: existingPayment, error: searchError } = await supabaseClient
      .from('zelle_payments')
      .select('id, status')
      .eq('user_id', user_id)
      .eq('fee_type_global', normalizedFeeTypeGlobal)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('❌ [approve-zelle-payment-automatic] Erro ao buscar pagamento existente:', searchError)
      throw searchError
    }

    if (existingPayment) {
      // Pagamento existente encontrado
      paymentId = existingPayment.id;
      console.log('✅ [approve-zelle-payment-automatic] Pagamento existente encontrado:', paymentId)
      
      // Atualizar o status do pagamento para aprovado
      const { error: paymentError } = await supabaseClient
        .from('zelle_payments')
        .update({
          status: 'approved',
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
        .select('id')
        .single()

      if (createError) {
        console.error('❌ [approve-zelle-payment-automatic] Erro ao criar pagamento:', createError)
        throw createError
      }

      paymentId = newPayment.id;
      console.log('✅ [approve-zelle-payment-automatic] Novo pagamento criado:', paymentId)
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

    } else if (normalizedFeeTypeGlobal === 'i20_control_fee') {
      console.log('🎯 [approve-zelle-payment-automatic] Atualizando has_paid_i20_control_fee...')
      
      const { data: updateData, error: profileError } = await supabaseClient
        .from('user_profiles')
        .update({ 
          has_paid_i20_control_fee: true,
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

    } else if (normalizedFeeTypeGlobal === 'application_fee' || normalizedFeeTypeGlobal === 'scholarship_fee') {
      console.log('🎯 [approve-zelle-payment-automatic] Atualizando scholarship_applications...')
      
      if (!scholarship_ids) {
        throw new Error('scholarship_ids is required for application_fee and scholarship_fee')
      }

      // Converter scholarship_ids para array se for string
      const scholarshipIdsArray = Array.isArray(scholarship_ids) 
        ? scholarship_ids 
        : scholarship_ids.split(',').map(id => id.trim())

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
          
          // Criar nova scholarship_application se não existir
          const { data: newApp, error: createError } = await supabaseClient
            .from('scholarship_applications')
            .insert({
              student_id: correctUserId,
              scholarship_id: scholarshipId,
              [normalizedFeeTypeGlobal === 'application_fee' ? 'is_application_fee_paid' : 'is_scholarship_fee_paid']: true,
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
          // Atualizar scholarship_application existente usando o student_id correto
          const { data: updateData, error: appError } = await supabaseClient
            .from('scholarship_applications')
            .update({ 
              [normalizedFeeTypeGlobal === 'application_fee' ? 'is_application_fee_paid' : 'is_scholarship_fee_paid']: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingApp.id)
            .select()

          if (appError) {
            console.error(`❌ [approve-zelle-payment-automatic] Erro ao marcar scholarship_applications para scholarship_id ${scholarshipId}:`, appError)
            throw appError
          }

          console.log(`✅ [approve-zelle-payment-automatic] ${normalizedFeeTypeGlobal} marcado como true para scholarship_id: ${scholarshipId} (app_id: ${existingApp.id})`)
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
        .select('full_name, email')
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

  } catch (error) {
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
