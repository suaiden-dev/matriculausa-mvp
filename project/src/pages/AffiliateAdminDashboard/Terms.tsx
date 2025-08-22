import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Term {
  id: string;
  title: string;
  content: string;
  status: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

const Terms: React.FC = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [newTerm, setNewTerm] = useState<Partial<Term> | null>(null);

  // Carregar termos
  const loadTerms = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_terms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTerms(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
  }, []);

  // Criar novo termo
  const handleCreateTerm = async () => {
    if (!newTerm?.title || !newTerm?.content) return;

    try {
      const { data, error } = await supabase
        .from('affiliate_terms')
        .insert([{
          title: newTerm.title,
          content: newTerm.content,
          status: true,
          version: 1
        }])
        .select()
        .single();

      if (error) throw error;

      setTerms([data, ...terms]);
      setNewTerm(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Atualizar termo
  const handleUpdateTerm = async () => {
    if (!editingTerm) return;

    try {
      const { data, error } = await supabase
        .from('affiliate_terms')
        .update({
          title: editingTerm.title,
          content: editingTerm.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTerm.id)
        .select()
        .single();

      if (error) throw error;

      setTerms(terms.map(t => t.id === data.id ? data : t));
      setEditingTerm(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Alternar status do termo
  const handleToggleStatus = async (id: string, newStatus: boolean) => {
    try {
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

      setTerms(terms.map(t => t.id === data.id ? data : t));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Excluir termo
  const handleDeleteTerm = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este termo?')) return;

    try {
      const { error } = await supabase
        .from('affiliate_terms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTerms(terms.filter(t => t.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Terms Management</h1>
          <p className="mt-2 text-slate-600">
            Create and manage terms of agreement for your affiliate program
          </p>
        </div>
        {!newTerm && (
          <button
            onClick={() => setNewTerm({ title: '', content: '' })}
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
              <textarea
                value={newTerm.content}
                onChange={(e) => setNewTerm({ ...newTerm, content: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter term content..."
              />
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

      {/* Terms List */}
      <div className="space-y-6">
        {terms.map((term) => (
          <div
            key={term.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            {editingTerm?.id === term.id ? (
              // Edit Mode
              <div className="space-y-4">
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
                  <textarea
                    value={editingTerm.content}
                    onChange={(e) => setEditingTerm({ ...editingTerm, content: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                  <h3 className="text-xl font-bold text-slate-900">{term.title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={term.status}
                          onChange={() => handleToggleStatus(term.id, !term.status)}
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <span className="text-sm font-medium text-slate-600">
                        {term.status ? 'Termo ativo' : 'Termo inativo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
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
                </div>
                <div className="prose prose-slate max-w-none">
                  <p className="whitespace-pre-wrap text-slate-600">{term.content}</p>
                </div>
                <div className="mt-4 flex items-center space-x-4 text-sm text-slate-500">
                  <span>Created: {new Date(term.created_at).toLocaleDateString('pt-BR')}</span>
                  {term.updated_at && (
                    <span>• Updated: {new Date(term.updated_at).toLocaleDateString('pt-BR')}</span>
                  )}
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
                onClick={() => setNewTerm({ title: '', content: '' })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Term
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Terms;
