import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

interface Message {
  type: 'user' | 'bot';
  content: string;
}

export const useAgentChat = (agentId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [conversationId] = useState(`conv_${Date.now()}`); // Gera um ID único para toda a conversa
  const { user } = useAuth();

  const sendToN8N = async (message: string, agentName: string, companyName: string, customPrompt?: string) => {
    try {
      console.log('Enviando mensagem para webhook:', {
        message,
        agent_id: agentId,
        agent_name: agentName,
        company_name: companyName,
        conversation_id: conversationId,
        user_id: user?.id,
        custom_prompt: customPrompt
      });
      
      const response = await fetch('https://nwh.suaiden.com/webhook/chatbot-test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          agent_id: agentId,
          agent_name: agentName,
          company_name: companyName,
          conversation_id: conversationId,
          user_id: user?.id,
          custom_prompt: customPrompt
        })
      });

      if (!response.ok) {
        console.error('Webhook response not ok:', await response.text());
        throw new Error('Error sending message to chatbot');
      }

      const data = await response.json();
      console.log('Webhook response:', data);
      return {
        response: data.response || data.output || 'Desculpe, não consegui processar sua mensagem.',
        jsonRobo: data.jsonRobo
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const handleSendMessage = useCallback(async () => {
    console.log('handleSendMessage chamado');
    if (!inputMessage.trim() || isChatLoading) {
      console.log('Mensagem vazia ou chat carregando, ignorando');
      return;
    }

    try {
      setIsChatLoading(true);
      
      // Adiciona a mensagem do usuário
      const userMessage: Message = { type: 'user', content: inputMessage.trim() };
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');

      console.log('Buscando dados do agente:', agentId);
      // Busca os dados do agente incluindo custom_prompt
      const { data: agentData, error: agentError } = await supabase
        .from('ai_configurations')
        .select('ai_name, company_name, custom_prompt')
        .eq('id', agentId)
        .single();

      if (agentError) {
        console.error('Erro ao buscar dados do agente:', agentError);
        throw agentError;
      }

      console.log('Dados do agente:', agentData);

      if (!agentData) {
        throw new Error('Agent configuration not found');
      }

      // Envia para o webhook
      const { response } = await sendToN8N(userMessage.content, agentData.ai_name, agentData.company_name, agentData.custom_prompt);

      // Adiciona a resposta do bot
      const botMessage: Message = { type: 'bot', content: response };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      // Adiciona mensagem de erro
      setMessages(prev => [...prev, {
        type: 'bot',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [inputMessage, isChatLoading, agentId, user?.id]);

  return {
    messages,
    inputMessage,
    setInputMessage,
    handleSendMessage,
    isChatLoading
  };
};