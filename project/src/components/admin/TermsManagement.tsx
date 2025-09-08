import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit, Trash2, Eye, Save, X, History, Users, Calendar, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTermsAcceptance, TermType } from '../../hooks/useTermsAcceptance';

interface Term {
  id: string;
  title: string;
  content: string;
  term_type: TermType;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TermAcceptance {
  id: string;
  user_id: string;
  term_id: string;
  term_type: TermType;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_email?: string;
  user_full_name?: string;
  term_title?: string;
}

export const TermsManagement: React.FC = () => {
  const { t } = useTranslation();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    term_type: 'terms_of_service' as TermType,
    version: 1,
    is_active: true
  });

  // Acceptance history states
  const [acceptanceHistory, setAcceptanceHistory] = useState<TermAcceptance[]>([]);
  const [showAcceptanceHistory, setShowAcceptanceHistory] = useState(false);
  const [acceptanceHistoryLoading, setAcceptanceHistoryLoading] = useState(false);
  const [selectedTermForHistory, setSelectedTermForHistory] = useState<Term | null>(null);

  // Load terms on component mount
  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('application_terms')
        .select('*')
        .order('term_type', { ascending: true })
        .order('version', { ascending: false });

      if (error) throw error;
      setTerms(data || []);
    } catch (error: any) {
      console.error('Error loading terms:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAcceptanceHistory = async (termId?: string) => {
    try {
      setAcceptanceHistoryLoading(true);
      let query = supabase
        .from('comprehensive_term_acceptance')
        .select(`
          *,
          application_terms!inner(title),
          user_profiles!inner(email, full_name)
        `)
        .order('accepted_at', { ascending: false });

      if (termId) {
        query = query.eq('term_id', termId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include user and term information
      const transformedData = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        term_id: item.term_id,
        term_type: item.term_type,
        accepted_at: item.accepted_at,
        ip_address: item.ip_address,
        user_agent: item.user_agent,
        created_at: item.created_at,
        user_email: item.user_profiles?.email,
        user_full_name: item.user_profiles?.full_name,
        term_title: item.application_terms?.title
      }));

      setAcceptanceHistory(transformedData);
    } catch (error: any) {
      console.error('Error loading acceptance history:', error);
      setError(error.message);
    } finally {
      setAcceptanceHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editingTerm) {
        // Update existing term
        const { error } = await supabase
          .from('application_terms')
          .update({
            title: formData.title,
            content: formData.content,
            term_type: formData.term_type,
            version: formData.version,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTerm.id);

        if (error) throw error;
      } else {
        // Create new term
        const { error } = await supabase
          .from('application_terms')
          .insert({
            title: formData.title,
            content: formData.content,
            term_type: formData.term_type,
            version: formData.version,
            is_active: formData.is_active
          });

        if (error) throw error;
      }

      // Reset form and reload terms
      resetForm();
      await loadTerms();
    } catch (error: any) {
      console.error('Error saving term:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (term: Term) => {
    setEditingTerm(term);
    setFormData({
      title: term.title,
      content: term.content,
      term_type: term.term_type,
      version: term.version,
      is_active: term.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (termId: string) => {
    if (!confirm('Are you sure you want to delete this term?')) return;

  const handleViewAcceptanceHistory = async (term: Term) => {
    setSelectedTermForHistory(term);
    setShowAcceptanceHistory(true);
    await loadAcceptanceHistory(term.id);
  };

  const handleViewAllAcceptanceHistory = async () => {
    setSelectedTermForHistory(null);
    setShowAcceptanceHistory(true);
    await loadAcceptanceHistory();
  };

    try {
      setLoading(true);
      const { error } = await supabase
        .from('application_terms')
        .delete()
        .eq('id', termId);

      if (error) throw error;
      await loadTerms();
    } catch (error: any) {
      console.error('Error deleting term:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      term_type: 'terms_of_service',
      version: 1,
      is_active: true
    });
    setEditingTerm(null);
    setShowForm(false);
  };

  const getTermTypeLabel = (type: TermType): string => {
    const labels: Record<TermType, string> = {
      terms_of_service: 'Terms of Service',
      privacy_policy: 'Privacy Policy',
      affiliate_terms: 'Affiliate Terms',
      seller_terms: 'Seller Terms',
      checkout_terms: 'Checkout Terms',
      university_terms: 'University Terms'
    };
    return labels[type];
  };

  if (loading && terms.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Terms Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleViewAllAcceptanceHistory}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <History className="w-4 h-4 mr-2" />
            View All Acceptances
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Term
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Terms List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {terms.map((term) => (
              <tr key={term.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getTermTypeLabel(term.term_type)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {term.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  v{term.version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    term.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {term.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleViewAcceptanceHistory(term)}
                    className="text-green-600 hover:text-green-900 mr-2"
                    title="View acceptance history"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(term)}
                    className="text-blue-600 hover:text-blue-900 mr-2"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(term.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium">
                {editingTerm ? 'Edit Term' : 'Add New Term'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Term Type
                  </label>
                  <select
                    value={formData.term_type}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      term_type: e.target.value as TermType 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="terms_of_service">Terms of Service</option>
                    <option value="privacy_policy">Privacy Policy</option>
                    <option value="affiliate_terms">Affiliate Terms</option>
                    <option value="seller_terms">Seller Terms</option>
                    <option value="checkout_terms">Checkout Terms</option>
                    <option value="university_terms">University Terms</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <input
                    type="number"
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      version: parseInt(e.target.value) 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content (HTML)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    content: e.target.value 
                  }))}
                  rows={15}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  required
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    is_active: e.target.checked 
                  }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Save className="w-4 h-4 mr-2" />
                      {editingTerm ? 'Update' : 'Create'}
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acceptance History Modal */}
      {showAcceptanceHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium">
                {selectedTermForHistory 
                  ? `Acceptance History - ${selectedTermForHistory.title}`
                  : 'All Term Acceptances'
                }
              </h3>
              <button
                onClick={() => setShowAcceptanceHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {acceptanceHistoryLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : acceptanceHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No acceptance records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Accepted At
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User Agent
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
                              {new Date(acceptance.accepted_at).toLocaleString()}
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
