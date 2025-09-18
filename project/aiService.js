// Versão JavaScript simplificada do AIService para o servidor

export class AIService {
  constructor(provider = 'mock', apiKey) {
    if (provider === 'gemini' && apiKey) {
      this.provider = new GeminiService(apiKey);
    } else {
      this.provider = new MockAIService();
    }
  }

  async processEmail(email) {
    console.log(`AIService - Processando email: ${email.subject}`);
    
    const analysis = await this.provider.analyzeEmail(email);
    console.log(`AIService - Análise:`, analysis);

    if (!analysis.shouldReply) {
      console.log('AIService - Email não deve ser respondido');
      return { analysis };
    }

    const response = await this.provider.generateResponse(email, analysis);
    console.log(`AIService - Resposta gerada: ${response.substring(0, 100)}...`);

    return { analysis, response };
  }

  getProviderName() {
    return this.provider.name;
  }
}

class GeminiService {
  constructor(apiKey, model = 'gemini-1.5-flash') {
    this.name = 'Google Gemini';
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyzeEmail(email) {
    const prompt = `
Analise o seguinte email e determine se deve ser respondido automaticamente:

Assunto: ${email.subject || 'Sem assunto'}
De: ${email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Desconhecido'}
Conteúdo: ${email.bodyPreview || 'Sem conteúdo'}

Responda APENAS em JSON válido com a seguinte estrutura:
{
  "shouldReply": boolean,
  "priority": "low" | "medium" | "high",
  "category": "question" | "complaint" | "support" | "spam" | "general",
  "suggestedResponse": "Resposta sugerida em português",
  "confidence": number (0-1)
}

Regras:
- Responda apenas se for uma pergunta, solicitação de suporte ou reclamação
- Não responda se for spam, promoção ou email interno
- Use tom profissional e útil
- Seja conciso mas completo
- Inclua informações relevantes quando apropriado
- Responda APENAS o JSON, sem texto adicional
`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
            topP: 0.8,
            topK: 10
          }
        })
      });

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        throw new Error('Resposta vazia do Gemini');
      }

      // Extrair JSON da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não contém JSON válido');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Erro ao analisar email com Gemini:', error);
      return {
        shouldReply: false,
        priority: 'low',
        category: 'general',
        suggestedResponse: '',
        confidence: 0
      };
    }
  }

  async generateResponse(email, analysis) {
    const prompt = `
Gere uma resposta profissional para o seguinte email:

Assunto: ${email.subject || 'Sem assunto'}
De: ${email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Desconhecido'}
Conteúdo: ${email.bodyPreview || 'Sem conteúdo'}

Análise:
- Categoria: ${analysis.category}
- Prioridade: ${analysis.priority}
- Resposta sugerida: ${analysis.suggestedResponse}

Gere uma resposta final em português brasileiro que seja:
- Profissional e cortês
- Útil e informativa
- Concisa mas completa
- Adequada ao contexto
- Inclua assinatura automática se apropriado

Responda APENAS o texto da resposta, sem formatação adicional.
`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
            topP: 0.8,
            topK: 10
          }
        })
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || analysis.suggestedResponse;
    } catch (error) {
      console.error('Erro ao gerar resposta com Gemini:', error);
      return analysis.suggestedResponse;
    }
  }
}

class MockAIService {
  constructor() {
    this.name = 'Mock AI';
  }

  async analyzeEmail(email) {
    // Análise simples baseada em palavras-chave
    const subject = (email.subject || '').toLowerCase();
    const content = (email.bodyPreview || '').toLowerCase();
    
    const keywords = {
      question: ['pergunta', 'dúvida', 'como', 'quando', 'onde', 'por que'],
      complaint: ['reclamação', 'problema', 'erro', 'não funciona', 'bug'],
      support: ['suporte', 'ajuda', 'assistência', 'técnico'],
      spam: ['promoção', 'oferta', 'desconto', 'marketing', 'newsletter']
    };

    let category = 'general';
    let shouldReply = true;
    let priority = 'medium';

    // Detectar categoria
    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some(word => subject.includes(word) || content.includes(word))) {
        category = cat;
        break;
      }
    }

    // Detectar spam
    if (category === 'spam') {
      shouldReply = false;
      priority = 'low';
    }

    // Detectar prioridade
    if (category === 'complaint') {
      priority = 'high';
    } else if (category === 'question') {
      priority = 'medium';
    }

    return {
      shouldReply,
      priority,
      category,
      suggestedResponse: `Obrigado pelo seu email. Recebemos sua ${category === 'question' ? 'pergunta' : category === 'complaint' ? 'reclamação' : 'mensagem'} e entraremos em contato em breve.`,
      confidence: 0.8
    };
  }

  async generateResponse(email, analysis) {
    const responses = {
      question: `Olá!

Obrigado pela sua pergunta. Vou analisar sua solicitação e retornar com uma resposta detalhada em breve.

Atenciosamente,
Assistente Automático`,
      complaint: `Olá!

Recebemos sua reclamação e lamentamos pelo inconveniente. Nossa equipe está analisando o caso e entraremos em contato para resolver a situação.

Atenciosamente,
Equipe de Suporte`,
      support: `Olá!

Obrigado por entrar em contato conosco. Nossa equipe de suporte técnico está analisando sua solicitação e retornará em breve.

Atenciosamente,
Equipe de Suporte Técnico`,
      general: `Olá!

Obrigado pelo seu email. Recebemos sua mensagem e entraremos em contato em breve.

Atenciosamente,
Equipe de Atendimento`
    };

    return responses[analysis.category] || responses.general;
  }
}

export default AIService;
