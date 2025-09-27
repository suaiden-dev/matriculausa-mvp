import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

// Function to send term acceptance notification with PDF after successful payment
async function sendTermAcceptanceNotificationAfterPayment(userId: string, feeType: string) {
  try {
    console.log('[NOTIFICAÇÃO] Buscando dados do usuário para notificação...');
    
    // Get user profile data
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('email, full_name, country, seller_referral_code')
      .eq('user_id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar perfil do usuário:', userError);
      return;
    }

    // Get the most recent term acceptance for this user
    const { data: termAcceptance, error: termError } = await supabase
      .from('comprehensive_term_acceptance')
      .select('term_id, accepted_at, ip_address, user_agent')
      .eq('user_id', userId)
      .eq('term_type', 'checkout_terms')
      .order('accepted_at', { ascending: false })
      .limit(1)
      .single();

    if (termError || !termAcceptance) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar aceitação de termos:', termError);
      return;
    }

    // Get term content
    const { data: termData, error: termDataError } = await supabase
      .from('application_terms')
      .select('title, content')
      .eq('id', termAcceptance.term_id)
      .single();

    if (termDataError || !termData) {
      console.error('[NOTIFICAÇÃO] Erro ao buscar conteúdo do termo:', termDataError);
      return;
    }

    // Get seller data if user has seller_referral_code
    let sellerData = null;
    if (userProfile.seller_referral_code) {
      const { data: sellerResult } = await supabase
        .from('sellers')
        .select('name, email, referral_code, user_id, affiliate_admin_id')
        .eq('referral_code', userProfile.seller_referral_code)
        .single();
      
      if (sellerResult) {
        sellerData = sellerResult;
      }
    }

    // Get affiliate admin data if seller has affiliate_admin_id
    let affiliateAdminData = null;
    if (sellerData?.affiliate_admin_id) {
      const { data: affiliateResult } = await supabase
        .from('affiliate_admins')
        .select('full_name, email')
        .eq('id', sellerData.affiliate_admin_id)
        .single();
      
      if (affiliateResult) {
        affiliateAdminData = affiliateResult;
      }
    }

    // Generate PDF for the term acceptance
    let pdfBlob: Blob | null = null;
    try {
      const pdfData = {
        student_name: userProfile.full_name,
        student_email: userProfile.email,
        term_title: termData.title,
        accepted_at: termAcceptance.accepted_at,
        ip_address: termAcceptance.ip_address || 'N/A',
        user_agent: termAcceptance.user_agent || 'N/A',
        country: userProfile.country,
        affiliate_code: userProfile.seller_referral_code,
        term_content: termData.content
      };

      console.log('[NOTIFICAÇÃO] Gerando PDF para notificação...');
      // Note: We need to import the PDF generation function here
      // For now, we'll create a simple notification without PDF
      console.log('[NOTIFICAÇÃO] PDF generation would happen here');
    } catch (pdfError) {
      console.error('[NOTIFICAÇÃO] Erro ao gerar PDF:', pdfError);
      // Continue with notification even if PDF generation fails
    }

    // Prepare notification payload
    const webhookPayload = {
      tipo_notf: "Student Term Acceptance",
      email_admin: "admin@matriculausa.com",
      nome_admin: "Admin MatriculaUSA",
      email_aluno: userProfile.email,
      nome_aluno: userProfile.full_name,
      email_seller: sellerData?.email || "",
      nome_seller: sellerData?.name || "N/A",
      email_affiliate_admin: affiliateAdminData?.email || "",
      nome_affiliate_admin: affiliateAdminData?.full_name || "N/A",
      o_que_enviar: `Student ${userProfile.full_name} has accepted the ${termData.title} and completed ${feeType} payment via Zelle. This shows the student is progressing through the enrollment process.`,
      term_title: termData.title,
      term_type: 'checkout_terms',
      accepted_at: termAcceptance.accepted_at,
      ip_address: termAcceptance.ip_address,
      student_country: userProfile.country,
      seller_id: sellerData?.user_id || "",
      referral_code: sellerData?.referral_code || "",
      affiliate_admin_id: sellerData?.affiliate_admin_id || ""
    };

    console.log('[NOTIFICAÇÃO] Enviando webhook com payload:', webhookPayload);

    // Send webhook notification
    const formData = new FormData();
    
    // Add each field individually for n8n to process correctly
    Object.entries(webhookPayload).forEach(([key, value]) => {
      formData.append(key, value !== null && value !== undefined ? value.toString() : '');
    });

    // Add PDF if generated successfully
    if (pdfBlob) {
      const fileName = `term_acceptance_${userProfile.full_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
      formData.append('pdf', pdfBlob, fileName);
      console.log('[NOTIFICAÇÃO] PDF anexado à notificação:', fileName);
    }

    const webhookResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      body: formData,
    });

    if (webhookResponse.ok) {
      console.log('[NOTIFICAÇÃO] Notificação enviada com sucesso!');
    } else {
      const errorText = await webhookResponse.text();
      console.warn('[NOTIFICAÇÃO] Erro ao enviar notificação:', webhookResponse.status, errorText);
    }

  } catch (error) {
    console.error('[NOTIFICAÇÃO] Erro ao enviar notificação de aceitação de termos:', error);
    // Don't throw error to avoid breaking the payment process
  }
}

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
            
            // Note: Term acceptance notification with PDF is only sent for selection_process_fee
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
            // Atualizar aplicação existente - preservar status 'approved' se já estiver
            const updateData: any = { 
              updated_at: new Date().toISOString()
            };
            
            // Só mudar status se não estiver 'approved' (universidade já aprovou)
            if (existingApp.status !== 'approved') {
              updateData.status = 'under_review'; // Status válido conforme constraint
            }
            
            const { error: updateAppError } = await supabase
              .from('scholarship_applications')
              .update(updateData)
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
                status: 'under_review', // Nova aplicação sempre começa com este status
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
            
            // Send term acceptance notification with PDF after successful payment
            try {
              console.log('[NOTIFICAÇÃO] Enviando notificação de aceitação de termos com PDF após pagamento Zelle bem-sucedido...');
              await sendTermAcceptanceNotificationAfterPayment(payment.user_id, 'selection_process');
              console.log('[NOTIFICAÇÃO] Notificação enviada com sucesso');
            } catch (notificationError) {
              console.error('[NOTIFICAÇÃO] Erro ao enviar notificação:', notificationError);
              // Don't fail the payment processing if notification fails
            }
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
            
            // Note: Term acceptance notification with PDF is only sent for selection_process_fee
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
            
            // Note: Term acceptance notification with PDF is only sent for selection_process_fee
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
