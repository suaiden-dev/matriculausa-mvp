import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function handleChatRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { message, agentId, userId } = await request.json();

    if (!message || !agentId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Buscar configuração do agente
    const { data: agent, error: agentError } = await supabase
      .from('ai_configurations')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Buscar configurações da universidade
    const { data: universitySettings, error: settingsError } = await supabase
      .from('university_ai_settings')
      .select('*')
      .eq('university_id', agent.university_id)
      .single();

    if (settingsError) {
      console.error('Error fetching university settings:', settingsError);
    }

    // Buscar documentos de conhecimento do agente
    const { data: knowledgeDocs, error: knowledgeError } = await supabase
      .from('ai_agent_knowledge_documents')
      .select('transcription')
      .eq('ai_configuration_id', agentId)
      .not('transcription', 'is', null);

    if (knowledgeError) {
      console.error('Error fetching knowledge documents:', knowledgeError);
    }

    // Construir contexto com documentos de conhecimento
    let knowledgeContext = '';
    if (knowledgeDocs && knowledgeDocs.length > 0) {
      knowledgeContext = '\n\nKnowledge Base:\n' + knowledgeDocs
        .map(doc => doc.transcription)
        .join('\n\n');
    }

    // Construir prompt final
    const systemPrompt = `You are ${agent.ai_name}, an AI assistant for ${agent.company_name || 'Matrícula USA'}. 

${agent.custom_prompt || ''}

${universitySettings?.custom_instructions || ''}

Your role is to help students with university admissions and provide helpful, accurate information. Always be friendly, professional, and encouraging.

${knowledgeContext}

Current conversation context: The user is asking about university admissions, scholarships, or related topics.

Please respond in a helpful and informative way. Keep responses concise but comprehensive.`;

    // Chamar API da OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error');
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0]?.message?.content || 'Sorry, I could not process your message.';

    // Salvar conversa no banco (opcional)
    try {
      await supabase
        .from('ai_email_conversations')
        .insert({
          university_id: agent.university_id,
          sender_email: `widget-${userId}@amatricula.com`,
          email_subject: 'Chat Widget Conversation',
          email_body: message,
          ai_response_body: aiResponse,
          status: 'answered',
          responded_at: new Date().toISOString(),
        });
    } catch (saveError) {
      console.error('Error saving conversation:', saveError);
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 