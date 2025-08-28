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
        if (payment.fee_type === 'i20_control') {
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
