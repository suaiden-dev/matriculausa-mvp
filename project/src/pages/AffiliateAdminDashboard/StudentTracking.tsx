import React, { useState, useMemo } from 'react';
import { GraduationCap, Search, Filter, Eye, DollarSign, Calendar, MapPin, User } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string;
  country?: string;
  referred_by_seller_id: string;
  seller_name: string;
  seller_referral_code: string;
  total_paid: number;
  status: string;
  created_at: string;
  referral_code_used: string;
  application_status?: string;
}

interface Seller {
  id: string;
  name: string;
  referral_code: string;
}

interface StudentTrackingProps {
  students: Student[];
  sellers: Seller[];
  onRefresh: () => void;
}

const StudentTracking: React.FC<StudentTrackingProps> = ({
  students,
  sellers,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Verificar se há dados
  const hasStudents = students && students.length > 0;
  const hasSellers = sellers && sellers.length > 0;
  const isLoading = !students && !sellers;

  // Se ainda está carregando, mostrar loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rastreamento de Estudantes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Acompanhe os estudantes referenciados pelos seus vendedores
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            Atualizar
          </button>
        </div>
        
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Filtrar estudantes por vendedor selecionado
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    
    return students.filter(student => {
      const matchesSearch = student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.seller_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeller = sellerFilter === 'all' || student.referred_by_seller_id === sellerFilter;
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
      
      return matchesSearch && matchesSeller && matchesStatus;
    });
  }, [students, searchTerm, sellerFilter, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'suspended': return 'Suspenso';
      default: return status || 'Ativo';
    }
  };

  // Calcular estatísticas dos estudantes filtrados
  const totalStudents = filteredStudents?.length || 0;
  const totalRevenue = filteredStudents?.reduce((sum, student) => sum + (student.total_paid || 0), 0) || 0;
  const averageRevenue = totalStudents > 0 ? totalRevenue / totalStudents : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rastreamento de Estudantes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Acompanhe os estudantes referenciados pelos seus vendedores
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total de Estudantes</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{totalStudents}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Receita Total</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Receita Média</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(averageRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar estudantes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            {hasSellers && (
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="all">Todos os Vendedores</option>
                {sellers?.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="suspended">Suspensos</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center text-sm text-slate-600">
          <span className="font-medium">{filteredStudents?.length || 0}</span>
          <span className="ml-1">estudante{(filteredStudents?.length || 0) !== 1 ? 's' : ''} encontrado{(filteredStudents?.length || 0) !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      )}

      {/* No Data State */}
      {!isLoading && !hasStudents && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <GraduationCap className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum estudante encontrado</h3>
          <p className="text-slate-600">
            Ainda não há estudantes referenciados pelos seus vendedores.
          </p>
        </div>
      )}

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredStudents && filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Estudante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Código Usado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Receita
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Application Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Cadastrado em
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredStudents?.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{student.full_name || 'Nome não informado'}</div>
                          <div className="text-sm text-slate-500">{student.email}</div>
                          {student.country && (
                            <div className="flex items-center text-xs text-slate-400 mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {student.country}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-slate-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">{student.seller_name}</div>
                          <div className="text-xs text-slate-500">{student.seller_referral_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                        {student.referral_code_used || student.seller_referral_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-sm font-medium text-slate-900">
                          {formatCurrency(student.total_paid)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(student.status)}`}>
                        {getStatusText(student.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        student.application_status === 'approved' ? 'bg-green-100 text-green-800' :
                        student.application_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        student.application_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        student.application_status === 'No application' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {student.application_status === 'approved' ? 'Approved' :
                         student.application_status === 'pending' ? 'Pending' :
                         student.application_status === 'rejected' ? 'Rejected' :
                         student.application_status === 'No application' ? 'No Application' :
                         student.application_status || 'Not specified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(student.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <GraduationCap className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum estudante encontrado</h3>
            <p className="text-slate-600">
              Tente ajustar os filtros de busca.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTracking;
