import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, CheckCircle, Database, Eye, EyeOff, History, Users, Calendar, Globe, FileText } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '../../lib/supabase';

// Estilos personalizados para o React Quill
const quillStyles = `
  .ql-editor {
    min-height: 150px;
    font-size: 14px;
    line-height: 1.6;
  }
  
  .ql-toolbar {
    border-top: 1px solid #e2e8f0;
    border-left: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    background-color: #f8fafc;
  }
  
  .ql-container {
    border-bottom: 1px solid #e2e8f0;
    border-left: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    border-top: none;
    border-radius: 0 0 8px 8px;
  }
  
  .ql-editor.ql-blank::before {
    color: #94a3b8;
    font-style: italic;
  }
  
  .ql-editor h1, .ql-editor h2, .ql-editor h3 {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
  }
  
  .ql-editor p {
    margin-bottom: 0.5em;
  }
  
  .ql-editor ul, .ql-editor ol {
    padding-left: 1.5em;
  }

  /* Line clamp utility */
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Modal styles */
  .modal-overlay {
    backdrop-filter: blur(4px);
  }

  /* Prose styles for better content display */
  .prose {
    max-width: none;
  }

  .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
    color: #1e293b;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .prose h1 { font-size: 1.875rem; }
  .prose h2 { font-size: 1.5rem; }
  .prose h3 { font-size: 1.25rem; }

  .prose p {
    margin-bottom: 1em;
    line-height: 1.7;
  }

  .prose ul, .prose ol {
    margin-bottom: 1em;
    padding-left: 1.5em;
  }

  .prose li {
    margin-bottom: 0.25em;
  }

  .prose strong {
    font-weight: 600;
    color: #1e293b;
  }

  .prose em {
    font-style: italic;
  }

  .prose blockquote {
    border-left: 4px solid #e2e8f0;
    padding-left: 1em;
    margin: 1.5em 0;
    font-style: italic;
    color: #64748b;
  }

  .prose code {
    background-color: #f1f5f9;
    padding: 0.125em 0.25em;
    border-radius: 0.25rem;
    font-size: 0.875em;
    color: #dc2626;
  }

  .prose pre {
    background-color: #1e293b;
    color: #e2e8f0;
    padding: 1em;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1.5em 0;
  }

  .prose a {
    color: #2563eb;
    text-decoration: underline;
  }

  .prose a:hover {
    color: #1d4ed8;
  }
`;

interface Term {
  id: string;
  title: string;
  content: string;
  status: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface TermAcceptance {
  id: string;
  user_id: string;
  term_id: string;
  term_type: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_email?: string;
  user_full_name?: string;
  term_title?: string;
}

const TermsManagement: React.FC = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [newTerm, setNewTerm] = useState<Partial<Term> | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [viewingTerm, setViewingTerm] = useState<Term | null>(null);
  const [showRawContent, setShowRawContent] = useState(false);
  
  // Acceptance history states
  const [activeTab, setActiveTab] = useState<'terms' | 'history'>('terms');
  const [acceptanceHistory, setAcceptanceHistory] = useState<TermAcceptance[]>([]);
  const [acceptanceHistoryLoading, setAcceptanceHistoryLoading] = useState(false);
  const [selectedTermForHistory, setSelectedTermForHistory] = useState<Term | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Configuração do React Quill
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'blockquote', 'code-block'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'align',
    'link', 'blockquote', 'code-block'
  ];

  // Função para verificar dados no banco
  const checkDatabaseContent = async () => {
    try {
      console.log('🔍 Verificando conteúdo no banco...');
      const { data, error } = await supabase
        .from('affiliate_terms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const debugData = data?.map(term => ({
        id: term.id,
        title: term.title,
        content_length: term.content?.length || 0,
        content_preview: term.content?.substring(0, 100) + '...',
        status: term.status,
        created_at: term.created_at
      }));

      console.log('📊 Dados no banco:', debugData);
      setDebugInfo(JSON.stringify(debugData, null, 2));
      
      // Verificar se há conteúdo HTML
      const htmlTerms = data?.filter(term => term.content?.includes('<'));
      console.log('🔍 Termos com HTML:', htmlTerms?.length || 0);
      
      if (htmlTerms && htmlTerms.length > 0) {
        console.log('✅ HTML detectado nos termos:', htmlTerms.map(t => ({ id: t.id, hasHtml: t.content?.includes('<') })));
      }
      
    } catch (err: any) {
      console.error('❌ Erro ao verificar banco:', err);
      setDebugInfo(`Erro: ${err.message}`);
    }
  };

  // Carregar termos
  const loadTerms = async () => {
    try {
      console.log('🔄 Carregando termos...');
      const { data, error } = await supabase
        .from('affiliate_terms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('✅ Termos carregados:', data);
      setTerms(data || []);
    } catch (err: any) {
      console.error('❌ Erro ao carregar termos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carregar histórico de aceitações
  const loadAcceptanceHistory = async (termId?: string, page: number = 1) => {
    try {
      setAcceptanceHistoryLoading(true);
      
      // Calcular offset para paginação
      const offset = (page - 1) * itemsPerPage;
      
      // Buscar total de itens para paginação
      let countQuery = supabase
        .from('comprehensive_term_acceptance')
        .select('*', { count: 'exact', head: true });

      if (termId) {
        countQuery = countQuery.eq('term_id', termId);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      
      setTotalItems(count || 0);
      
      // Buscar as aceitações com paginação
      let query = supabase
        .from('comprehensive_term_acceptance')
        .select('*')
        .order('accepted_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1);

      if (termId) {
        query = query.eq('term_id', termId);
      }

      const { data: acceptances, error: acceptancesError } = await query;
      if (acceptancesError) throw acceptancesError;

      if (!acceptances || acceptances.length === 0) {
        setAcceptanceHistory([]);
        return;
      }

      // Buscar informações dos usuários
      const userIds = [...new Set(acceptances.map(a => a.user_id))];
      const { data: userProfiles, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      if (usersError) throw usersError;

      // Buscar informações dos termos
      const termIds = [...new Set(acceptances.map(a => a.term_id))];
      const { data: terms, error: termsError } = await supabase
        .from('application_terms')
        .select('id, title')
        .in('id', termIds);

      if (termsError) throw termsError;

      // Criar mapas para lookup rápido
      const userMap = new Map(userProfiles?.map(u => [u.user_id, u]) || []);
      const termMap = new Map(terms?.map(t => [t.id, t]) || []);

      // Combinar os dados
      const transformedData = acceptances.map(acceptance => ({
        id: acceptance.id,
        user_id: acceptance.user_id,
        term_id: acceptance.term_id,
        term_type: acceptance.term_type,
        accepted_at: acceptance.accepted_at,
        ip_address: acceptance.ip_address,
        user_agent: acceptance.user_agent,
        created_at: acceptance.created_at,
        user_email: userMap.get(acceptance.user_id)?.email || 'N/A',
        user_full_name: userMap.get(acceptance.user_id)?.full_name || 'N/A',
        term_title: termMap.get(acceptance.term_id)?.title || 'N/A'
      }));

      setAcceptanceHistory(transformedData);
    } catch (error: any) {
      console.error('Error loading acceptance history:', error);
      setError(error.message);
    } finally {
      setAcceptanceHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
  }, []);

  // Load acceptance history when history tab is selected
  useEffect(() => {
    if (activeTab === 'history') {
      setCurrentPage(1); // Reset to first page when switching to history tab
      loadAcceptanceHistory(undefined, 1);
    }
  }, [activeTab]);

  // Criar novo termo
  const handleCreateTerm = async () => {
    if (!newTerm?.title || !newTerm?.content) return;

    try {
      console.log('🔄 Criando novo termo:', { 
        title: newTerm.title, 
        content: newTerm.content,
        content_length: newTerm.content?.length || 0,
        has_html: newTerm.content?.includes('<') || false
      });
      
      // Se o novo termo será ativo, desativar todos os outros primeiro
      if (newTerm.status !== false) {
        await supabase
          .from('affiliate_terms')
          .update({ status: false, updated_at: new Date().toISOString() })
          .eq('status', true);
      }
      
      const { data, error } = await supabase
        .from('affiliate_terms')
        .insert([{
          title: newTerm.title,
          content: newTerm.content,
          status: newTerm.status !== false, // Padrão: ativo se não especificado
          version: 1
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Termo criado com sucesso:', {
        id: data.id,
        title: data.title,
        content_length: data.content?.length || 0,
        has_html: data.content?.includes('<') || false
      });
      
      // Recarregar termos para refletir as mudanças
      await loadTerms();
      setNewTerm(null);
      
      // Verificar banco após criação
      setTimeout(checkDatabaseContent, 1000);
    } catch (err: any) {
      console.error('❌ Erro ao criar termo:', err);
      setError(err.message);
    }
  };

  // Atualizar termo
  const handleUpdateTerm = async () => {
    if (!editingTerm) return;

    try {
      console.log('🔄 Atualizando termo:', { 
        id: editingTerm.id, 
        title: editingTerm.title, 
        content: editingTerm.content,
        content_length: editingTerm.content?.length || 0,
        has_html: editingTerm.content?.includes('<') || false
      });
      
      // Se o termo será ativado, desativar todos os outros primeiro
      if (editingTerm.status) {
        await supabase
          .from('affiliate_terms')
          .update({ status: false, updated_at: new Date().toISOString() })
          .eq('status', true)
          .neq('id', editingTerm.id);
      }
      
      const { data, error } = await supabase
        .from('affiliate_terms')
        .update({
          title: editingTerm.title,
          content: editingTerm.content,
          status: editingTerm.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTerm.id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Termo atualizado com sucesso:', {
        id: data.id,
        title: data.title,
        content_length: data.content?.length || 0,
        has_html: data.content?.includes('<') || false
      });
      
      // Recarregar termos para refletir as mudanças
      await loadTerms();
      setEditingTerm(null);
      
      // Verificar banco após atualização
      setTimeout(checkDatabaseContent, 1000);
    } catch (err: any) {
      console.error('❌ Erro ao atualizar termo:', err);
      setError(err.message);
    }
  };

  // Alternar status do termo
  const handleToggleStatus = async (id: string, newStatus: boolean) => {
    try {
      console.log('🔄 Alternando status do termo:', { id, newStatus });
      
      // Se está ativando um termo, desativar todos os outros primeiro
      if (newStatus) {
        await supabase
          .from('affiliate_terms')
          .update({ status: false, updated_at: new Date().toISOString() })
          .eq('status', true)
          .neq('id', id);
      }
      
      const { data, error } = await supabase
        .from('affiliate_terms')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Status do termo atualizado:', data);
      
      // Recarregar termos para refletir as mudanças
      await loadTerms();
    } catch (err: any) {
      console.error('❌ Erro ao alternar status:', err);
      setError(err.message);
    }
  };

  // Excluir termo
  const handleDeleteTerm = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este termo?')) return;

    try {
      console.log('🔄 Excluindo termo:', id);
      
      const { error } = await supabase
        .from('affiliate_terms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Termo excluído com sucesso');
      
      // Recarregar termos para refletir as mudanças
      await loadTerms();
    } catch (err: any) {
      console.error('❌ Erro ao excluir termo:', err);
      setError(err.message);
    }
  };

  // Funções de paginação
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const termId = selectedTermForHistory?.id;
    loadAcceptanceHistory(termId, newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
    const termId = selectedTermForHistory?.id;
    loadAcceptanceHistory(termId, 1);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando termos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Estilos personalizados para o React Quill */}
      <style>{quillStyles}</style>
      
      {/* Abas de navegação */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'terms'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gerenciar Termos
          </button>
          <button
            onClick={() => {
              setSelectedTermForHistory(null);
              setActiveTab('history');
              loadAcceptanceHistory();
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Histórico de Aceitações
          </button>
        </div>
        
        {/* Botão para criar novo termo */}
        {activeTab === 'terms' && !newTerm && (
          <button
            onClick={() => setNewTerm({ title: '', content: '', status: true })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Term
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* New Term Form */}
      {newTerm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">Create New Term</h3>
            <button
              onClick={() => setNewTerm(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={newTerm.title}
                onChange={(e) => setNewTerm({ ...newTerm, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter term title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content
              </label>
              <ReactQuill
                theme="snow"
                value={newTerm.content || ''}
                onChange={(content) => {
                  console.log('📝 Conteúdo alterado:', {
                    content_length: content?.length || 0,
                    has_html: content?.includes('<') || false,
                    preview: content?.substring(0, 100) + '...'
                  });
                  setNewTerm({ ...newTerm, content });
                }}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Enter term content..."
              />
            </div>
            <div className="flex items-center space-x-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={newTerm.status !== false}
                  onChange={(e) => setNewTerm({ ...newTerm, status: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm font-medium text-slate-700">
                Set as active term (will deactivate others)
              </span>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setNewTerm(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTerm}
                disabled={!newTerm.title || !newTerm.content}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Term
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo baseado na aba ativa */}
      {activeTab === 'terms' && (
        <>
          {/* Terms List */}
          <div className="space-y-6">
            {terms.map((term) => (
          <div
            key={term.id}
            className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
              term.status ? 'border-blue-200 bg-blue-50' : 'border-slate-200'
            }`}
            onClick={() => setViewingTerm(term)}
          >
            {editingTerm?.id === term.id ? (
              // Edit Mode
              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingTerm.title}
                    onChange={(e) => setEditingTerm({ ...editingTerm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Content
                  </label>
                  <ReactQuill
                    theme="snow"
                    value={editingTerm.content || ''}
                    onChange={(content) => {
                      console.log('📝 Conteúdo editado:', {
                        content_length: content?.length || 0,
                        has_html: content?.includes('<') || false,
                        preview: content?.substring(0, 100) + '...'
                      });
                      setEditingTerm({ ...editingTerm, content });
                    }}
                    modules={quillModules}
                    formats={quillFormats}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={editingTerm.status}
                      onChange={(e) => setEditingTerm({ ...editingTerm, status: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-medium text-slate-700">
                    Active term (will deactivate others)
                  </span>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setEditingTerm(null)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateTerm}
                    disabled={!editingTerm.title || !editingTerm.content}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-bold text-slate-900">{term.title}</h3>
                    {term.status && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedTermForHistory(term);
                        setActiveTab('history');
                        setCurrentPage(1); // Reset to first page
                        loadAcceptanceHistory(term.id, 1);
                      }}
                      className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Ver histórico de aceitações"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewingTerm(term)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingTerm(term)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Editar termo"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTerm(term.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir termo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="prose prose-slate max-w-none">
                  <div 
                    className="text-slate-600 line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: term.content }}
                  />
                </div>
                <div className="mt-4 flex items-center space-x-4 text-sm text-slate-500">
                  <span>Created: {new Date(term.created_at).toLocaleDateString('pt-BR')}</span>
                  {term.updated_at && (
                    <span>• Updated: {new Date(term.updated_at).toLocaleDateString('pt-BR')}</span>
                  )}
                  <span>• Click to view full content</span>
                </div>
              </>
            )}
          </div>
        ))}

        {terms.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Terms Created</h3>
            <p className="text-slate-600 mb-6">
              Start by creating your first term of agreement
            </p>
            {!newTerm && (
              <button
                onClick={() => setNewTerm({ title: '', content: '', status: true })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Term
              </button>
            )}
          </div>
        )}
          </div>
        </>
      )}

      {/* Aba de Histórico de Aceitações */}
      {activeTab === 'history' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedTermForHistory 
                  ? `Histórico de Aceitações - ${selectedTermForHistory.title}`
                  : 'Histórico Geral de Aceitações de Termos'
                }
              </h3>
              {selectedTermForHistory && (
                <button
                  onClick={() => {
                    setSelectedTermForHistory(null);
                    setCurrentPage(1); // Reset to first page
                    loadAcceptanceHistory(undefined, 1);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver Todos os Termos
                </button>
              )}
            </div>

            {acceptanceHistoryLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : acceptanceHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Nenhum registro de aceitação encontrado</p>
                <p className="text-sm text-gray-400 mt-2">
                  {selectedTermForHistory 
                    ? 'Este termo ainda não foi aceito por nenhum usuário.'
                    : 'Ainda não há registros de aceitação de termos.'
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Termo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aceito Em
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Endereço IP
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Navegador/Dispositivo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {acceptanceHistory.map((acceptance) => (
                        <tr key={acceptance.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {acceptance.user_full_name || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {acceptance.user_email || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-green-600" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {acceptance.term_title || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500 capitalize">
                                  {acceptance.term_type.replace(/_/g, ' ')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              {new Date(acceptance.accepted_at).toLocaleString('pt-BR')}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {acceptance.ip_address || 'N/A'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                            <div className="flex items-center">
                              <Globe className="w-4 h-4 mr-2 text-gray-400" />
                              <span title={acceptance.user_agent || 'N/A'}>
                                {acceptance.user_agent ? 
                                  acceptance.user_agent.substring(0, 50) + (acceptance.user_agent.length > 50 ? '...' : '') 
                                  : 'N/A'
                                }
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                <div className="mt-6 flex items-center justify-between">
                  {/* Informações da página e seletor de itens por página */}
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{startItem}</span> a <span className="font-medium">{endItem}</span> de{' '}
                      <span className="font-medium">{totalItems}</span> resultados
                    </div>
                    
                    {/* Seletor de itens por página */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Itens por página:</label>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  {/* Controles de navegação - só aparecem se houver mais de uma página */}
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      {/* Botão Anterior */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        Anterior
                      </button>

                      {/* Números das páginas */}
                      <div className="flex items-center space-x-1">
                        {/* Primeira página */}
                        {currentPage > 3 && (
                          <>
                            <button
                              onClick={() => handlePageChange(1)}
                              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                            >
                              1
                            </button>
                            {currentPage > 4 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                          </>
                        )}

                        {/* Páginas ao redor da atual */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
                          if (pageNum < 1 || pageNum > totalPages) return null;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                pageNum === currentPage
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {/* Última página */}
                        {currentPage < totalPages - 2 && (
                          <>
                            {currentPage < totalPages - 3 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(totalPages)}
                              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Botão Próximo */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        Próximo
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Term View Modal */}
      {viewingTerm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-slate-900">{viewingTerm.title}</h2>
                {viewingTerm.status && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowRawContent(!showRawContent)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title={showRawContent ? "Show formatted content" : "Show raw HTML"}
                >
                  {showRawContent ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setViewingTerm(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {showRawContent ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Raw HTML Content:</h3>
                    <pre className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 overflow-x-auto whitespace-pre-wrap">
                      {viewingTerm.content}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-2">Content Statistics:</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Characters:</span> {viewingTerm.content?.length || 0}
                      </div>
                      <div>
                        <span className="font-medium">Has HTML:</span> {viewingTerm.content?.includes('<') ? 'Yes' : 'No'}
                      </div>
                      <div>
                        <span className="font-medium">Version:</span> {viewingTerm.version}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> {viewingTerm.status ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none">
                  <div 
                    className="text-slate-600 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: viewingTerm.content }}
                  />
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center space-x-4">
                    <span>Created: {new Date(viewingTerm.created_at).toLocaleDateString('pt-BR')} at {new Date(viewingTerm.created_at).toLocaleTimeString('pt-BR')}</span>
                    {viewingTerm.updated_at && (
                      <span>• Updated: {new Date(viewingTerm.updated_at).toLocaleDateString('pt-BR')} at {new Date(viewingTerm.updated_at).toLocaleTimeString('pt-BR')}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setViewingTerm(null);
                        setEditingTerm(viewingTerm);
                      }}
                      className="px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TermsManagement;
