import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useUniversity } from '../context/UniversityContext';

interface AgentTemplate {
  id: string;
  user_id: string;
  university_id: string;
  ai_name: string;
  agent_type: string;
  personality: string;
  custom_prompt: string;
  is_template: boolean;
  created_at: string;
}

export const useCustomAgentTypes = () => {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [agentTemplates, setAgentTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Tipos padrão de agentes
  const defaultAgentTypes = [
    "Admissions",
    "Registrar's Office",
    "Finance",
    "Info",
    "Marketing"
  ];

  // Buscar templates de agentes
  const fetchAgentTemplates = async () => {
    if (!user || !university) return;

    try {
      const { data, error } = await supabase
        .from('ai_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('university_id', university.id)
        .eq('is_template', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgentTemplates(data || []);
    } catch (error) {
      console.error('Error fetching agent templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Adicionar novo tipo customizado (criar template)
  const addCustomAgentType = async (agentTypeName: string) => {
    if (!user || !university) return null;

    try {
      const { data, error } = await supabase
        .from('ai_configurations')
        .insert({
          user_id: user.id,
          university_id: university.id,
          ai_name: `${agentTypeName} Template`,
          agent_type: agentTypeName.trim(),
          personality: 'Professional',
          custom_prompt: '',
          is_template: true,
          has_tested: false,
          final_prompt: `You are a ${agentTypeName} specialist, providing clear, direct, and extremely helpful support to users at all times.`
        })
        .select()
        .single();

      if (error) throw error;

      setAgentTemplates(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding custom agent type:', error);
      return null;
    }
  };

  // Remover tipo customizado (deletar template)
  const removeCustomAgentType = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAgentTemplates(prev => prev.filter(template => template.id !== id));
    } catch (error) {
      console.error('Error removing custom agent type:', error);
    }
  };

  // Obter todos os tipos (padrão + customizados)
  const getAllAgentTypes = () => {
    const customTypes = agentTemplates.map(template => template.agent_type);
    return [...defaultAgentTypes, ...customTypes];
  };

  // Verificar se um tipo já existe
  const isAgentTypeExists = (agentTypeName: string) => {
    const allTypes = getAllAgentTypes();
    return allTypes.some(type => type.toLowerCase() === agentTypeName.toLowerCase());
  };

  useEffect(() => {
    if (user && university) {
      fetchAgentTemplates();
    }
  }, [user, university]);

  return {
    agentTemplates,
    defaultAgentTypes,
    getAllAgentTypes,
    addCustomAgentType,
    removeCustomAgentType,
    isAgentTypeExists,
    loading
  };
}; 