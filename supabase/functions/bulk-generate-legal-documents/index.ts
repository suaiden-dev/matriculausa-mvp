// =====================================================
// Edge Function: bulk-generate-legal-documents
// =====================================================
// Gera documentos legais em massa para múltiplos usuários
// Processa registration_terms e selection_process_contract
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkGenerateRequest {
  user_ids: string[];
}

interface DocumentResult {
  user_id: string;
  registration_terms: 'success' | 'skipped' | 'error';
  selection_process_contract: 'success' | 'skipped' | 'error';
  error?: string;
}

interface BulkGenerateResponse {
  success: boolean;
  total: number;
  success_count: number;
  skipped_count: number;
  error_count: number;
  results: DocumentResult[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // O anon key é necessário no header 'apikey' para chamadas entre Edge Functions
    // Se não estiver em variável de ambiente, usar o anon key padrão do projeto
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdHB5bmd1YXNxcXV0dWh6aWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4NTcsImV4cCI6MjA2NTA1OTg1N30.bSm1LTOZ-GUuglbc14X2mcg0Z7cx93ubZq40hRDERQg';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestData: BulkGenerateRequest = await req.json();
    const { user_ids } = requestData;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'user_ids deve ser um array não vazio' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[bulk-generate-legal-documents] Iniciando processamento para ${user_ids.length} usuários`);
    console.log(`[bulk-generate-legal-documents] Supabase URL: ${supabaseUrl}`);
    console.log(`[bulk-generate-legal-documents] Service Key presente: ${supabaseServiceKey ? 'Sim' : 'Não'}`);
    console.log(`[bulk-generate-legal-documents] Anon Key presente: ${supabaseAnonKey ? 'Sim' : 'Não'}`);

    const results: DocumentResult[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Processar cada usuário sequencialmente
    for (let i = 0; i < user_ids.length; i++) {
      const user_id = user_ids[i];
      const result: DocumentResult = {
        user_id,
        registration_terms: 'success',
        selection_process_contract: 'success'
      };

      try {
        // Buscar student_id (profile ID) do usuário
        console.log(`[bulk-generate-legal-documents] Buscando perfil para user_id: ${user_id}`);
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user_id)
          .maybeSingle();

        if (profileError || !profile) {
          console.error(`[bulk-generate-legal-documents] Erro ao buscar perfil para ${user_id}:`, profileError);
          result.registration_terms = 'error';
          result.selection_process_contract = 'error';
          result.error = `Perfil não encontrado: ${profileError?.message || 'Unknown error'}`;
          errorCount += 2;
          results.push(result);
          continue;
        }

        const student_id = profile.id;
        console.log(`[bulk-generate-legal-documents] Perfil encontrado: student_id=${student_id} para user_id=${user_id}`);

        // 1. Verificar idempotência e gerar registration_terms
        const { data: existingRegTerms } = await supabase
          .from('legal_documents')
          .select('id, email_sent')
          .eq('user_id', user_id)
          .eq('document_type', 'registration_terms')
          .maybeSingle();

        if (existingRegTerms && existingRegTerms.email_sent) {
          result.registration_terms = 'skipped';
          skippedCount++;
        } else {
          // Verificar se o usuário tem os termos necessários aceitos
          const { data: termsOfService } = await supabase
            .from('comprehensive_term_acceptance')
            .select('id')
            .eq('user_id', user_id)
            .eq('term_type', 'terms_of_service')
            .limit(1)
            .maybeSingle();
          
          const { data: privacyPolicy } = await supabase
            .from('comprehensive_term_acceptance')
            .select('id')
            .eq('user_id', user_id)
            .eq('term_type', 'privacy_policy')
            .limit(1)
            .maybeSingle();
          
          // ESTRATÉGIA PARA USUÁRIOS ANTIGOS: 
          // Se não tem termos aceitos, criar registros retroativos automaticamente
          // RACIOCÍNIO: Não é possível se registrar no sistema sem aceitar os termos,
          // então todos os usuários existentes já aceitaram os termos no momento do registro
          if (!termsOfService || !privacyPolicy) {
            console.log(`[bulk-generate-legal-documents] Usuário ${user_id} não tem terms_of_service ou privacy_policy aceitos. Criando registros retroativos (todos os usuários aceitaram termos ao se registrar)...`);
            
            // Buscar data de criação do usuário (momento em que aceitou os termos)
            // Como não é possível se registrar sem aceitar termos, usamos a data de criação do usuário
            // Consultar diretamente a tabela auth.users via RPC ou usar user_profiles.created_at como fallback
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('created_at')
              .eq('user_id', user_id)
              .maybeSingle();
            
            // Usar created_at do perfil ou data atual como fallback
            const userCreatedAt = userProfile?.created_at || new Date().toISOString();
            
            // Buscar os IDs dos termos ativos de terms_of_service e privacy_policy
            const { data: activeTerms } = await supabase
              .from('application_terms')
              .select('id, term_type')
              .in('term_type', ['terms_of_service', 'privacy_policy'])
              .eq('is_active', true);
            
            if (!activeTerms || activeTerms.length < 2) {
              console.warn(`[bulk-generate-legal-documents] Não foi possível encontrar termos ativos para criar registros retroativos`);
              result.registration_terms = 'error';
              result.error = `Termos ativos não encontrados no sistema`;
              errorCount++;
              results.push(result);
              continue;
            }
            
            const termsServiceTerm = activeTerms.find(t => t.term_type === 'terms_of_service');
            const privacyPolicyTerm = activeTerms.find(t => t.term_type === 'privacy_policy');
            
            if (!termsServiceTerm || !privacyPolicyTerm) {
              console.warn(`[bulk-generate-legal-documents] Não foi possível encontrar termos ativos de terms_of_service ou privacy_policy`);
              result.registration_terms = 'error';
              result.error = `Termos ativos incompletos no sistema`;
              errorCount++;
              results.push(result);
              continue;
            }
            
            // Criar registros retroativos usando a data de criação do usuário
            const acceptedAt = userCreatedAt;
            
            // Inserir terms_of_service se não existe
            if (!termsOfService) {
              const { error: insertError1 } = await supabase
                .from('comprehensive_term_acceptance')
                .insert({
                  user_id: user_id,
                  term_id: termsServiceTerm.id,
                  term_type: 'terms_of_service',
                  accepted_at: acceptedAt
                })
                .select()
                .maybeSingle();
              
              if (insertError1) {
                console.error(`[bulk-generate-legal-documents] Erro ao criar registro retroativo de terms_of_service:`, insertError1);
              } else {
                console.log(`[bulk-generate-legal-documents] Registro retroativo de terms_of_service criado para ${user_id} (aceito em ${acceptedAt})`);
              }
            }
            
            // Inserir privacy_policy se não existe
            if (!privacyPolicy) {
              const { error: insertError2 } = await supabase
                .from('comprehensive_term_acceptance')
                .insert({
                  user_id: user_id,
                  term_id: privacyPolicyTerm.id,
                  term_type: 'privacy_policy',
                  accepted_at: acceptedAt
                })
                .select()
                .maybeSingle();
              
              if (insertError2) {
                console.error(`[bulk-generate-legal-documents] Erro ao criar registro retroativo de privacy_policy:`, insertError2);
              } else {
                console.log(`[bulk-generate-legal-documents] Registro retroativo de privacy_policy criado para ${user_id} (aceito em ${acceptedAt})`);
              }
            }
            
            // Aguardar um pouco para garantir que os registros foram criados
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verificar novamente se agora tem os termos
            const { data: newTermsOfService } = await supabase
              .from('comprehensive_term_acceptance')
              .select('id')
              .eq('user_id', user_id)
              .eq('term_type', 'terms_of_service')
              .limit(1)
              .maybeSingle();
            
            const { data: newPrivacyPolicy } = await supabase
              .from('comprehensive_term_acceptance')
              .select('id')
              .eq('user_id', user_id)
              .eq('term_type', 'privacy_policy')
              .limit(1)
              .maybeSingle();
            
            if (!newTermsOfService || !newPrivacyPolicy) {
              console.warn(`[bulk-generate-legal-documents] Ainda não foi possível criar os registros retroativos para ${user_id}`);
              result.registration_terms = 'error';
              result.error = `Não foi possível criar registros retroativos de termos (terms_of_service: ${newTermsOfService ? 'OK' : 'FALTANDO'}, privacy_policy: ${newPrivacyPolicy ? 'OK' : 'FALTANDO'})`;
              errorCount++;
              results.push(result);
              continue;
            }
            
            console.log(`[bulk-generate-legal-documents] Registros retroativos criados com sucesso para ${user_id}. Prosseguindo com geração de PDF...`);
          }
          
          // Se chegou aqui, tem os termos aceitos (ou foram criados retroativamente)
          // Chamar Edge Function para gerar registration_terms usando fetch direto
          console.log(`[bulk-generate-legal-documents] Gerando registration_terms para user_id: ${user_id}`);
          const functionUrl = `${supabaseUrl}/functions/v1/generate-legal-pdf`;
          console.log(`[bulk-generate-legal-documents] Chamando: ${functionUrl}`);
          console.log(`[bulk-generate-legal-documents] Headers: apikey=${supabaseServiceKey?.substring(0, 20)}..., Authorization=Bearer ${supabaseServiceKey?.substring(0, 20)}...`);
          
          const generatePdfResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'x-client-info': 'bulk-generate-legal-documents/1.0',
            },
            body: JSON.stringify({
              type: 'registration_terms',
              user_id: user_id,
              related_id: user_id,
              trigger_table: 'bulk_generation'
            })
          });
          
          console.log(`[bulk-generate-legal-documents] Response status: ${generatePdfResponse.status} ${generatePdfResponse.statusText}`);
          console.log(`[bulk-generate-legal-documents] Response headers:`, Object.fromEntries(generatePdfResponse.headers.entries()));

          if (!generatePdfResponse.ok) {
            let errorMessage = '';
            let errorBody = '';
            try {
              errorBody = await generatePdfResponse.text();
              console.log(`[bulk-generate-legal-documents] Response body (text):`, errorBody);
              try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.error || errorJson.message || JSON.stringify(errorJson);
              } catch {
                errorMessage = errorBody;
              }
            } catch {
              errorMessage = 'Erro ao ler resposta';
            }
            console.error(`[bulk-generate-legal-documents] Erro ao gerar registration_terms para ${user_id}: ${generatePdfResponse.status} - ${errorMessage}`);
            result.registration_terms = 'error';
            result.error = `Erro ao gerar registration_terms: ${generatePdfResponse.status} ${errorMessage}`;
            errorCount++;
          } else {
            const responseData = await generatePdfResponse.json();
            console.log(`[bulk-generate-legal-documents] registration_terms gerado com sucesso para ${user_id}:`, responseData);
            successCount++;
          }
        }

        // Aguardar 250ms antes do próximo documento
        await new Promise(resolve => setTimeout(resolve, 250));

        // 2. Verificar idempotência e gerar selection_process_contract
        const { data: existingContract } = await supabase
          .from('legal_documents')
          .select('id, email_sent')
          .eq('user_id', user_id)
          .eq('document_type', 'selection_process_contract')
          .maybeSingle();

        if (existingContract && existingContract.email_sent) {
          result.selection_process_contract = 'skipped';
          skippedCount++;
        } else {
          // Chamar Edge Function para gerar selection_process_contract usando fetch direto
          console.log(`[bulk-generate-legal-documents] Gerando selection_process_contract para user_id: ${user_id}, student_id: ${student_id}`);
          const functionUrl = `${supabaseUrl}/functions/v1/generate-legal-pdf`;
          console.log(`[bulk-generate-legal-documents] Chamando: ${functionUrl}`);
          console.log(`[bulk-generate-legal-documents] Headers: apikey=${supabaseServiceKey?.substring(0, 20)}..., Authorization=Bearer ${supabaseServiceKey?.substring(0, 20)}...`);
          
          const generateContractResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'x-client-info': 'bulk-generate-legal-documents/1.0',
            },
            body: JSON.stringify({
              type: 'selection_process_contract',
              user_id: user_id,
              related_id: student_id,
              trigger_table: 'bulk_generation'
            })
          });
          
          console.log(`[bulk-generate-legal-documents] Response status: ${generateContractResponse.status} ${generateContractResponse.statusText}`);
          console.log(`[bulk-generate-legal-documents] Response headers:`, Object.fromEntries(generateContractResponse.headers.entries()));

          if (!generateContractResponse.ok) {
            let errorMessage = '';
            let errorBody = '';
            try {
              errorBody = await generateContractResponse.text();
              console.log(`[bulk-generate-legal-documents] Response body (text):`, errorBody);
              try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.error || errorJson.message || JSON.stringify(errorJson);
              } catch {
                errorMessage = errorBody;
              }
            } catch {
              errorMessage = 'Erro ao ler resposta';
            }
            console.error(`[bulk-generate-legal-documents] Erro ao gerar selection_process_contract para ${user_id}: ${generateContractResponse.status} - ${errorMessage}`);
            result.selection_process_contract = 'error';
            if (!result.error) {
              result.error = `Erro ao gerar selection_process_contract: ${generateContractResponse.status} ${errorMessage}`;
            } else {
              result.error += ` | Contract: ${generateContractResponse.status} ${errorMessage}`;
            }
            errorCount++;
          } else {
            const responseData = await generateContractResponse.json();
            console.log(`[bulk-generate-legal-documents] selection_process_contract gerado com sucesso para ${user_id}:`, responseData);
            successCount++;
          }
        }

      } catch (error: any) {
        console.error(`[bulk-generate-legal-documents] Erro ao processar user_id ${user_id}:`, error);
        result.registration_terms = 'error';
        result.selection_process_contract = 'error';
        result.error = error.message || 'Erro desconhecido';
        errorCount += 2;
      }

      results.push(result);

      // Throttling: aguardar 500ms entre usuários
      if (i < user_ids.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const response: BulkGenerateResponse = {
      success: true,
      total: user_ids.length,
      success_count: successCount,
      skipped_count: skippedCount,
      error_count: errorCount,
      results
    };

    console.log(`[bulk-generate-legal-documents] Processamento concluído: ${successCount} gerados, ${skippedCount} pulados, ${errorCount} erros`);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[bulk-generate-legal-documents] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro desconhecido ao processar requisição' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
