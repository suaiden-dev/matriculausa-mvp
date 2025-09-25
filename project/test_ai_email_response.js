// Script para testar a resposta da IA quando processa um email
// Simula exatamente o que acontece na edge function

import { loadEnv } from './load_env.js';

// Carregar variáveis de ambiente do arquivo .env
loadEnv();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

console.log('🔑 GEMINI_API_KEY carregada:', GEMINI_API_KEY ? '✅ SIM' : '❌ NÃO');
if (GEMINI_API_KEY) {
  console.log('🔑 Chave (primeiros 10 chars):', GEMINI_API_KEY.substring(0, 10) + '...');
}

// Simular a classe AIService da edge function
class AIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.rpm = 30;
    this.lastApiCall = 0;
  }

  async processEmail(email, userId) {
    try {
      console.log(`🤖 AIService - Processando email: ${email.subject} (${email.from?.emailAddress?.address})`);
      
      // Simular busca de prompt da universidade
      const universityPrompt = await this.getUniversityPrompt(userId);
      
      // Simular busca de base de conhecimento
      const knowledgeBase = await this.getEmailKnowledgeBase(userId);
      
      // Criar prompt para o Gemini
      const prompt = this.createEmailPrompt(email, universityPrompt, knowledgeBase);
      
      // Chamar API do Gemini
      const response = await this.callGeminiAPI(prompt);
      
      // Processar resposta
      const result = this.processGeminiResponse(response);
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao processar email:', error);
      return this.simpleEmailAnalysis(email);
    }
  }

  async getUniversityPrompt(userId) {
    console.log(`📚 Buscando prompt da universidade para usuário: ${userId}`);
    // Simular prompt da universidade
    return `Você é um assistente virtual especializado em admissões universitárias da Matrícula USA. 
    Responda de forma profissional e útil aos estudantes brasileiros interessados em estudar nos Estados Unidos.
    Use um tom acolhedor e informativo.`;
  }

  async getEmailKnowledgeBase(userId) {
    console.log(`📖 Buscando base de conhecimento para usuário: ${userId}`);
    // Simular base de conhecimento
    return `Base de conhecimento sobre:
    - Processo de aplicação universitária nos EUA
    - Documentos necessários (TOEFL, SAT, transcrições)
    - Bolsas de estudo disponíveis
    - Prazos importantes
    - Requisitos de visto`;
  }

  createEmailPrompt(email, universityPrompt, knowledgeBase) {
    const emailContext = `
EMAIL RECEBIDO:
- Assunto: ${email.subject}
- Remetente: ${email.from?.emailAddress?.address}
- Conteúdo: ${email.bodyPreview}

INSTRUÇÕES:
- Responda APENAS em JSON válido
- Use tom profissional adequado para email
- Seja específico e útil na resposta
- SEMPRE responda no mesmo idioma do email original

FORMATO JSON DE RESPOSTA:
{
  "shouldReply": boolean,
  "priority": "high|medium|low", 
  "category": "application|documents|payment|scholarship|admission|general",
  "confidence": 0.0-1.0,
  "response": "Resposta personalizada e útil"
}`;

    return `${universityPrompt}

${knowledgeBase ? `<knowledge-base>\n${knowledgeBase}\n</knowledge-base>\n\nIMPORTANTE: Use as informações da base de conhecimento acima para responder às perguntas dos estudantes.` : ''}

${emailContext}`;
  }

  async callGeminiAPI(prompt) {
    if (!this.apiKey || this.apiKey === 'your-gemini-api-key-here') {
      console.log('⚠️ GEMINI_API_KEY não configurada, simulando resposta');
      return this.simulateGeminiResponse();
    }

    try {
      console.log('🚀 Chamando API do Gemini...');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('❌ Erro na API do Gemini:', error);
      return this.simulateGeminiResponse();
    }
  }

  simulateGeminiResponse() {
    // Simular diferentes tipos de resposta do Gemini
    const responses = [
      `{
        "shouldReply": true,
        "priority": "high",
        "category": "application",
        "confidence": 0.95,
        "response": "Olá! Obrigado pelo seu interesse em estudar nos Estados Unidos. Posso te ajudar com informações sobre o processo de aplicação universitária. Como posso te auxiliar hoje?"
      }`,
      `{
        "shouldReply": false,
        "priority": "low",
        "category": "general",
        "confidence": 0.9,
        "response": "Este parece ser um email automático que não requer resposta."
      }`,
      `{
        "shouldReply": true,
        "priority": "medium",
        "category": "documents",
        "confidence": 0.85,
        "response": "Olá! Para documentos, você precisará de transcrições oficiais, TOEFL/IELTS, SAT/ACT, e cartas de recomendação. Posso te ajudar com mais detalhes sobre cada um?"
      }`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  processGeminiResponse(responseText) {
    console.log('🔍 Resposta bruta do Gemini:', JSON.stringify(responseText));
    console.log('🔍 Tamanho da resposta:', responseText.length);
    
    // Limpar markdown se presente
    if (responseText.includes('```json')) {
      responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      console.log('🔍 Após remover markdown:', JSON.stringify(responseText));
    }
    
    // Sanitizar JSON
    responseText = this.sanitizeGeminiJSON(responseText);
    console.log('🔍 Após sanitização:', JSON.stringify(responseText));
    
    try {
      const result = JSON.parse(responseText);
      console.log('✅ JSON parseado com sucesso');
      return {
        analysis: {
          shouldReply: result.shouldReply,
          priority: result.priority,
          category: result.category,
          confidence: result.confidence
        },
        response: result.response
      };
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('JSON problemático:', responseText.substring(0, 500));
      
      // Fallback para análise simples
      return this.simpleEmailAnalysis({ subject: 'Email de teste', from: { emailAddress: { address: 'test@example.com' } } });
    }
  }

  sanitizeGeminiJSON(jsonString) {
    // Remover markdown se presente
    let cleaned = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Remover caracteres de controle problemáticos
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // Garantir que seja um objeto válido
    if (!cleaned.startsWith('{')) {
      cleaned = '{' + cleaned;
    }
    if (!cleaned.endsWith('}')) {
      cleaned = cleaned + '}';
    }
    
    return cleaned;
  }

  simpleEmailAnalysis(email) {
    console.log('🔄 Usando análise simples como fallback');
    
    const subject = email.subject?.toLowerCase() || '';
    const fromAddress = email.from?.emailAddress?.address?.toLowerCase() || '';
    
    // Detectar se é email de sistema
    const systemPatterns = ['noreply', 'no-reply', 'donotreply', 'do-not-reply'];
    const isSystemEmail = systemPatterns.some(pattern => fromAddress.includes(pattern));
    
    if (isSystemEmail) {
      return {
        analysis: {
          shouldReply: false,
          priority: 'low',
          category: 'system',
          confidence: 0.95
        },
        response: null
      };
    }
    
    // Resposta genérica
    return {
      analysis: {
        shouldReply: true,
        priority: 'medium',
        category: 'general',
        confidence: 0.7
      },
      response: 'Olá! Obrigado pelo seu contato com a Matrícula USA. Como posso te ajudar hoje com seu processo de admissão universitária nos Estados Unidos?'
    };
  }
}

// Função principal de teste
async function testAIEmailResponse() {
  console.log('🧪 Iniciando teste da IA para processamento de emails\n');
  
  // Criar instância da IA
  const aiService = new AIService(GEMINI_API_KEY);
  
  // Emails de teste
  const testEmails = [
    {
      subject: 'Olá, como está?',
      from: { emailAddress: { address: 'estudante@example.com' } },
      bodyPreview: 'Oi, tudo bem? Queria saber mais sobre estudar nos EUA.'
    },
    {
      subject: 'Dúvidas sobre documentos',
      from: { emailAddress: { address: 'maria@example.com' } },
      bodyPreview: 'Preciso saber quais documentos são necessários para aplicar nas universidades americanas.'
    },
    {
      subject: 'Verify your account to do more with Outlook.com',
      from: { emailAddress: { address: 'member_services@outlook.com' } },
      bodyPreview: 'This is an automated message from Outlook.com regarding message limits.'
    },
    {
      subject: 'Bolsas de estudo',
      from: { emailAddress: { address: 'joao@example.com' } },
      bodyPreview: 'Gostaria de informações sobre bolsas de estudo disponíveis para estudantes brasileiros.'
    }
  ];
  
  console.log(`📧 Testando ${testEmails.length} emails diferentes\n`);
  
  for (let i = 0; i < testEmails.length; i++) {
    const email = testEmails[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📧 EMAIL ${i + 1}: ${email.subject}`);
    console.log(`📤 De: ${email.from.emailAddress.address}`);
    console.log(`📝 Conteúdo: ${email.bodyPreview}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      const result = await aiService.processEmail(email, 'test-user-id');
      
      console.log('📊 RESULTADO DA ANÁLISE:');
      console.log(`- Deve responder: ${result.analysis.shouldReply ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`- Prioridade: ${result.analysis.priority}`);
      console.log(`- Categoria: ${result.analysis.category}`);
      console.log(`- Confiança: ${result.analysis.confidence}`);
      
      if (result.response) {
        console.log('\n💬 RESPOSTA GERADA:');
        console.log(result.response);
      } else {
        console.log('\n🚫 Nenhuma resposta gerada');
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar email:', error.message);
    }
    
    // Pausa entre emails para simular processamento real
    if (i < testEmails.length - 1) {
      console.log('\n⏳ Aguardando 2 segundos antes do próximo email...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n✅ Teste concluído!');
}

// Executar teste
testAIEmailResponse().catch(console.error);

export { AIService, testAIEmailResponse };
