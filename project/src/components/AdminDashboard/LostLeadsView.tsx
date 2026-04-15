import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  UserX,
  CheckCircle2,
  Users,
  TrendingUp,
  Phone,
  Mail,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';

interface Lead {
  lead_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source_page: string;
  status: 'pending' | 'converted';
  created_at: string;
  updated_at: string;
  pre_qualification_answers: Record<string, any> | null;
}

const SOURCE_LABELS: Record<string, string> = {
  quick_registration: 'Quick Registration',
  auth_register: 'Standard Registration',
  pre_qualification_landing: 'Pre-Qualification',
};

const LostLeadsView: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'converted' | 'all'>('pending');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.rpc('get_pre_registration_leads');

      if (fetchError) throw fetchError;
      setLeads(data || []);
    } catch (err: any) {
      setError('Error loading leads. Please try again.');
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const totalLeads = leads.length;
  const pendingLeads = leads.filter(l => l.status === 'pending').length;
  const convertedLeads = leads.filter(l => l.status === 'converted').length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      !search ||
      (lead.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (lead.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone || '').includes(search);

    const matchesSource = sourceFilter === 'all' || lead.source_page === sourceFilter;
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const openWhatsApp = (phone: string, name: string | null) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hi${name ? ' ' + name.split(' ')[0] : ''}! We noticed you started your registration at Matrícula USA but didn't finish. Do you have any questions? We're here to help! 😊`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const openEmail = (email: string, name: string | null) => {
    const subject = encodeURIComponent('Matrícula USA — Your registration is waiting for you!');
    const body = encodeURIComponent(
      `Hi${name ? ' ' + name.split(' ')[0] : ''},\n\nWe noticed you started your registration at Matrícula USA but didn't finish.\n\nWe are here to help you with any questions!\n\nMatrícula USA Team`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center space-x-4">
          <div className="bg-amber-100 rounded-xl p-3">
            <UserX className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-amber-600 font-bold uppercase tracking-widest">Leads</p>
            <p className="text-3xl font-black text-amber-700">{pendingLeads}</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center space-x-4">
          <div className="bg-green-100 rounded-xl p-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-green-600 font-bold uppercase tracking-widest">Converted</p>
            <p className="text-3xl font-black text-green-700">{convertedLeads}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center space-x-4">
          <div className="bg-blue-100 rounded-xl p-3">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Conversion Rate</p>
            <p className="text-3xl font-black text-blue-700">{conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="border border-gray-200 rounded-xl text-sm py-2 px-3 outline-none focus:ring-2 focus:ring-[#05294E]"
          >
            <option value="pending">Only Pending</option>
            <option value="converted">Only Converted</option>
            <option value="all">All Status</option>
          </select>

          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="border border-gray-200 rounded-xl text-sm py-2 px-3 outline-none focus:ring-2 focus:ring-[#05294E]"
          >
            <option value="all">All Sources</option>
            <option value="quick_registration">Quick Registration</option>
            <option value="auth_register">Standard Registration</option>
            <option value="pre_qualification_landing">Pre-Qualification</option>
          </select>
        </div>

        <button
          onClick={fetchLeads}
          className="flex items-center space-x-2 px-4 py-2 bg-[#05294E] text-white rounded-xl text-sm font-bold hover:bg-[#05294E]/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-[#05294E] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 space-x-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-2 text-gray-400">
            <Users className="h-10 w-10" />
            <p className="font-medium">No leads found</p>
            <p className="text-sm">Try adjusting individual filters or wait for new captures.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Captured</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Details</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map(lead => (
                  <tr key={lead.lead_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 text-sm">
                        {lead.full_name || <span className="text-gray-400 italic">No name</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {lead.email || <span className="text-gray-400 italic">No email</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {lead.phone || <span className="text-gray-400 italic">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                        lead.source_page === 'quick_registration'
                          ? 'bg-purple-100 text-purple-700'
                          : lead.source_page === 'pre_qualification_landing'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {SOURCE_LABELS[lead.source_page] || lead.source_page}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                        lead.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {lead.status === 'pending' ? 'Pending' : 'Converted'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(lead.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {lead.pre_qualification_answers ? (
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors"
                        >
                          View Answers
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Answers</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {lead.phone && (
                          <button
                            onClick={() => openWhatsApp(lead.phone!, lead.full_name)}
                            title="Contact via WhatsApp"
                            className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        )}
                        {lead.email && (
                          <button
                            onClick={() => openEmail(lead.email!, lead.full_name)}
                            title="Send Email"
                            className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-400">
              Showing {filteredLeads.length} of {totalLeads} leads
            </div>
          </div>
        )}
      </div>

      {/* Pre-Qualification Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pre-Qualification Answers</h3>
                <p className="text-sm text-slate-500">{selectedLead.full_name || selectedLead.email}</p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(selectedLead.pre_qualification_answers || {}).map(([key, value]) => (
                  <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</p>
                    <p className="font-semibold text-slate-800 capitalize">{String(value).replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
              
              {(!selectedLead.pre_qualification_answers || Object.keys(selectedLead.pre_qualification_answers).length === 0) && (
                <div className="text-center py-12 text-gray-400">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No answers found for this lead.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedLead(null)}
                className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LostLeadsView;
