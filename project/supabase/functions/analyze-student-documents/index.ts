import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Função para verificar se a resposta do n8n indica uma validação positiva
function checkForValidProof(n8nData: any): { isValid: boolean; proofType?: string; feeType?: string } {
  try {
    // Verificar diferentes formatos de resposta do n8n
    const dataStr = JSON.stringify(n8nData).toLowerCase();
    
    // Verificar se há indicação de validação positiva
    const positiveIndicators = [
      'valid', 'true', 'approved', 'accepted', 'success', 'pass',
      'válido', 'aprovado', 'aceito', 'sucesso', 'passou'
    ];
    
    const hasPositiveIndicator = positiveIndicators.some(indicator => 
      dataStr.includes(indicator)
    );
    
    if (!hasPositiveIndicator) {
      return { isValid: false };
    }
    
    // Determinar o tipo de proof baseado no conteúdo
    let proofType = 'document_validation';
    let feeType = 'selection_process'; // Default
    
    if (dataStr.includes('selection') || dataStr.includes('seleção')) {
      proofType = 'selection_process_proof';
      feeType = 'selection_process';
    } else if (dataStr.includes('scholarship') || dataStr.includes('bolsa')) {
      proofType = 'scholarship_fee_proof';
      feeType = 'scholarship_fee';
    } else if (dataStr.includes('application') || dataStr.includes('aplicação')) {
      proofType = 'application_fee_proof';
      feeType = 'application_fee';
    } else if (dataStr.includes('enrollment') || dataStr.includes('matrícula')) {
      proofType = 'enrollment_fee_proof';
      feeType = 'enrollment_fee';
    } else if (dataStr.includes('i20') || dataStr.includes('i-20')) {
      proofType = 'i20_control_proof';
      feeType = 'i20_control';
    }
    
    console.log(`[Edge] Proof válido detectado - Tipo: ${proofType}, Fee: ${feeType}`);
    return { isValid: true, proofType, feeType };
    
  } catch (error) {
    console.error('[Edge] Erro ao verificar validação de proof:', error);
    return { isValid: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (req.method !== "POST") {
    console.log('[Edge] Método não permitido:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: any;
  try {
    body = await req.json();
    console.log('[Edge] Body recebido:', JSON.stringify(body));
  } catch (e) {
    console.log('[Edge] JSON inválido:', e);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // URL do webhook do n8n via secret
  const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
  if (!webhookUrl) {
    console.log('[Edge] Webhook URL não configurada');
    return new Response(
      JSON.stringify({ error: 'Webhook URL not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Headers a serem enviados
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Supabase-Edge-Function/1.0',
  };
  console.log('[Edge] Headers enviados para n8n:', JSON.stringify(headers));

  try {
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    // Logar todos os headers recebidos do n8n
    const receivedHeaders: Record<string, string> = {};
    n8nRes.headers.forEach((value, key) => {
      receivedHeaders[key] = value;
    });
    console.log('[Edge] Headers recebidos do n8n:', JSON.stringify(receivedHeaders));

    const n8nText = await n8nRes.text();
    console.log('[Edge] Resposta do n8n:', n8nRes.status, n8nText);

    // Processar resposta do n8n para validação automática de taxas
    if (n8nRes.ok && n8nText) {
      try {
        let n8nData;
        try {
          n8nData = JSON.parse(n8nText);
        } catch (e) {
          // Se não for JSON, tentar extrair informações do texto
          n8nData = { response: n8nText };
        }

        // Verificar se há validação de proof que precisa ser processada
        if (n8nData && body.user_id) {
          console.log('[Edge] Verificando se precisa processar validação de proof...');
          
          // Verificar diferentes formatos de resposta do n8n
          const hasValidProof = checkForValidProof(n8nData);
          
          if (hasValidProof.isValid) {
            console.log('[Edge] Proof válido detectado, processando atualização automática...');
            
            // Chamar a função de processamento de validação
            const proofValidationPayload = {
              user_id: body.user_id,
              proof_type: hasValidProof.proofType || 'document_validation',
              is_valid: true,
              validation_details: n8nData,
              fee_type: hasValidProof.feeType,
              metadata: {
                original_n8n_response: n8nData,
                processed_at: new Date().toISOString()
              }
            };

            try {
              const supabaseUrl = Deno.env.get('SUPABASE_URL');
              const proofValidationResponse = await fetch(`${supabaseUrl}/functions/v1/process-n8n-proof-validation`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify(proofValidationPayload)
              });

              if (proofValidationResponse.ok) {
                const proofResult = await proofValidationResponse.json();
                console.log('[Edge] Validação de proof processada com sucesso:', proofResult);
              } else {
                console.error('[Edge] Erro ao processar validação de proof:', await proofValidationResponse.text());
              }
            } catch (proofError) {
              console.error('[Edge] Erro ao chamar função de validação de proof:', proofError);
            }
          }
        }
      } catch (processingError) {
        console.error('[Edge] Erro ao processar resposta do n8n:', processingError);
      }
    }

    return new Response(JSON.stringify({
      status: n8nRes.status,
      n8nResponse: n8nText,
      n8nHeaders: receivedHeaders,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.log('[Edge] Erro ao enviar para o n8n:', err);
    return new Response(
      JSON.stringify({
        error: 'Failed to forward to n8n',
        details: err && err.message ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 