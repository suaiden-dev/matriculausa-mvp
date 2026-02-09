// =====================================================
// Edge Function: bulk-generate-legal-documents
// =====================================================
// Bulk generates legal documents for multiple users
// Processes registration_terms and selection_process_contract
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    let requestData: BulkGenerateRequest;
    try {
      requestData = await req.json();
    } catch (parseError: any) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao parsear JSON: ' + (parseError.message || 'Invalid JSON') 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
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

    const results: DocumentResult[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Processar cada usuário sequencialmente
    for (let i = 0; i < user_ids.length; i++) {
      // Adicionar pequeno delay para evitar rate limiting em cascata (e-mail/pdf)
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
        const { data: existingDocs } = await supabase
          .from('legal_documents')
          .select('id, email_sent')
          .eq('user_id', user_id)
          .eq('document_type', 'registration_terms')
          .order('created_at', { ascending: false })
          .limit(1);

        const existingRegTerms = existingDocs && existingDocs.length > 0 ? existingDocs[0] : null;

        if (existingRegTerms && existingRegTerms.email_sent) {
          console.log(`[bulk-generate-legal-documents] Termos de registro para ${user_id} já gerados e enviados. Pulando.`);
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
          
          // Se não tem termos aceitos, criar registros retroativos automaticamente
          if (!termsOfService || !privacyPolicy) {
            console.log(`[bulk-generate-legal-documents] Usuário ${user_id} não possui termos básicos aceitos. Criando registros retroativos...`);
            
            // Buscar data de criação do usuário (momento em que aceitou os termos)
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('created_at')
              .eq('user_id', user_id)
              .maybeSingle();
            
            const userCreatedAt = userProfile?.created_at || new Date().toISOString();
            
            // Buscar os IDs dos termos ativos
            const { data: activeTerms } = await supabase
              .from('application_terms')
              .select('id, term_type')
              .in('term_type', ['terms_of_service', 'privacy_policy', 'checkout_terms'])
              .eq('is_active', true);
            
            if (!activeTerms || activeTerms.length < 2) {
              console.warn(`[bulk-generate-legal-documents] Não foi possível encontrar termos ativos para criar registros retroativos`);
              // ... continue for registration_terms error
            } else {
              const termsServiceTerm = activeTerms.find(t => t.term_type === 'terms_of_service');
              const privacyPolicyTerm = activeTerms.find(t => t.term_type === 'privacy_policy');
              const checkoutTerm = activeTerms.find(t => t.term_type === 'checkout_terms');
              
              // Inserir terms_of_service se não existe
              if (!termsOfService && termsServiceTerm) {
                await supabase.from('comprehensive_term_acceptance').insert({
                  user_id: user_id,
                  term_id: termsServiceTerm.id,
                  term_type: 'terms_of_service',
                  accepted_at: userCreatedAt
                });
              }
              
              // Inserir privacy_policy se não existe
              if (!privacyPolicy && privacyPolicyTerm) {
                await supabase.from('comprehensive_term_acceptance').insert({
                  user_id: user_id,
                  term_id: privacyPolicyTerm.id,
                  term_type: 'privacy_policy',
                  accepted_at: userCreatedAt
                });
              }

              // Inserir checkout_terms se não existe (sempre bom ter para o contrato)
              const { data: hasCheckout } = await supabase
                .from('comprehensive_term_acceptance')
                .select('id')
                .eq('user_id', user_id)
                .eq('term_type', 'checkout_terms')
                .maybeSingle();

              if (!hasCheckout && checkoutTerm) {
                await supabase.from('comprehensive_term_acceptance').insert({
                  user_id: user_id,
                  term_id: checkoutTerm.id,
                  term_type: 'checkout_terms',
                  accepted_at: userCreatedAt
                });
              }
            }
            
            // Aguardar um pouco para garantir que os registros foram criados
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // Chamar Edge Function para gerar registration_terms
          console.log(`[bulk-generate-legal-documents] Gerando termos de registro para user_id: ${user_id}`);
          const functionUrl = `${supabaseUrl}/functions/v1/generate-legal-pdf`;
          
          const generatePdfResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: 'registration_terms',
              user_id: user_id,
              related_id: user_id,
              trigger_table: 'bulk_generation'
            })
          });

          if (!generatePdfResponse.ok) {
            let errorMessage = `Status: ${generatePdfResponse.status}`;
            try {
              const errorData = await generatePdfResponse.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
              // ignore parse error if body isn't JSON
            }
            console.error(`[bulk-generate-legal-documents] Erro ao gerar termos de registro para ${user_id}: ${errorMessage}`);
            result.registration_terms = 'error';
            result.error = `Erro ao gerar termos de registro: ${errorMessage}`;
            errorCount++;
          } else {
            console.log(`[bulk-generate-legal-documents] Termos de registro gerados com sucesso para ${user_id}`);
            successCount++;
          }
        }

        // 2. Verificar idempotência e gerar selection_process_contract
        const { data: existingContractDocs } = await supabase
          .from('legal_documents')
          .select('id, email_sent')
          .eq('user_id', user_id)
          .eq('document_type', 'selection_process_contract')
          .order('created_at', { ascending: false })
          .limit(1);

        const existingContract = existingContractDocs && existingContractDocs.length > 0 ? existingContractDocs[0] : null;

        if (existingContract && existingContract.email_sent) {
          console.log(`[bulk-generate-legal-documents] Contrato para ${user_id} já enviado. Pulando.`);
          result.selection_process_contract = 'skipped';
          skippedCount++;
        } else {
          console.log(`[bulk-generate-legal-documents] Gerando contrato para user_id: ${user_id}`);
          const functionUrl = `${supabaseUrl}/functions/v1/generate-legal-pdf`;
          
          const generateContractResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              type: 'selection_process_contract',
              user_id: user_id,
              related_id: student_id,
              trigger_table: 'bulk_generation'
            })
          });

          if (!generateContractResponse.ok) {
            let errorMsg = `Status: ${generateContractResponse.status}`;
            try {
              const errData = await generateContractResponse.json();
              errorMsg = errData.message || errData.error || errorMsg;
            } catch (e) {
              // ignore
            }
            console.error(`[bulk-generate-legal-documents] Erro ao gerar contrato para ${user_id}: ${errorMsg}`);
            result.selection_process_contract = 'error';
            result.error = (result.error ? result.error + ' | ' : '') + `Erro ao gerar contrato: ${errorMsg}`;
            errorCount++;
          } else {
            console.log(`[bulk-generate-legal-documents] Contrato gerado com sucesso para ${user_id}`);
            successCount++;
          }
        }

      } catch (error: any) {
        console.error(`[bulk-generate-legal-documents] Erro ao processar user_id ${user_id}:`, error);
        result.error = error.message || 'Erro desconhecido';
        errorCount++;
      }

      results.push(result);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: user_ids.length,
        success_count: successCount,
        skipped_count: skippedCount,
        error_count: errorCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[bulk-generate-legal-documents] Erro geral:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
