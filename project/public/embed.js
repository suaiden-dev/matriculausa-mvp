(function() {
  'use strict';

  // Verificar se já existe um widget
  if (window.AmatriculaChatWidget) {
    console.log('AmatriculaChat widget already exists');
    return;
  }

  // Configuração padrão
  const defaultConfig = {
    agentId: '',
    userId: '',
    primaryColor: '#dc2626',
    secondaryColor: '#2563eb',
    position: 'bottom-right',
    showHeader: true,
    headerText: 'Chat with AI Assistant',
    welcomeMessage: 'Hello! How can I help you today?',
    enabled: true
  };

  // Mesclar configuração
  const config = { ...defaultConfig, ...window.AmatriculaChatConfig };

  // Verificar se está habilitado
  if (!config.enabled) {
    return;
  }

  // Criar estilos CSS
  const createStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      .amatricula-chat-widget {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
      }

      .amatricula-chat-widget.bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .amatricula-chat-widget.bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .amatricula-chat-widget.top-right {
        top: 20px;
        right: 20px;
      }

      .amatricula-chat-widget.top-left {
        top: 20px;
        left: 20px;
      }

      .amatricula-chat-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%);
      }

      .amatricula-chat-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      .amatricula-chat-button svg {
        width: 24px;
        height: 24px;
        fill: white;
      }

      .amatricula-chat-window {
        position: fixed;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 999999;
      }

      .amatricula-chat-window.open {
        display: flex;
      }

      .amatricula-chat-header {
        background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%);
        color: white;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .amatricula-chat-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .amatricula-chat-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 20px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .amatricula-chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #f8f9fa;
      }

      .amatricula-chat-message {
        margin-bottom: 12px;
        display: flex;
        align-items: flex-start;
      }

      .amatricula-chat-message.user {
        justify-content: flex-end;
      }

      .amatricula-chat-message.assistant {
        justify-content: flex-start;
      }

      .amatricula-chat-message-content {
        max-width: 80%;
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
      }

      .amatricula-chat-message.user .amatricula-chat-message-content {
        background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%);
        color: white;
      }

      .amatricula-chat-message.assistant .amatricula-chat-message-content {
        background: white;
        color: #333;
        border: 1px solid #e1e5e9;
      }

      .amatricula-chat-input {
        padding: 16px;
        border-top: 1px solid #e1e5e9;
        background: white;
      }

      .amatricula-chat-input-container {
        display: flex;
        gap: 8px;
      }

      .amatricula-chat-input-field {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #e1e5e9;
        border-radius: 20px;
        font-size: 14px;
        outline: none;
      }

      .amatricula-chat-input-field:focus {
        border-color: ${config.primaryColor};
      }

      .amatricula-chat-send-button {
        background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%);
        color: white;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }

      .amatricula-chat-send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .amatricula-chat-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #666;
      }

      .amatricula-chat-loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid ${config.primaryColor};
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    return style;
  };

  // Criar ícone SVG
  const createSVGIcon = () => {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>
    `;
  };

  // Criar ícone de fechar
  const createCloseIcon = () => {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    `;
  };

  // Criar ícone de enviar
  const createSendIcon = () => {
    return `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
      </svg>
    `;
  };

  // Classe principal do widget
  class AmatriculaChatWidget {
    constructor(config) {
      this.config = config;
      this.isOpen = false;
      this.messages = [];
      this.isLoading = false;
      this.init();
    }

    init() {
      // Adicionar estilos
      document.head.appendChild(createStyles());

      // Criar elementos
      this.createButton();
      this.createWindow();

      // Adicionar mensagem de boas-vindas
      if (this.config.welcomeMessage) {
        this.addMessage('assistant', this.config.welcomeMessage);
      }
    }

    createButton() {
      this.button = document.createElement('div');
      this.button.className = `amatricula-chat-widget ${this.config.position}`;
      this.button.innerHTML = `
        <button class="amatricula-chat-button" title="Chat with AI Assistant">
          ${createSVGIcon()}
        </button>
      `;

      this.button.querySelector('.amatricula-chat-button').addEventListener('click', () => {
        this.toggle();
      });

      document.body.appendChild(this.button);
    }

    createWindow() {
      this.window = document.createElement('div');
      this.window.className = 'amatricula-chat-window';
      this.window.innerHTML = `
        <div class="amatricula-chat-header">
          <h3>${this.config.headerText}</h3>
          <button class="amatricula-chat-close" title="Close chat">
            ${createCloseIcon()}
          </button>
        </div>
        <div class="amatricula-chat-messages"></div>
        <div class="amatricula-chat-input">
          <div class="amatricula-chat-input-container">
            <input type="text" class="amatricula-chat-input-field" placeholder="Type your message..." />
            <button class="amatricula-chat-send-button" title="Send message">
              ${createSendIcon()}
            </button>
          </div>
        </div>
      `;

      // Event listeners
      this.window.querySelector('.amatricula-chat-close').addEventListener('click', () => {
        this.close();
      });

      const input = this.window.querySelector('.amatricula-chat-input-field');
      const sendButton = this.window.querySelector('.amatricula-chat-send-button');

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      sendButton.addEventListener('click', () => {
        this.sendMessage();
      });

      document.body.appendChild(this.window);
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      this.window.classList.add('open');
      this.window.querySelector('.amatricula-chat-input-field').focus();
    }

    close() {
      this.isOpen = false;
      this.window.classList.remove('open');
    }

    addMessage(sender, content) {
      const message = { sender, content, timestamp: new Date() };
      this.messages.push(message);
      this.renderMessage(message);
    }

    renderMessage(message) {
      const messagesContainer = this.window.querySelector('.amatricula-chat-messages');
      const messageElement = document.createElement('div');
      messageElement.className = `amatricula-chat-message ${message.sender}`;
      messageElement.innerHTML = `
        <div class="amatricula-chat-message-content">
          ${message.content}
        </div>
      `;
      messagesContainer.appendChild(messageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async sendMessage() {
      const input = this.window.querySelector('.amatricula-chat-input-field');
      const sendButton = this.window.querySelector('.amatricula-chat-send-button');
      const content = input.value.trim();

      if (!content || this.isLoading) return;

      // Adicionar mensagem do usuário
      this.addMessage('user', content);
      input.value = '';

      // Desabilitar input durante carregamento
      this.isLoading = true;
      input.disabled = true;
      sendButton.disabled = true;

      // Mostrar loading
      const messagesContainer = this.window.querySelector('.amatricula-chat-messages');
      const loadingElement = document.createElement('div');
      loadingElement.className = 'amatricula-chat-loading';
      loadingElement.innerHTML = `
        <div class="amatricula-chat-loading-spinner"></div>
        AI is typing...
      `;
      messagesContainer.appendChild(loadingElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        console.log('🚀 [embed.js] Enviando mensagem para webhook:', content);
        
        // Enviar mensagem para o webhook
        const response = await fetch(`https://nwh.suaiden.com/webhook/chatbot_embed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            agent_id: this.config.agentId,
            agent_name: this.config.headerText || 'AI Assistant',
            company_name: this.config.headerText || 'AI Assistant',
            conversation_id: `widget_${Date.now()}`,
            user_id: this.config.userId,
            final_prompt: null
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message to webhook: ${response.status} ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log('📥 [embed.js] Resposta bruta do webhook:', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('📊 [embed.js] Dados parseados:', data);
        } catch (parseError) {
          console.warn('⚠️ [embed.js] Erro ao parsear JSON, usando resposta como texto:', parseError);
          data = { response: responseText };
        }
        
        // Remover loading
        messagesContainer.removeChild(loadingElement);

        // Processar resposta da IA com diferentes estruturas possíveis
        let botResponse = null;
        
        if (data) {
          // Tentar diferentes estruturas de resposta
          if (data.response) {
            botResponse = data.response;
            console.log('✅ [embed.js] Resposta encontrada em data.response:', botResponse);
          } else if (data.message) {
            botResponse = data.message;
            console.log('✅ [embed.js] Resposta encontrada em data.message:', botResponse);
          } else if (data.output) {
            // Estrutura do n8n
            if (Array.isArray(data.output)) {
              botResponse = data.output[0]?.output || data.output[0];
            } else {
              botResponse = data.output;
            }
            console.log('✅ [embed.js] Resposta encontrada em data.output:', botResponse);
          } else if (Array.isArray(data) && data.length > 0) {
            // Estrutura de array do n8n
            const firstItem = data[0];
            if (firstItem && firstItem.output) {
              botResponse = firstItem.output;
            } else if (typeof firstItem === 'string') {
              botResponse = firstItem;
            } else {
              botResponse = JSON.stringify(firstItem);
            }
            console.log('✅ [embed.js] Resposta encontrada em array[0]:', botResponse);
          } else if (typeof data === 'string') {
            botResponse = data;
            console.log('✅ [embed.js] Resposta é string direta:', botResponse);
          } else {
            botResponse = JSON.stringify(data);
            console.log('✅ [embed.js] Usando JSON.stringify como fallback:', botResponse);
          }
        }

        // Garantir que a resposta seja uma string válida
        if (typeof botResponse !== 'string') {
          botResponse = String(botResponse);
        }

        // Se não conseguiu extrair resposta, usar mensagem padrão
        if (!botResponse || botResponse.trim() === '') {
          botResponse = 'Thank you for your message. I will get back to you soon.';
          console.warn('⚠️ [embed.js] Nenhuma resposta válida encontrada, usando mensagem padrão');
        }

        console.log('🎯 [embed.js] Resposta final para o chat:', botResponse);
        this.addMessage('assistant', botResponse);

      } catch (error) {
        console.error('❌ [embed.js] Erro ao enviar mensagem para webhook:', error);
        
        // Remover loading
        if (messagesContainer.contains(loadingElement)) {
          messagesContainer.removeChild(loadingElement);
        }
        
        // Adicionar mensagem de erro
        this.addMessage('assistant', 'Sorry, there was an error processing your message. Please try again in a moment.');
      } finally {
        // Reabilitar input
        this.isLoading = false;
        input.disabled = false;
        sendButton.disabled = false;
        input.focus();
      }
    }
  }

  // Inicializar widget
  window.AmatriculaChatWidget = new AmatriculaChatWidget(config);
})(); 