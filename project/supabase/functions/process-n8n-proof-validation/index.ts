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

    const body = await req.json();
    console.log('[process-n8n-proof-validation] Payload recebido:', JSON.stringify(body, null, 2));

    // Extrair dados do payload
    const {
      user_id,
      proof_type,
      is_valid,
      validation_details,
      fee_type,
      metadata = {}
    } = body;

    // Validar parâmetros obrigatórios
    if (!user_id || !proof_type || typeof is_valid !== 'boolean') {
      return corsResponse({ 
        error: 'Missing required fields: user_id, proof_type, is_valid' 
      }, 400);
    }

    console.log(`[process-n8n-proof-validation] Processando validação de proof para usuário: ${user_id}, tipo: ${proof_type}, válido: ${is_valid}`);

    // Se o proof não é válido, apenas logar e retornar
    if (!is_valid) {
      console.log(`[process-n8n-proof-validation] Proof inválido para usuário ${user_id}, tipo ${proof_type}`);
      return corsResponse({ 
        success: true,
        message: 'Proof validation failed - no system updates needed',
        user_id,
        proof_type,
        is_valid: false
      }, 200);
    }

    // Se o proof é válido, atualizar o sistema automaticamente
    console.log(`[process-n8n-proof-validation] Proof válido! Atualizando sistema para usuário ${user_id}...`);
    
    try {
      // Determinar o tipo de taxa baseado no proof_type ou fee_type
      let feeTypeToUpdate = fee_type;
      
      if (!feeTypeToUpdate) {
        // Mapear proof_type para fee_type se não especificado
        switch (proof_type.toLowerCase()) {
          case 'selection_process':
          case 'selection_process_fee':
          case 'selection_process_proof':
            feeTypeToUpdate = 'selection_process';
            break;
          case 'scholarship_fee':
          case 'scholarship_fee_proof':
            feeTypeToUpdate = 'scholarship_fee';
            break;
          case 'application_fee':
          case 'application_fee_proof':
            feeTypeToUpdate = 'application_fee';
            break;
          case 'enrollment_fee':
          case 'enrollment_fee_proof':
            feeTypeToUpdate = 'enrollment_fee';
            break;
          case 'i20_control':
          case 'i20_control_fee':
          case 'i-20_control_fee':
          case 'i20_control_proof':
            feeTypeToUpdate = 'i20_control';
            break;
          default:
            console.warn(`[process-n8n-proof-validation] Tipo de proof não reconhecido: ${proof_type}`);
            feeTypeToUpdate = proof_type;
        }
      }

      console.log(`[process-n8n-proof-validation] Atualizando taxa: ${feeTypeToUpdate}`);

      // Atualizar perfil do usuário baseado no tipo de taxa
      let updateData: any = {
        updated_at: new Date().toISOString()
      };

      switch (feeTypeToUpdate) {
        case 'selection_process':
          updateData.has_paid_selection_process_fee = true;
          break;
        case 'scholarship_fee':
          updateData.is_scholarship_fee_paid = true;
          break;
        case 'enrollment_fee':
          updateData.has_paid_college_enrollment_fee = true;
          break;
        case 'i20_control':
        case 'i-20_control_fee':
          updateData.has_paid_i20_control_fee = true;
          break;
        case 'application_fee':
          // Para application_fee, não atualizamos o user_profiles diretamente
          // mas podemos criar/atualizar aplicações se necessário
          console.log(`[process-n8n-proof-validation] Application fee validado - processando aplicações se necessário`);
          break;
        default:
          console.warn(`[process-n8n-proof-validation] Tipo de taxa não reconhecido: ${feeTypeToUpdate}`);
      }

      // Atualizar user_profiles se houver dados para atualizar
      if (Object.keys(updateData).length > 1) { // Mais que apenas updated_at
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', user_id);

        if (profileError) {
          console.error(`[process-n8n-proof-validation] Erro ao atualizar user_profiles para ${feeTypeToUpdate}:`, profileError);
        } else {
          console.log(`[process-n8n-proof-validation] User profile atualizado com sucesso para ${feeTypeToUpdate}`);
        }
      }

      // Processar application_fee se necessário
      if (feeTypeToUpdate === 'application_fee' && metadata?.scholarships_ids) {
        const scholarshipsIds = metadata.scholarships_ids;
        const scholarshipId = Array.isArray(scholarshipsIds) ? scholarshipsIds[0] : scholarshipsIds;
        
        // Verificar se já existe uma aplicação
        const { data: existingApp, error: findError } = await supabase
          .from('scholarship_applications')
          .select('id, status')
          .eq('student_id', user_id)
          .eq('scholarship_id', scholarshipId)
          .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('[process-n8n-proof-validation] Erro ao buscar aplicação existente:', findError);
        } else if (existingApp) {
          // Atualizar aplicação existente
          const { error: updateAppError } = await supabase
            .from('scholarship_applications')
            .update({ 
              status: 'under_review', // Status válido conforme constraint
              updated_at: new Date().toISOString()
            })
            .eq('id', existingApp.id);

          if (updateAppError) {
            console.error('[process-n8n-proof-validation] Erro ao atualizar aplicação:', updateAppError);
          } else {
            console.log('[process-n8n-proof-validation] Aplicação atualizada para application_fee_paid');
          }
        } else {
          // Criar nova aplicação
          const { error: createAppError } = await supabase
            .from('scholarship_applications')
            .insert({
              student_id: user_id,
              scholarship_id: scholarshipId,
              status: 'under_review', // Status válido conforme constraint
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (createAppError) {
            console.error('[process-n8n-proof-validation] Erro ao criar aplicação:', createAppError);
          } else {
            console.log('[process-n8n-proof-validation] Nova aplicação criada para application_fee_paid');
          }
        }
      }

      // Log da atualização bem-sucedida
      console.log(`[process-n8n-proof-validation] Sistema atualizado com sucesso para usuário ${user_id}, taxa ${feeTypeToUpdate}`);

      return corsResponse({ 
        success: true,
        message: `Proof validation successful - system updated for ${feeTypeToUpdate}`,
        user_id,
        proof_type,
        fee_type: feeTypeToUpdate,
        is_valid: true,
        updated_fields: Object.keys(updateData).filter(key => key !== 'updated_at')
      }, 200);

    } catch (error) {
      console.error('[process-n8n-proof-validation] Erro ao atualizar sistema:', error);
      return corsResponse({ 
        error: 'Failed to update system after proof validation',
        details: error.message 
      }, 500);
    }

  } catch (error) {
    console.error('[process-n8n-proof-validation] Erro inesperado:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
