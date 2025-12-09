import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  MapPin, 
  Monitor,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { generateTermAcceptancePDF, StudentTermAcceptanceData } from '../../utils/pdfGenerator';

interface StudentTermAcceptance {
  id: string;
  user_id: string;
  term_id: string;
  term_type: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Identity photo information
  identity_photo_path?: string;
  identity_photo_name?: string;
  // User profile information
  user_email: string;
  user_full_name: string;
  user_country?: string;
  user_phone?: string;
  // Term information
  term_title: string;
  term_content: string;
  // Affiliate information
  referral_code_used?: string;
  affiliate_code?: string;
}

interface StudentFilters {
  searchTerm: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  termType: 'all' | 'checkout_terms' | 'university_terms' | 'affiliate_terms';
}

const MyStudents: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentTermAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<StudentFilters>({
    searchTerm: '',
    dateRange: 'all',
    termType: 'all'
  });

  // Carregar estudantes vinculados através da cadeia seller->affiliate
  const loadMyStudents = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [MyStudents] Carregando estudantes para affiliate:', user.id);

      // Primeiro, buscar o affiliate_admin associado ao usuário atual
      const { data: affiliateAdmin, error: affiliateError } = await supabase
        .from('affiliate_admins')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (affiliateError || !affiliateAdmin?.id) {
        console.log('🔍 [MyStudents] Usuário não possui affiliate_admin ativo:', affiliateError);
        setStudents([]);
        return;
      }

      console.log('🔍 [MyStudents] Affiliate Admin encontrado:', affiliateAdmin.id);

      // Buscar sellers vinculados a este affiliate_admin
      const { data: sellers, error: sellersError } = await supabase
        .from('sellers')
        .select('id, referral_code, name')
        .eq('affiliate_admin_id', affiliateAdmin.id)
        .eq('is_active', true);

      if (sellersError) {
        throw new Error('Erro ao buscar sellers: ' + sellersError.message);
      }

      if (!sellers || sellers.length === 0) {
        console.log('🔍 [MyStudents] Nenhum seller encontrado para este affiliate');
        setStudents([]);
        return;
      }

      console.log('🔍 [MyStudents] Sellers encontrados:', sellers.map(s => s.referral_code));

      // Buscar usuários que usaram os códigos de referral desses sellers
      const sellerCodes = sellers.map(s => s.referral_code);
      const { data: referredUsers, error: referredError } = await supabase
        .from('user_profiles')
        .select('user_id, email, full_name, country, phone, seller_referral_code')
        .in('seller_referral_code', sellerCodes);

      if (referredError) {
        throw new Error('Erro ao buscar usuários referenciados: ' + referredError.message);
      }

      if (!referredUsers || referredUsers.length === 0) {
        console.log('Nenhum usuário encontrado usando este código de affiliate');
        setStudents([]);
        return;
      }

      // Extrair IDs dos usuários referenciados
      const referredUserIds = referredUsers.map((u: any) => u.user_id);

      // Buscar aceitações de termos desses usuários (incluindo foto de identidade)
      const { data: termAcceptances, error: termError } = await supabase
        .from('comprehensive_term_acceptance')
        .select(`
          id,
          user_id,
          term_id,
          term_type,
          accepted_at,
          ip_address,
          user_agent,
          created_at,
          identity_photo_path,
          identity_photo_name
        `)
        .in('user_id', referredUserIds)
        .order('accepted_at', { ascending: false });

      if (termError) {
        throw new Error('Erro ao buscar aceitações de termos: ' + termError.message);
      }

      if (!termAcceptances || termAcceptances.length === 0) {
        console.log('Nenhuma aceitação de termos encontrada para os usuários referenciados');
        setStudents([]);
        return;
      }

      // Buscar informações dos termos
      const termIds = [...new Set(termAcceptances.map((t: any) => t.term_id))];
      const { data: terms, error: termsError } = await supabase
        .from('application_terms')
        .select('id, title, content')
        .in('id', termIds);

      if (termsError) {
        console.error('Erro ao buscar termos:', termsError);
      }

      // Criar mapas para lookup rápido
      const userMap = new Map(referredUsers.map((u: any) => [u.user_id, u]));
      const termMap = new Map((terms || []).map((t: any) => [t.id, t]));

      // Combinar dados
      const combinedData: StudentTermAcceptance[] = termAcceptances.map((acceptance: any) => {
        const userInfo = userMap.get(acceptance.user_id);
        const termInfo = termMap.get(acceptance.term_id);

        return {
          id: acceptance.id,
          user_id: acceptance.user_id,
          term_id: acceptance.term_id,
          term_type: acceptance.term_type,
          accepted_at: acceptance.accepted_at,
          ip_address: acceptance.ip_address,
          user_agent: acceptance.user_agent,
          created_at: acceptance.created_at,
          identity_photo_path: acceptance.identity_photo_path || undefined,
          identity_photo_name: acceptance.identity_photo_name || undefined,
          user_email: userInfo?.email || 'N/A',
          user_full_name: userInfo?.full_name || 'N/A',
          user_country: userInfo?.country,
          user_phone: userInfo?.phone,
          term_title: termInfo?.title || 'N/A',
          term_content: termInfo?.content || '',
          referral_code_used: userInfo?.seller_referral_code,
          affiliate_code: affiliateAdmin.id
        };
      });

      setStudents(combinedData);

    } catch (err: any) {
      console.error('Erro ao carregar estudantes:', err);
      setError(err.message || 'Erro desconhecido ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyStudents();
  }, [user?.id]);

  // Filtrar estudantes baseado nos filtros aplicados
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Filtro de busca
      const matchesSearch = 
        student.user_full_name?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        student.user_email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        student.term_title?.toLowerCase().includes(filters.searchTerm.toLowerCase());

      // Filtro de tipo de termo
      const matchesTermType = filters.termType === 'all' || student.term_type === filters.termType;

      // Filtro de data
      let matchesDate = true;
      if (filters.dateRange !== 'all') {
        const acceptedDate = new Date(student.accepted_at);
        const now = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            matchesDate = acceptedDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = acceptedDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            matchesDate = acceptedDate >= monthAgo;
            break;
          case 'year':
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            matchesDate = acceptedDate >= yearAgo;
            break;
        }
      }

      return matchesSearch && matchesTermType && matchesDate;
    });
  }, [students, filters]);

  // Gerar PDF para um estudante específico
  const generateStudentPDF = async (student: StudentTermAcceptance) => {
    try {
      // ✅ identity_photo_path e identity_photo_name já vêm do student (carregados na query)
      const pdfData: StudentTermAcceptanceData = {
        student_name: student.user_full_name,
        student_email: student.user_email,
        term_title: student.term_title,
        accepted_at: new Date(student.accepted_at).toLocaleString('en-US'),
        ip_address: student.ip_address || 'N/A',
        user_agent: student.user_agent || 'N/A',
        country: student.user_country || 'N/A',
        affiliate_code: student.affiliate_code,
        term_content: student.term_content,
        identity_photo_path: student.identity_photo_path,
        identity_photo_name: student.identity_photo_name
      };

      // Gerar e baixar PDF (agora é assíncrono)
      await generateTermAcceptancePDF(pdfData);

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTermTypeLabel = (termType: string) => {
    switch (termType) {
      case 'checkout_terms':
        return 'Checkout Terms';
      case 'university_terms':
        return 'University Terms';
      case 'affiliate_terms':
        return 'Affiliate Terms';
      default:
        return termType;
    }
  };

  const getTermTypeColor = (termType: string) => {
    switch (termType) {
      case 'checkout_terms':
        return 'bg-blue-100 text-blue-800';
      case 'university_terms':
        return 'bg-green-100 text-green-800';
      case 'affiliate_terms':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading student data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            My Students
          </h1>
          <p className="mt-2 text-slate-600">
            Manage the term signatures of students you referred
          </p>
        </div>
        <button
          onClick={loadMyStudents}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
        >
          <Clock className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email or term..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="week">Last week</option>
              <option value="month">Last month</option>
              <option value="year">Last year</option>
            </select>
          </div>

          {/* Term Type Filter */}
          <div>
            <select
              value={filters.termType}
              onChange={(e) => setFilters({ ...filters, termType: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All types</option>
              <option value="checkout_terms">Checkout Terms</option>
              <option value="university_terms">University Terms</option>
              <option value="affiliate_terms">Affiliate Terms</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Students</p>
              <p className="text-2xl font-bold text-slate-900">
                {new Set(students.map(s => s.user_id)).size}
              </p>
            </div>
            <User className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Term Acceptances</p>
              <p className="text-2xl font-bold text-slate-900">{students.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">This Month</p>
              <p className="text-2xl font-bold text-slate-900">
                {students.filter(s => {
                  const acceptedDate = new Date(s.accepted_at);
                  const now = new Date();
                  return acceptedDate.getMonth() === now.getMonth() && 
                         acceptedDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Filtered</p>
              <p className="text-2xl font-bold text-slate-900">{filteredStudents.length}</p>
            </div>
            <Filter className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Term Acceptance History ({filteredStudents.length})
          </h3>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No signatures found
            </h3>
            <p className="text-slate-600 mb-6">
              {students.length === 0 
                ? 'There are no students yet who used your referral code and accepted terms.'
                : 'Adjust filters to see more results.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Term
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Acceptance Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Technical Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-slate-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">
                            {student.user_full_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {student.user_email}
                          </div>
                          {student.user_country && (
                            <div className="flex items-center mt-1">
                              <MapPin className="h-3 w-3 text-slate-400 mr-1" />
                              <span className="text-xs text-slate-500">
                                {student.user_country}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {student.term_title}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTermTypeColor(student.term_type)}`}>
                          {getTermTypeLabel(student.term_type)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm text-slate-900">
                          {formatDate(student.accepted_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-slate-600 space-y-1">
                        <div className="flex items-center">
                          <span className="font-medium mr-2">IP:</span>
                          {student.ip_address || 'N/A'}
                        </div>
                        <div className="flex items-center">
                          <Monitor className="h-3 w-3 mr-2" />
                          <span className="truncate max-w-[200px]" title={student.user_agent}>
                            {student.user_agent?.substring(0, 50)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => generateStudentPDF(student)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors duration-200 flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStudents;