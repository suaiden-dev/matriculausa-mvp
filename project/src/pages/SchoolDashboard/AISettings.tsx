import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import TestEmailProcessing from '../../components/TestEmailProcessing';

interface AISettings {
  id: string;
  university_id: string;
  is_ai_enabled: boolean;
  custom_instructions: string;
  response_tone: 'formal' | 'friendly' | 'neutral';
  forward_to_human_triggers: string[];
  ai_service_provider: string;
  ai_model: string;
  max_response_length: number;
  confidence_threshold: number;
}

interface University {
  id: string;
  name: string;
  contact?: {
    email?: string;
    admissionsEmail?: string;
  };
}

const AISettings: React.FC = () => {
  const { user } = useAuth();
  const [universities, setUniversities] = useState<University[]>([]);
  const [aiSettings, setAISettings] = useState<AISettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [currentSettings, setCurrentSettings] = useState<Partial<AISettings>>({
    is_ai_enabled: false,
    custom_instructions: 'Você é um assistente de admissões virtual, amigável e eficiente, trabalhando para esta universidade. Sua comunicação deve ser clara, profissional e encorajadora. Você representa a plataforma Matrícula USA.',
    response_tone: 'friendly',
    forward_to_human_triggers: ['urgente', 'problema', 'erro', 'reclamação', 'legal', 'advogado'],
    ai_service_provider: 'openai',
    ai_model: 'gpt-4o',
    max_response_length: 500,
    confidence_threshold: 0.7
  });

  useEffect(() => {
    if (user?.id) {
      loadUniversities();
    } else {
      console.log('⚠️ No user ID available, skipping universities load');
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedUniversity) {
      loadAISettings(selectedUniversity);
    }
  }, [selectedUniversity]);

  const loadUniversities = async () => {
    try {
      console.log('🔍 Loading universities for user:', user?.id);
      
      if (!user?.id) {
        console.log('⚠️ No user ID available');
        return;
      }
      
      const { data, error } = await supabase
        .from('universities')
        .select('id, name, contact')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading universities:', error);
        throw error;
      }
      
      console.log('✅ Universities loaded:', data);
      setUniversities(data || []);
      
      if (data && data.length > 0) {
        setSelectedUniversity(data[0].id);
      }
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  const loadAISettings = async (universityId: string) => {
    try {
      const { data, error } = await supabase
        .from('university_ai_settings')
        .select('*')
        .eq('university_id', universityId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setCurrentSettings(data);
      } else {
        // Criar configurações padrão
        setCurrentSettings({
          is_ai_enabled: false,
          custom_instructions: 'Você é um assistente de admissões virtual, amigável e eficiente, trabalhando para esta universidade. Sua comunicação deve ser clara, profissional e encorajadora. Você representa a plataforma Matrícula USA.',
          response_tone: 'friendly',
          forward_to_human_triggers: ['urgente', 'problema', 'erro', 'reclamação', 'legal', 'advogado'],
          ai_service_provider: 'openai',
          ai_model: 'gpt-4o',
          max_response_length: 500,
          confidence_threshold: 0.7
        });
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!selectedUniversity) return;

    setSaving(true);
    try {
      const settingsData = {
        university_id: selectedUniversity,
        ...currentSettings,
        forward_to_human_triggers: Array.isArray(currentSettings.forward_to_human_triggers) 
          ? currentSettings.forward_to_human_triggers 
          : currentSettings.forward_to_human_triggers?.split(',').map(t => t.trim()) || []
      };

      const { error } = await supabase
        .from('university_ai_settings')
        .upsert(settingsData, { onConflict: 'university_id' });

      if (error) throw error;

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerChange = (index: number, value: string) => {
    const triggers = [...(currentSettings.forward_to_human_triggers || [])];
    triggers[index] = value;
    setCurrentSettings({ ...currentSettings, forward_to_human_triggers: triggers });
  };

  const addTrigger = () => {
    const triggers = [...(currentSettings.forward_to_human_triggers || []), ''];
    setCurrentSettings({ ...currentSettings, forward_to_human_triggers: triggers });
  };

  const removeTrigger = (index: number) => {
    const triggers = [...(currentSettings.forward_to_human_triggers || [])];
    triggers.splice(index, 1);
    setCurrentSettings({ ...currentSettings, forward_to_human_triggers: triggers });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (universities.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma universidade encontrada</h3>
        <p className="text-gray-600">Você precisa ter uma universidade cadastrada para configurar a IA.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações de IA</h1>
        <p className="text-gray-600">Configure o comportamento da Inteligência Artificial para responder emails automaticamente.</p>
      </div>

      {/* Seletor de Universidade */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Universidade
        </label>
        <select
          value={selectedUniversity}
          onChange={(e) => setSelectedUniversity(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Selecionar universidade"
        >
          {universities.map((university) => (
            <option key={university.id} value={university.id}>
              {university.name} ({university.contact?.email || university.contact?.admissionsEmail || 'No email'})
            </option>
          ))}
        </select>
      </div>

      {selectedUniversity && (
        <div className="space-y-6">
          {/* Status da IA */}
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Status da IA</h3>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSettings.is_ai_enabled || false}
                    onChange={(e) => setCurrentSettings({ ...currentSettings, is_ai_enabled: e.target.checked })}
                    className="sr-only peer"
                    aria-label="Ativar IA para responder emails automaticamente"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="ml-3 text-sm font-medium text-gray-900">
                  {currentSettings.is_ai_enabled ? 'Ativada' : 'Desativada'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Quando ativada, a IA responderá automaticamente aos emails recebidos nesta universidade.
            </p>
          </div>

          {/* Instruções Personalizadas */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Instruções Personalizadas</h3>
            <textarea
              value={currentSettings.custom_instructions || ''}
              onChange={(e) => setCurrentSettings({ ...currentSettings, custom_instructions: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Instruções para a IA sobre como responder emails..."
            />
            <p className="text-sm text-gray-600 mt-2">
              Estas instruções serão usadas como base para todas as respostas da IA.
            </p>
          </div>

          {/* Tom de Resposta */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tom de Resposta</h3>
            <select
              value={currentSettings.response_tone || 'friendly'}
              onChange={(e) => setCurrentSettings({ ...currentSettings, response_tone: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Selecionar tom de resposta"
            >
              <option value="friendly">Amigável</option>
              <option value="formal">Formal</option>
              <option value="neutral">Neutro</option>
            </select>
          </div>

          {/* Triggers para Intervenção Manual */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Palavras-chave para Intervenção Manual</h3>
            <p className="text-sm text-gray-600 mb-4">
              Emails contendo estas palavras serão marcados para intervenção manual em vez de serem respondidos pela IA.
            </p>
            <div className="space-y-2">
              {(currentSettings.forward_to_human_triggers || []).map((trigger, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={trigger}
                    onChange={(e) => handleTriggerChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Palavra-chave..."
                  />
                  <button
                    onClick={() => removeTrigger(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                onClick={addTrigger}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-200"
              >
                + Adicionar Palavra-chave
              </button>
            </div>
          </div>

          {/* Configurações Avançadas */}
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Avançadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provedor de IA
                </label>
                <select
                  value={currentSettings.ai_service_provider || 'openai'}
                  onChange={(e) => setCurrentSettings({ ...currentSettings, ai_service_provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="gemini">Google (Gemini)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo
                </label>
                <select
                  value={currentSettings.ai_model || 'gpt-4o'}
                  onChange={(e) => setCurrentSettings({ ...currentSettings, ai_model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamanho Máximo da Resposta
                </label>
                <input
                  type="number"
                  value={currentSettings.max_response_length || 500}
                  onChange={(e) => setCurrentSettings({ ...currentSettings, max_response_length: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="100"
                  max="2000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Limiar de Confiança
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={currentSettings.confidence_threshold || 0.7}
                  onChange={(e) => setCurrentSettings({ ...currentSettings, confidence_threshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

                        {/* Teste Manual - Processamento de Email */}
              <TestEmailProcessing className="mt-6" />

          {/* Botão Salvar */}
          <div className="flex justify-end mt-6">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISettings; 