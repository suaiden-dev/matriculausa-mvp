import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { WhatsAppConnection } from '../types';
import { createChatwootAccount } from '../utils/chatwootUtils';
import { generateUniqueInstanceName } from '../utils/whatsappUtils';
import { generateQRCode } from '../services/whatsappService';

export const useWhatsAppConnection = (university: any, user: any) => {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchConnections = useCallback(async (agentId?: string) => {
    if (!university?.id) {
      console.log('❌ Cannot fetch connections - no university ID');
      return;
    }
    
    setLoading(true);
    try {
      const query = supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('university_id', university.id);

      if (agentId) {
        query.eq('ai_configuration_id', agentId);
      }

      const { data: connections, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching connections:', error);
        return;
      }

      setConnections(connections || []);
    } catch (error) {
      console.error('❌ Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  }, [university?.id]);

  const createConnection = async (agentId?: string) => {
    if (!university || !user) {
      throw new Error('University or user information not available');
    }

    const instanceName = generateUniqueInstanceName(user.email);
    
    try {
      // 1. Configurar Chatwoot
      await createChatwootAccount(user, instanceName, agentId);

      // 2. Gerar QR Code
      const qrCodePayload = {
        instance_name: instanceName,
        university_id: university.id,
        university_name: university.name,
        user_email: user.email,
        user_id: user.id,
        agent_id: agentId,
        timestamp: new Date().toISOString(),
        user_metadata: { ...user },
        university_metadata: { ...university }
      };

      const qrCodeData = await generateQRCode(qrCodePayload);

      // 3. Buscar final_prompt do agente e criar conexão no banco
      let agentFinalPrompt = null;
      if (agentId) {
        const { data: agentData, error: agentError } = await supabase
          .from('ai_configurations')
          .select('final_prompt')
          .eq('id', agentId)
          .single();
        
        if (!agentError && agentData?.final_prompt) {
          agentFinalPrompt = agentData.final_prompt;
        }
      }

      const newConnection = {
        university_id: university.id,
        user_id: user.id,
        ai_configuration_id: agentId,
        phone_number: 'Connecting...',
        connection_status: 'connecting',
        instance_name: instanceName,
        final_prompt: agentFinalPrompt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: savedConnection, error: saveError } = await supabase
        .from('whatsapp_connections')
        .insert([newConnection])
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      return {
        connection: savedConnection,
        qrCodeData,
        instanceName
      };
    } catch (error) {
      console.error('Error creating connection:', error);
      throw error;
    }
  };

  const disconnectConnection = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({ 
          connection_status: 'disconnected', 
          disconnected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setConnections(prev =>
        prev.map(conn =>
          conn.id === id
            ? { ...conn, connection_status: 'disconnected', disconnected_at: new Date().toISOString() }
            : conn
        )
      );
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw error;
    } finally {
      setActionLoading(null);
    }
  };

  const deleteConnection = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConnections(prev => prev.filter(conn => conn.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      throw error;
    } finally {
      setActionLoading(null);
    }
  };

  return {
    connections,
    loading,
    actionLoading,
    fetchConnections,
    createConnection,
    disconnectConnection,
    deleteConnection
  };
};