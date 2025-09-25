import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Settings,
  BookOpen,
  Mail,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Save,
  Sparkles,
  FileText,
  Brain,
  MessageCircle,
  HelpCircle,
  ExternalLink,
  Grid3X3,
  List,
  Send,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { supabase } from '../../lib/supabase';
import EmailKnowledgeUpload from '../../components/EmailKnowledgeUpload';

interface EmailAgent {
  id: string;
  ai_name: string;
  company_name: string;
  personality: string;
  sector: string;
  agent_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  knowledge_documents_count: number;
}

const personalityOptions = [
  { value: "Friendly", label: "Friendly", description: "Warm and welcoming approach" },
  { value: "Professional", label: "Professional", description: "Formal and reliable" },
  { value: "Helpful", label: "Helpful", description: "Always ready to assist" },
  { value: "Enthusiastic", label: "Enthusiastic", description: "Energetic and positive" },
  { value: "Patient", label: "Patient", description: "Calm and understanding" },
  { value: "Expert", label: "Expert", description: "Knowledgeable and authoritative" }
];

const agentTypeOptions = [
  "Admissions",
  "Registrar's Office", 
  "Finance",
  "Student Services",
  "Academic Affairs",
  "International Students",
  "Scholarships",
  "Housing",
  "Career Services",
  "Library Services"
];

export default function EmailAgentManagement() {
  const { user } = useAuth();
  const { university } = useUniversity();
  const [agents, setAgents] = useState<EmailAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<EmailAgent | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [customInstructionsExpanded, setCustomInstructionsExpanded] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const uploadRef = useRef<{ uploadPendingFiles: (universityId: string) => Promise<any[]> } | null>(null);

  // Estados do formulário
  const [formData, setFormData] = useState({
    ai_name: '',
    company_name: university?.name || '',
    agent_type: '',
    personality: '',
    custom_prompt: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (university?.id) {
      fetchAgents();
    }
  }, [university?.id]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ai_configurations')
        .select(`
          id,
          ai_name,
          company_name,
          personality,
          sector,
          agent_type,
          is_active,
          created_at,
          updated_at
        `)
        .eq('university_id', university?.id)
        .eq('agent_type', 'email')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar contagem de documentos para cada agente
      const agentsWithCount = await Promise.all(
        data?.map(async (agent) => {
          const { count } = await supabase
            .from('email_knowledge_documents')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id);
          
          return {
            ...agent,
            knowledge_documents_count: count || 0
          };
        }) || []
      );

      setAgents(agentsWithCount);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSmoothTransition = (showForm: boolean) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowCreateForm(showForm);
      setIsTransitioning(false);
    }, 150);
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !university) {
      alert("You must be logged in to create an agent.");
      return;
    }

    if (!formData.ai_name || !formData.company_name || !formData.agent_type || !formData.personality) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setFormLoading(true);
      
      const { data: agent, error } = await supabase
        .from('ai_configurations')
        .insert({
          user_id: user.id,
          university_id: university.id,
          ai_name: formData.ai_name,
          company_name: formData.company_name,
          agent_type: 'email',
          personality: formData.personality,
          sector: 'Education',
          custom_prompt: formData.custom_prompt,
          final_prompt: formData.custom_prompt,
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;

      // Upload pending files if any
      if (pendingFiles.length > 0 && uploadRef.current) {
        try {
          await uploadRef.current.uploadPendingFiles(agent.id);
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
        }
      }

      setAgents(prev => [agent, ...prev]);
      setShowCreateForm(false);
      setFormData({
        ai_name: '',
        company_name: university.name || '',
        agent_type: '',
        personality: '',
        custom_prompt: ''
      });
      setPendingFiles([]);
      handleSmoothTransition(false);
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Error creating agent. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleAgent = async (agentId: string, currentStatus: boolean) => {
    try {
      setActionLoading(agentId);
      
      const { error } = await supabase
        .from('ai_configurations')
        .update({ is_active: !currentStatus })
        .eq('id', agentId);

      if (error) throw error;

      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, is_active: !currentStatus }
          : agent
      ));
    } catch (error) {
      console.error('Error toggling agent:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este agente? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setActionLoading(agentId);
      
      const { error } = await supabase
        .from('ai_configurations')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      setAgents(prev => prev.filter(agent => agent.id !== agentId));
    } catch (error) {
      console.error('Error deleting agent:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Email AI Agents
          </h1>
          <p className="text-gray-600 mt-1">
            Create and manage AI agents for automated email processing
          </p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => handleSmoothTransition(true)}
            className="bg-[#05294E] hover:bg-[#05294E]/90 text-white px-4 py-2.5 rounded-xl font-medium transition-all duration-200 hover:shadow-md text-sm flex items-center gap-2"
          >
            <Bot className="h-4 w-4" />
            Create New Agent
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="relative overflow-hidden">
        {isTransitioning && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-[#05294E]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">Loading...</span>
            </div>
          </div>
        )}

        {!showCreateForm ? (
          /* Agents List */
          <div className="space-y-4">
            {agents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No email AI agents created
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first AI agent to start processing emails automatically
                </p>
                <button
                  onClick={() => handleSmoothTransition(true)}
                  className="bg-[#05294E] hover:bg-[#05294E]/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Agent
                </button>
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Bot className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {agent.ai_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {agent.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <Pause className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{agent.personality}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {agent.knowledge_documents_count} documents
                        </span>
                        <span>Created {new Date(agent.created_at).toLocaleDateString('en-US')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAgent(agent.id, agent.is_active)}
                        disabled={actionLoading === agent.id}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          agent.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50`}
                      >
                        {actionLoading === agent.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : agent.is_active ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setEditingAgent(agent)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        disabled={actionLoading === agent.id}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Create/Edit Form */
          <div className={`p-4 sm:p-6 bg-gray-50 rounded-xl transition-all duration-300 ease-in-out transform ${
            isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Bot className="h-5 w-5 text-[#05294E]" />
                  {editingAgent ? 'Edit AI Agent' : 'Create New Agent'}
                </h3>
                <p className="text-gray-600 mt-1">
                  {editingAgent
                    ? 'Update your AI agent configuration and settings'
                    : 'Configure your AI agent with custom instructions and knowledge base'
                  }
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingAgent(null);
                  setFormData({
                    ai_name: "",
                    company_name: university?.name || "",
                    agent_type: "",
                    personality: "",
                    custom_prompt: ""
                  });
                  handleSmoothTransition(false);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {editingAgent ? 'Cancel Edit' : 'Back to List'}
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4 sm:space-y-6">
              {/* Grid responsivo para campos principais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Agent Name */}
                <div className="w-full">
                  <label htmlFor="ai_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name *
                  </label>
                  <input
                    id="ai_name"
                    type="text"
                    value={formData.ai_name}
                    onChange={(e) => handleInputChange("ai_name", e.target.value)}
                    placeholder="e.g. Maria Assistant"
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors text-base"
                    required
                  />
                </div>

                {/* Agent Type */}
                <div className="w-full">
                  <label htmlFor="agent_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Type *
                  </label>
                  <select
                    id="agent_type"
                    value={formData.agent_type}
                    onChange={(e) => handleInputChange("agent_type", e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors text-base"
                    required
                  >
                    <option value="">Select agent type</option>
                    {agentTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Personality */}
                <div className="w-full">
                  <label htmlFor="personality" className="block text-sm font-medium text-gray-700 mb-2">
                    Personality *
                  </label>
                  <select
                    id="personality"
                    value={formData.personality}
                    onChange={(e) => handleInputChange("personality", e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors text-base"
                    required
                  >
                    <option value="">Select personality</option>
                    {personalityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Instructions - Collapsible */}
              <div className="bg-white p-4 sm:p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Custom Instructions (Optional)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomInstructionsExpanded(!customInstructionsExpanded)}
                      className="flex items-center gap-1 px-3 py-2 sm:py-1 text-sm bg-[#05294E]/10 text-[#05294E] rounded-lg hover:bg-[#05294E]/20 transition-colors"
                    >
                      {customInstructionsExpanded ? (
                        <>
                          <X className="w-3 h-3" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          Expand
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {customInstructionsExpanded && (
                  <div className="space-y-3">
                    <textarea
                      id="custom_prompt"
                      value={formData.custom_prompt}
                      onChange={(e) => handleInputChange("custom_prompt", e.target.value)}
                      placeholder="e.g. Always respond succinctly and politely. Be proactive in offering help..."
                      className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E] transition-colors resize-none text-base"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500">
                      Add specific instructions for how this agent should behave and respond to students.
                    </p>
                  </div>
                )}
              </div>

              {/* Knowledge Base Documents */}
              <div className="bg-white p-4 sm:p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-[#05294E]" />
                  <label className="text-sm font-medium text-gray-700">
                    Knowledge Base Documents (Optional)
                  </label>
                </div>
                <EmailKnowledgeUpload
                  ref={uploadRef}
                  universityId={university?.id || ""}
                  agentId={editingAgent?.id || ""} // Will be updated after agent creation
                  onDocumentsChange={(documents: any[]) => {
                    console.log('Documents uploaded:', documents);
                  }}
                  onPendingFilesChange={(files: File[]) => {
                    setPendingFiles(files);
                  }}
                  existingDocuments={[]}
                  isCreating={!editingAgent?.id}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Upload documents that will be used as knowledge base for your AI agent.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-[#05294E] hover:bg-[#05294E]/90 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {editingAgent ? 'Updating Agent...' : 'Creating Agent...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingAgent ? 'Update Agent' : 'Create Agent'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}