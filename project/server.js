import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Headers CORS específicos para o embed.js
app.use('/embed.js', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// API endpoint para embed chat
app.post('/api/embed-chat', async (req, res) => {
  try {
    console.log('[embed-chat] Recebendo requisição:', req.body);
    
    let message, agentId, agentName, companyName, source;

    // Verificar se o body é um array (formato Skilabot) ou objeto simples
    if (Array.isArray(req.body)) {
      // Formato Skilabot: array com objeto contendo body
      const payload = req.body[0];
      console.log('[embed-chat] Payload array:', payload);
      if (payload && payload.body) {
        message = payload.body.message;
        agentId = payload.body.agent_id;
        agentName = payload.body.agent_name;
        companyName = payload.body.company_name;
        source = payload.body.source || 'embed-chat';
      } else {
        console.error('[embed-chat] Payload inválido:', payload);
        return res.status(400).json({ 
          error: 'Invalid payload format',
          response: "Sorry, there was an error processing your message. Please try again in a moment."
        });
      }
    } else {
      // Formato simples: objeto direto
      message = req.body.message;
      agentId = req.body.agentId;
      agentName = req.body.agentName;
      companyName = req.body.companyName;
      source = req.body.source || 'embed-chat';
    }

    if (!message) {
      console.error('[embed-chat] Mensagem ausente');
      return res.status(400).json({ 
        error: 'Message is required',
        response: "Please provide a message to continue."
      });
    }

    console.log('[embed-chat] Recebendo mensagem:', { message, agentId, agentName, companyName, source });

    // Enviar mensagem para o n8n webhook
    const n8nResponse = await fetch('https://nwh.suaiden.com/webhook/notfmatriculausa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PostmanRuntime/7.36.3',
      },
      body: JSON.stringify({
        message,
        agentId,
        agentName,
        companyName,
        source: source || 'embed-chat',
        timestamp: new Date().toISOString()
      }),
    });

    if (!n8nResponse.ok) {
      console.error('[embed-chat] Erro ao enviar para n8n:', n8nResponse.status, n8nResponse.statusText);
      return res.status(500).json({ 
        error: 'Failed to process message',
        response: "Sorry, there was an error processing your message. Please try again in a moment."
      });
    }

    const n8nData = await n8nResponse.text();
    console.log('[embed-chat] Resposta do n8n:', n8nResponse.status, n8nData);

    // Tentar parsear a resposta do n8n
    let aiResponse = "Thank you for your message! Our team will get back to you soon.";
    
    try {
      const parsedData = JSON.parse(n8nData);
      
      // Verificar diferentes possíveis estruturas de resposta
      if (parsedData.output) {
        // Se a resposta vem em um array
        if (Array.isArray(parsedData.output)) {
          aiResponse = parsedData.output[0]?.output || parsedData.output[0] || aiResponse;
        } else {
          // Se a resposta vem diretamente
          aiResponse = parsedData.output;
        }
      } else if (parsedData.response) {
        aiResponse = parsedData.response;
      } else if (parsedData.message) {
        aiResponse = parsedData.message;
      } else if (typeof parsedData === 'string') {
        aiResponse = parsedData;
      } else if (Array.isArray(parsedData)) {
        // Se a resposta é um array
        aiResponse = parsedData[0]?.output || parsedData[0] || aiResponse;
      }
      
      // Se ainda não encontrou uma resposta válida, usar o texto bruto
      if (!aiResponse || aiResponse === "Thank you for your message! Our team will get back to you soon.") {
        aiResponse = n8nData;
      }
      
    } catch (parseError) {
      console.warn('[embed-chat] Erro ao parsear resposta do n8n:', parseError);
      // Se não conseguir parsear, usar o texto bruto
      aiResponse = n8nData;
    }

    // Limpar a resposta se necessário
    if (aiResponse && typeof aiResponse === 'string') {
      // Remover caracteres especiais ou formatação desnecessária
      aiResponse = aiResponse.trim();
      
      // Se a resposta ainda está vazia ou é muito curta, usar resposta padrão
      if (!aiResponse || aiResponse.length < 5) {
        aiResponse = "Thank you for your message! Our team will get back to you soon.";
      }
      
      // Remover aspas extras se existirem
      if (aiResponse.startsWith('"') && aiResponse.endsWith('"')) {
        aiResponse = aiResponse.slice(1, -1);
      }
      
      // Se a resposta contém caracteres de escape, tentar decodificar
      if (aiResponse.includes('\\n') || aiResponse.includes('\\"')) {
        try {
          aiResponse = JSON.parse(aiResponse);
        } catch (e) {
          // Se não conseguir decodificar, manter como está
        }
      }
      
      // Se a resposta ainda está vazia após limpeza, usar resposta padrão
      if (!aiResponse || aiResponse.length < 5) {
        aiResponse = "Thank you for your message! Our team will get back to you soon.";
      }
    }
    
    // Log da resposta final para debug
    console.log('[embed-chat] Resposta final processada:', aiResponse);

    return res.status(200).json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[embed-chat] Erro:', error);
    return res.status(500).json({ 
      error: error.message,
      response: "Sorry, there was an error processing your message. Please try again in a moment."
    });
  }
});

// Servir arquivos estáticos
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 