/**
 * Amatricula USA Chat Embed Script
 * 
 * Como usar:
 * 1. Inclua este script no seu site:
 *    <script src="https://seu-dominio.com/embed.js"></script>
 * 
 * 2. Configure o chat:
 *    <script>
 *      AmatriculaChat.init({
 *        agentId: 'seu-agent-id',
 *        agentName: 'Nome do Bot',
 *        companyName: 'Sua Empresa',
 *        primaryColor: '#3B82F6',
 *        secondaryColor: '#1E40AF'
 *      });
 *    </script>
 */

(function() {
    'use strict';

    // Configuração padrão
    const defaultConfig = {
        agentId: null,
        agentName: 'AI Assistant',
        companyName: 'Amatricula USA',
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
        width: '400px',
        height: '600px',
        zIndex: 9999
    };

    // Estado global do chat
    let chatConfig = {};
    let chatIframe = null;
    let chatButton = null;
    let isChatOpen = false;

    // Função para criar o botão flutuante
    function createChatButton() {
        if (chatButton) return;

        chatButton = document.createElement('div');
        chatButton.id = 'amatricula-chat-button';
        chatButton.innerHTML = `
            <button 
                class="amatricula-chat-btn"
                title="Open chat"
                style="
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    transition: all 0.3s ease;
                    background: linear-gradient(135deg, ${chatConfig.primaryColor} 0%, ${chatConfig.secondaryColor} 100%);
                    position: fixed;
                    ${chatConfig.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                    ${chatConfig.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                    z-index: ${chatConfig.zIndex};
                "
                onmouseover="this.style.transform='scale(1.1)'"
                onmouseout="this.style.transform='scale(1)'"
                onclick="AmatriculaChat.toggle()"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        `;

        document.body.appendChild(chatButton);
    }

    // Função para criar o iframe do chat
    function createChatIframe() {
        if (chatIframe) return;

        chatIframe = document.createElement('div');
        chatIframe.id = 'amatricula-chat-iframe';
        chatIframe.style.cssText = `
            position: fixed;
            ${chatConfig.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
            ${chatConfig.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
            width: ${chatConfig.width};
            height: ${chatConfig.height};
            z-index: ${chatConfig.zIndex + 1};
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            background: white;
            display: none;
            overflow: hidden;
        `;

        // Criar iframe
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 12px;
        `;

        // Construir URL com parâmetros
        const params = new URLSearchParams({
            agentId: chatConfig.agentId || '',
            agentName: encodeURIComponent(chatConfig.agentName),
            companyName: encodeURIComponent(chatConfig.companyName),
            primaryColor: chatConfig.primaryColor,
            secondaryColor: chatConfig.secondaryColor
        });

        // Usar a URL correta do embed.html
        const embedUrl = `${window.location.protocol}//${window.location.host}/embed.html?${params.toString()}`;
        console.log('[embed.js] URL do iframe:', embedUrl);
        iframe.src = embedUrl;

        // Adicionar listener para mensagens do iframe
        iframe.onload = function() {
            console.log('[embed.js] Amatricula Chat iframe loaded');
            console.log('[embed.js] Iframe src:', iframe.src);
            console.log('[embed.js] Iframe contentWindow:', iframe.contentWindow);
        };

        chatIframe.appendChild(iframe);
        document.body.appendChild(chatIframe);

        // Listener para mensagens do iframe
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type) {
                handleIframeMessage(event.data);
            }
        });
    }

    // Função para lidar com mensagens do iframe
    function handleIframeMessage(data) {
        console.log('[embed.js] Mensagem recebida do iframe:', data);
        switch (data.type) {
            case 'CHAT_READY':
                console.log('[embed.js] Chat is ready:', data.config);
                break;
            case 'USER_MESSAGE':
                console.log('[embed.js] Enviando mensagem para API:', data.data);
                // Enviar mensagem para nossa API
                sendMessageToAPI(data.data);
                break;
            case 'CLOSE_CHAT':
                console.log('[embed.js] Fechando chat');
                AmatriculaChat.close();
                break;
            default:
                console.log('[embed.js] Tipo de mensagem desconhecido:', data.type);
        }
    }

    // Função para enviar mensagem para nossa API
    async function sendMessageToAPI(messageData) {
        console.log('🚀 [embed.js] ===== INICIANDO ENVIO DE MENSAGEM =====');
        console.log('🚀 [embed.js] Versão atualizada do embed.js carregada!');
        
        try {
            console.log('[embed.js] Iniciando envio de mensagem:', messageData);
            
            // Extrair dados da mensagem
            const message = messageData.message || messageData;
            const agentId = messageData.agentId || chatConfig.agentId;
            const agentName = messageData.agentName || chatConfig.agentName;
            const companyName = messageData.companyName || chatConfig.companyName;
            
            // Usar a mesma abordagem do Skilabot - chamar diretamente o webhook do n8n
            const payload = {
                message: message,
                agentId: agentId,
                agentName: agentName,
                companyName: companyName,
                source: 'embed-chat',
                timestamp: new Date().toISOString()
            };

            console.log('[embed.js] Enviando para n8n:', payload);

            // Chamar diretamente o webhook do n8n (como o Skilabot faz)
            const response = await fetch('https://nwh.suaiden.com/webhook/chatbot_embed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'PostmanRuntime/7.36.3',
                    'Accept': '*/*',
                    'Accept-Language': navigator.language || 'en-US',
                },
                body: JSON.stringify(payload),
            });

            console.log('[embed.js] Status da resposta:', response.status, response.statusText);

            if (response.ok) {
                const responseData = await response.text();
                console.log('[embed.js] Resposta bruta do n8n:', responseData);
                
                let botResponse = null;
                try {
                    const jsonResponse = JSON.parse(responseData);
                    console.log('[embed.js] JSON parseado:', jsonResponse);
                    
                    // Simplificar o parsing - focar na estrutura do n8n
                    if (Array.isArray(jsonResponse) && jsonResponse.length > 0) {
                        const firstItem = jsonResponse[0];
                        console.log('[embed.js] Primeiro item do array:', firstItem);
                        if (firstItem && firstItem.output) {
                            botResponse = firstItem.output;
                            console.log('✅ [embed.js] Resposta extraída do array[0].output:', botResponse);
                        } else if (firstItem && typeof firstItem === 'string') {
                            botResponse = firstItem;
                            console.log('✅ [embed.js] Resposta extraída do array[0] (string):', botResponse);
                        } else {
                            botResponse = JSON.stringify(firstItem);
                            console.log('✅ [embed.js] Resposta extraída do array[0] (fallback):', botResponse);
                        }
                    } else if (jsonResponse.output) {
                        if (Array.isArray(jsonResponse.output)) {
                            botResponse = jsonResponse.output[0]?.output || jsonResponse.output[0];
                        } else {
                            botResponse = jsonResponse.output;
                        }
                        console.log('✅ [embed.js] Resposta extraída do output:', botResponse);
                    } else if (jsonResponse.response) {
                        botResponse = jsonResponse.response;
                        console.log('✅ [embed.js] Resposta extraída do response:', botResponse);
                    } else if (jsonResponse.message) {
                        botResponse = jsonResponse.message;
                        console.log('✅ [embed.js] Resposta extraída do message:', botResponse);
                    } else {
                        botResponse = responseData;
                        console.log('✅ [embed.js] Usando responseData como fallback:', botResponse);
                    }
                } catch (e) {
                    console.warn('[embed.js] Erro ao parsear resposta:', e);
                    botResponse = responseData;
                    console.log('✅ [embed.js] Usando responseData após erro:', botResponse);
                }

                console.log('🎯 [embed.js] Resposta final processada:', botResponse);
                
                // Garantir que a resposta seja uma string válida
                if (typeof botResponse !== 'string') {
                    botResponse = String(botResponse);
                    console.log('[embed.js] Convertendo resposta para string:', botResponse);
                }
                
                // Enviar resposta de volta para o iframe
                if (chatIframe && chatIframe.querySelector('iframe')) {
                    const iframe = chatIframe.querySelector('iframe');
                    console.log('[embed.js] Enviando resposta para iframe:', botResponse);
                    
                    try {
                        iframe.contentWindow.postMessage({
                            type: 'CHAT_RESPONSE',
                            response: botResponse || "Thank you for your message! Our team will get back to you soon."
                        }, '*');
                        console.log('✅ [embed.js] Mensagem enviada com sucesso para o iframe');
                    } catch (error) {
                        console.error('[embed.js] Erro ao enviar mensagem para iframe:', error);
                    }
                } else {
                    console.error('[embed.js] Iframe não encontrado para enviar resposta');
                }
            } else {
                console.error('Error response from n8n:', response.status, response.statusText);
                // Enviar resposta de erro para o iframe
                if (chatIframe && chatIframe.querySelector('iframe')) {
                    chatIframe.querySelector('iframe').contentWindow.postMessage({
                        type: 'CHAT_RESPONSE',
                        response: "Sorry, there was an error processing your message. Please try again in a moment."
                    }, '*');
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Enviar resposta de erro para o iframe
            if (chatIframe && chatIframe.querySelector('iframe')) {
                chatIframe.querySelector('iframe').contentWindow.postMessage({
                    type: 'CHAT_RESPONSE',
                    response: "Sorry, there was an error processing your message. Please try again in a moment."
                }, '*');
            }
        }
    }

    // API pública do AmatriculaChat
    window.AmatriculaChat = {
        // Inicializar o chat
        init: function(config = {}) {
            chatConfig = { ...defaultConfig, ...config };
            createChatButton();
            createChatIframe();
            console.log('Amatricula Chat initialized with config:', chatConfig);
        },

        // Abrir/fechar o chat
        toggle: function() {
            if (isChatOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        // Abrir o chat
        open: function() {
            if (chatIframe) {
                chatIframe.style.display = 'block';
                isChatOpen = true;
                
                // Animar entrada
                chatIframe.style.opacity = '0';
                chatIframe.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    chatIframe.style.transition = 'all 0.3s ease';
                    chatIframe.style.opacity = '1';
                    chatIframe.style.transform = 'scale(1)';
                }, 10);
            }
        },

        // Fechar o chat
        close: function() {
            if (chatIframe) {
                // Animar saída
                chatIframe.style.transition = 'all 0.3s ease';
                chatIframe.style.opacity = '0';
                chatIframe.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    chatIframe.style.display = 'none';
                    isChatOpen = false;
                }, 300);
            }
        },

        // Destruir o chat
        destroy: function() {
            if (chatButton) {
                chatButton.remove();
                chatButton = null;
            }
            if (chatIframe) {
                chatIframe.remove();
                chatIframe = null;
            }
            isChatOpen = false;
        },

        // Atualizar configuração
        updateConfig: function(newConfig) {
            chatConfig = { ...chatConfig, ...newConfig };
            this.destroy();
            this.init(chatConfig);
        }
    };

    // Auto-inicialização se configurado
    if (window.AmatriculaChatConfig) {
        window.AmatriculaChat.init(window.AmatriculaChatConfig);
    }

})(); 