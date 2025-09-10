import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const {
      payment_id,
      valid,
      reason,
      validation_details,
      metadata = {}
    } = await req.json();

    // Validar parâmetros obrigatórios
    if (!payment_id || typeof valid !== 'boolean') {
      return corsResponse({ 
        error: 'Missing required fields: payment_id, valid' 
      }, 400);
    }

    console.log('[validate-zelle-payment-result] Processing validation result for payment:', payment_id, 'Valid:', valid);

    // Buscar o pagamento
    const { data: payment, error: fetchError } = await supabase
      .from('zelle_payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (fetchError || !payment) {
      console.error('[validate-zelle-payment-result] Payment not found:', payment_id);
      return corsResponse({ error: 'Payment not found' }, 404);
    }

    // Atualizar status do pagamento
    const newStatus = valid ? 'verified' : 'rejected';
    const { error: updateError } = await supabase
      .from('zelle_payments')
      .update({
        status: newStatus,
        admin_notes: reason || (valid ? 'Automatically verified by n8n' : 'Automatically rejected by n8n'),
        verified_at: valid ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...payment.metadata,
          validation_result: {
            valid,
            reason,
            validation_details,
            validated_at: new Date().toISOString(),
            ...metadata
          }
        }
      })
      .eq('id', payment_id);

    if (updateError) {
      console.error('[validate-zelle-payment-result] Error updating payment status:', updateError);
      return corsResponse({ error: 'Failed to update payment status' }, 500);
    }

    // Se o pagamento foi validado, atualizar o sistema automaticamente
    if (valid) {
      console.log('[validate-zelle-payment-result] Payment validated, updating system...');
      
      try {
        // Atualizar perfil do usuário baseado no tipo de taxa
        if (payment.fee_type === 'scholarship_fee') {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              is_scholarship_fee_paid: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id);

          if (profileError) {
            console.error('[validate-zelle-payment-result] Error updating user profile for scholarship fee:', profileError);
          } else {
            console.log('[validate-zelle-payment-result] User profile updated for scholarship fee');
          }
        }

        // Se for application_fee, criar ou atualizar aplicação
        if (payment.fee_type === 'application_fee' && payment.metadata?.scholarships_ids) {
          const scholarshipsIds = payment.metadata.scholarships_ids;
          const scholarshipId = Array.isArray(scholarshipsIds) ? scholarshipsIds[0] : scholarshipsIds;
          
          // Verificar se já existe uma aplicação
          const { data: existingApp, error: findError } = await supabase
            .from('scholarship_applications')
            .select('id, status')
            .eq('student_id', payment.user_id)
            .eq('scholarship_id', scholarshipId)
            .single();

          if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('[validate-zelle-payment-result] Error finding existing application:', findError);
          } else if (existingApp) {
            // Atualizar aplicação existente
            const { error: updateAppError } = await supabase
              .from('scholarship_applications')
              .update({ 
                status: 'application_fee_paid',
                updated_at: new Date().toISOString()
              })
              .eq('id', existingApp.id);

            if (updateAppError) {
              console.error('[validate-zelle-payment-result] Error updating application:', updateAppError);
            } else {
              console.log('[validate-zelle-payment-result] Application updated for application fee');
            }
          } else {
            // Criar nova aplicação
            const { error: createAppError } = await supabase
              .from('scholarship_applications')
              .insert({
                student_id: payment.user_id,
                scholarship_id: scholarshipId,
                status: 'application_fee_paid',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (createAppError) {
              console.error('[validate-zelle-payment-result] Error creating application:', createAppError);
            } else {
              console.log('[validate-zelle-payment-result] New application created for application fee');
            }
          }
        }

        // Se for selection_process, atualizar perfil do usuário
        if (payment.fee_type === 'selection_process') {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_selection_process_fee: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id);

          if (profileError) {
            console.error('[validate-zelle-payment-result] Error updating user profile for selection process fee:', profileError);
          } else {
            console.log('[validate-zelle-payment-result] User profile updated for selection process fee');
          }
        }

        // Se for enrollment_fee, atualizar perfil do usuário
        if (payment.fee_type === 'enrollment_fee') {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_college_enrollment_fee: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id);

          if (profileError) {
            console.error('[validate-zelle-payment-result] Error updating user profile for enrollment fee:', profileError);
          } else {
            console.log('[validate-zelle-payment-result] User profile updated for enrollment fee');
          }
        }

        // Se for i20_control, atualizar perfil do usuário
        if (payment.fee_type === 'i20_control' || payment.fee_type === 'i-20_control_fee') {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ 
              has_paid_i20_control_fee: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', payment.user_id);

          if (profileError) {
            console.error('[validate-zelle-payment-result] Error updating user profile for i20 control fee:', profileError);
          } else {
            console.log('[validate-zelle-payment-result] User profile updated for i20 control fee');
          }
        }

        // Enviar notificação para universidade se for application_fee
        if (payment.fee_type === 'application_fee' && payment.metadata?.scholarships_ids) {
          try {
            console.log('[validate-zelle-payment-result] Sending notification to university for application fee payment...');
            
            // Buscar dados do aluno
            const { data: alunoData, error: alunoError } = await supabase
              .from('user_profiles')
              .select('full_name, email')
              .eq('user_id', payment.user_id)
              .single();
            
            if (alunoError || !alunoData) {
              console.warn('[validate-zelle-payment-result] Student not found for notification:', alunoError);
            } else {
              const scholarshipsIds = payment.metadata.scholarships_ids;
              const scholarshipId = Array.isArray(scholarshipsIds) ? scholarshipsIds[0] : scholarshipsIds;
              
              // Buscar dados da bolsa
              const { data: scholarship, error: scholarshipError } = await supabase
                .from('scholarships')
                .select('title, university_id')
                .eq('id', scholarshipId)
                .single();
              
              if (!scholarshipError && scholarship) {
                // Buscar dados da universidade
                const { data: universidade, error: univError } = await supabase
                  .from('universities')
                  .select('name, contact')
                  .eq('id', scholarship.university_id)
                  .single();
                
                if (!univError && universidade) {
                  const contact = universidade.contact || {};
                  const emailUniversidade = contact.admissionsEmail || contact.email || '';
                  
                  // Montar mensagem para n8n
                  const mensagem = `O aluno ${alunoData.full_name} pagou a taxa de aplicação de $${payment.amount} via Zelle para a bolsa "${scholarship.title}" da universidade ${universidade.name}. Acesse o painel para revisar a candidatura.`;
                  const payload = {
                    tipo_notf: 'Novo pagamento de application fee',
                    email_aluno: alunoData.email,
                    nome_aluno: alunoData.full_name,
                    nome_bolsa: scholarship.title,
                    nome_universidade: universidade.name,
                    email_universidade: emailUniversidade,
                    o_que_enviar: mensagem,
                  };
                  
                  console.log('[validate-zelle-payment-result] Sending webhook to n8n:', payload);
                  
                  // Enviar para o n8n
                  const n8nRes = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'User-Agent': 'PostmanRuntime/7.36.3',
                    },
                    body: JSON.stringify(payload),
                  });
                  
                  const n8nText = await n8nRes.text();
                  console.log('[validate-zelle-payment-result] N8n response:', n8nRes.status, n8nText);
                } else {
                  console.warn('[validate-zelle-payment-result] University not found for notification:', univError);
                }
              } else {
                console.warn('[validate-zelle-payment-result] Scholarship not found for notification:', scholarshipError);
              }
            }
          } catch (notifError) {
            console.error('[validate-zelle-payment-result] Error sending notification to university:', notifError);
            // Não falhar o processo se a notificação falhar
          }
        }

        console.log('[validate-zelle-payment-result] System updated successfully for validated payment');
      } catch (error) {
        console.error('[validate-zelle-payment-result] Error updating system:', error);
        // Não falhar o processo se não conseguir atualizar o sistema
      }
    }

    console.log('[validate-zelle-payment-result] Validation result processed successfully');

    return corsResponse({ 
      success: true,
      payment_id: payment_id,
      status: newStatus,
      message: `Payment ${newStatus} automatically by n8n`
    }, 200);

  } catch (error) {
    console.error('[validate-zelle-payment-result] Unexpected error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
