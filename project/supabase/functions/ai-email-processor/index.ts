import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIProcessorRequest {
  conversationId: string;
  emailData: {
    messageId: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    htmlBody?: string;
    timestamp: string;
    threadId?: string;
  };
}

interface AIResponse {
  success: boolean;
  response: string;
  confidence: number;
  tokens_used?: number;
  cost?: number;
}

// Função para buscar configurações de IA da universidade
async function getAISettings(supabase: any, conversationId: string): Promise<any> {
  console.log('⚙️ Getting AI settings for conversation:', conversationId);
  
  const { data: conversation, error: convError } = await supabase
    .from('ai_email_conversations')
    .select('university_id')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error('Conversation not found');
  }

  const { data: settings, error } = await supabase
    .from('university_ai_settings')
    .select('*')
    .eq('university_id', conversation.university_id)
    .single();

  if (error || !settings) {
    throw new Error('AI settings not found');
  }

  console.log('✅ AI settings loaded:', {
    isEnabled: settings.is_ai_enabled,
    tone: settings.response_tone,
    provider: settings.ai_service_provider,
    model: settings.ai_model
  });

  return settings;
}

// Função para buscar histórico de conversa
async function getConversationHistory(supabase: any, senderEmail: string, universityId: string): Promise<any[]> {
  console.log('📚 Getting conversation history for:', senderEmail);
  
  const { data: history, error } = await supabase
    .from('ai_email_conversations')
    .select('email_subject, email_body, ai_response_body, received_at, responded_at')
    .eq('sender_email', senderEmail)
    .eq('university_id', universityId)
    .in('status', ['answered', 'manual_intervention_needed'])
    .order('received_at', { ascending: false })
    .limit(5); // Últimas 5 conversas

  if (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }

  console.log(`📚 Found ${history?.length || 0} previous conversations`);
  return history || [];
}

// Função para verificar triggers de intervenção manual
function checkManualInterventionTriggers(emailContent: string, triggers: string[]): boolean {
  const content = emailContent.toLowerCase();
  return triggers.some(trigger => content.includes(trigger.toLowerCase()));
}

// Função para criar prompt para a IA
function createAIPrompt(
  aiSettings: any,
  emailData: any,
  conversationHistory: any[],
  universityName: string
): string {
  console.log('🤖 Creating AI prompt');
  
  const baseInstructions = aiSettings.custom_instructions || 
    'Você é um assistente de admissões virtual, amigável e eficiente, trabalhando para esta universidade. Sua comunicação deve ser clara, profissional e encorajadora. Você representa a plataforma Matrícula USA.';

  const toneInstructions = {
    'formal': 'Use um tom formal e profissional em suas respostas.',
    'friendly': 'Use um tom amigável e acolhedor em suas respostas.',
    'neutral': 'Use um tom neutro e equilibrado em suas respostas.'
  };

  const historyContext = conversationHistory.length > 0 
    ? `\n\nHistórico de conversas anteriores com este remetente:\n${conversationHistory.map(conv => 
        `- ${conv.received_at}: ${conv.email_subject} → ${conv.ai_response_body?.substring(0, 100)}...`
      ).join('\n')}`
    : '';

  const prompt = `
${baseInstructions}

${toneInstructions[aiSettings.response_tone] || toneInstructions.friendly}

Contexto da Universidade: ${universityName}

Regras importantes:
1. Sempre responda no mesmo idioma do email recebido
2. Seja conciso e direto ao ponto
3. Se não tiver certeza sobre algo, sugira que o assunto será encaminhado para a equipe humana
4. Nunca prometa informações sobre bolsas de estudo sem confirmação
5. Se o email expressar frustração ou urgência extrema, sugira contato direto com a equipe
6. Mantenha o tom ${aiSettings.response_tone}

${historyContext}

Email recebido:
De: ${emailData.from}
Assunto: ${emailData.subject}
Conteúdo: ${emailData.body}

Por favor, gere uma resposta apropriada para este email. A resposta deve ser profissional, útil e alinhada com o contexto da universidade.
`;

  console.log('📝 Prompt created, length:', prompt.length);
  return prompt;
}

// Função para chamar a API de IA (OpenAI)
async function callOpenAI(prompt: string, model: string = 'gpt-4o'): Promise<AIResponse> {
  console.log('🤖 Calling OpenAI API with model:', model);
  
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em admissões universitárias. Responda de forma clara, profissional e útil.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    console.log('✅ OpenAI response received:', {
      model: data.model,
      usage: data.usage,
      processingTime
    });

    return {
      success: true,
      response: data.choices[0].message.content,
      confidence: 0.8, // Placeholder - could be calculated based on response quality
      tokens_used: data.usage?.total_tokens,
      cost: calculateCost(data.usage, model)
    };

  } catch (error) {
    console.error('❌ OpenAI API call failed:', error);
    throw error;
  }
}

// Função para calcular custo da API
function calculateCost(usage: any, model: string): number {
  if (!usage) return 0;
  
  const rates = {
    'gpt-4o': { input: 0.0025, output: 0.01 }, // per 1K tokens
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 }
  };

  const rate = rates[model] || rates['gpt-4o'];
  const inputCost = (usage.prompt_tokens / 1000) * rate.input;
  const outputCost = (usage.completion_tokens / 1000) * rate.output;
  
  return inputCost + outputCost;
}

// Função para enviar resposta via Gmail
async function sendEmailResponse(supabase: any, conversationId: string, aiResponse: string): Promise<void> {
  console.log('📧 Sending email response');
  
  // Buscar dados da conversa
  const { data: conversation, error: convError } = await supabase
    .from('ai_email_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    throw new Error('Conversation not found');
  }

  // Buscar conexão Gmail da universidade
  const { data: connections, error: connError } = await supabase
    .from('email_connections')
    .select('*')
    .eq('user_id', conversation.university_id)
    .eq('provider', 'google')
    .limit(1);

  if (connError || !connections || connections.length === 0) {
    throw new Error('No Gmail connection found for university');
  }

  const connection = connections[0];

  // Preparar dados do email
  const emailData = {
    to: conversation.sender_email,
    subject: `Re: ${conversation.email_subject}`,
    htmlBody: aiResponse,
    threadId: conversation.thread_id
  };

  // Enviar via Gmail API
  const gmailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-gmail-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify(emailData)
  });

  if (!gmailResponse.ok) {
    const errorText = await gmailResponse.text();
    throw new Error(`Failed to send email: ${errorText}`);
  }

  console.log('✅ Email response sent successfully');
}

// Função para registrar métricas
async function recordMetrics(supabase: any, conversationId: string, aiResponse: AIResponse, processingTime: number): Promise<void> {
  console.log('📊 Recording metrics');
  
  const { error } = await supabase
    .from('ai_email_metrics')
    .insert({
      conversation_id: conversationId,
      processing_time_ms: processingTime,
      ai_service_provider: 'openai',
      ai_model_used: 'gpt-4o',
      prompt_tokens: aiResponse.tokens_used,
      completion_tokens: aiResponse.tokens_used,
      response_confidence_score: aiResponse.confidence,
      cost_usd: aiResponse.cost || 0
    });

  if (error) {
    console.error('Error recording metrics:', error);
  } else {
    console.log('✅ Metrics recorded successfully');
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('🤖 ai-email-processor: Processing request');
    
    const { conversationId, emailData }: AIProcessorRequest = await req.json();
    
    console.log('🤖 ai-email-processor: Request data:', {
      conversationId,
      senderEmail: emailData.from,
      subject: emailData.subject
    });

    // Inicializar Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar configurações de IA
    const aiSettings = await getAISettings(supabase, conversationId);

    // Verificar triggers de intervenção manual
    const emailContent = `${emailData.subject} ${emailData.body}`;
    if (checkManualInterventionTriggers(emailContent, aiSettings.forward_to_human_triggers)) {
      console.log('⚠️ Manual intervention triggers detected');
      
      await supabase
        .from('ai_email_conversations')
        .update({ 
          status: 'manual_intervention_needed',
          error_details: 'Manual intervention triggers detected in email content'
        })
        .eq('id', conversationId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email marked for manual intervention',
          reason: 'Triggers detected'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Buscar histórico de conversa
    const conversationHistory = await getConversationHistory(supabase, emailData.from, aiSettings.university_id);

    // Buscar nome da universidade
    const { data: university } = await supabase
      .from('universities')
      .select('name')
      .eq('id', aiSettings.university_id)
      .single();

    // Criar prompt para IA
    const prompt = createAIPrompt(aiSettings, emailData, conversationHistory, university?.name || 'Universidade');

    // Chamar API de IA
    const aiResponse = await callOpenAI(prompt, aiSettings.ai_model);

    // Enviar resposta via email
    await sendEmailResponse(supabase, conversationId, aiResponse.response);

    // Atualizar status da conversa
    const processingTime = Date.now() - startTime;
    await supabase
      .from('ai_email_conversations')
      .update({
        status: 'answered',
        ai_response_body: aiResponse.response,
        responded_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        confidence_score: aiResponse.confidence
      })
      .eq('id', conversationId);

    // Registrar métricas
    await recordMetrics(supabase, conversationId, aiResponse, processingTime);

    console.log('✅ AI email processing completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email processed and responded successfully',
        processingTime,
        confidence: aiResponse.confidence,
        cost: aiResponse.cost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in AI email processor:', error);
    
    // Atualizar status para error se conversationId estiver disponível
    try {
      const { conversationId } = await req.json();
      if (conversationId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase
          .from('ai_email_conversations')
          .update({
            status: 'error',
            error_details: error.message
          })
          .eq('id', conversationId);
      }
    } catch (updateError) {
      console.error('Error updating conversation status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 