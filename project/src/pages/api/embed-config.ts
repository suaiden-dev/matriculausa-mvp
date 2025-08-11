import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { agentId } = req.query;

      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Buscar configuração do agente
      const { data: agent, error } = await supabase
        .from('ai_configurations')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error || !agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Retornar configuração para embed
      const embedConfig = {
        agentId: agent.id,
        agentName: agent.agent_name || 'AI Assistant',
        companyName: agent.company_name || 'Amatricula USA',
        primaryColor: agent.primary_color || '#3B82F6',
        secondaryColor: agent.secondary_color || '#1E40AF',
        welcomeMessage: agent.welcome_message || `Hi! I'm ${agent.agent_name || 'AI Assistant'} from ${agent.company_name || 'Amatricula USA'}. How can I help you today?`,
        knowledgeBase: agent.knowledge_base || []
      };

      res.status(200).json(embedConfig);
    } catch (error) {
      console.error('Error fetching embed config:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { agentId, config } = req.body;

      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Atualizar configuração do agente
      const { error } = await supabase
        .from('ai_configurations')
        .update({
          agent_name: config.agentName,
          company_name: config.companyName,
          primary_color: config.primaryColor,
          secondary_color: config.secondaryColor,
          welcome_message: config.welcomeMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);

      if (error) {
        console.error('Error updating embed config:', error);
        return res.status(500).json({ error: 'Failed to update configuration' });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating embed config:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 