// @ts-nocheck
import React, { useState } from 'react';
import { useState as useStateReact, useEffect, useMemo } from 'react';

const HowItWorksAccordion = () => {
  const [open, setOpen] = useState(false);

  const steps = [
    {
      number: '01',
      title: 'Cadastre vendedores',
      description: 'Convide vendedores pelo e-mail. Cada um recebe um link de indicação único.',
    },
    {
      number: '02',
      title: 'Vendedores geram matrículas',
      description: 'Os vendedores compartilham o link. Alunos se cadastram através dele.',
    },
    {
      number: '03',
      title: 'Aluno conclui o fluxo',
      description: 'O aluno passa por todas as etapas e paga a última taxa do processo.',
    },
    {
      number: '04',
      title: 'Comissão é liberada',
      description: 'Somente após o pagamento da última taxa a comissão é registrada e fica disponível para saque.',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-900">Como funciona o sistema de afiliados</span>
        <span className="text-slate-400 text-sm font-medium">{open ? 'Fechar' : 'Ver mais'}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col gap-2">
                <span className="text-2xl font-bold text-slate-200">{step.number}</span>
                <h4 className="font-semibold text-slate-900 text-sm">{step.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-2">Comissionamento</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                A comissão da sua agência é liberada somente após o aluno concluir todo o fluxo e pagar a última taxa. Pagamentos parciais não geram comissão. O valor é definido individualmente no contrato com a Matrícula USA.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-2">Acompanhamento de vendas</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                Use a seção <strong>Seller Tracking</strong> para ver todos os alunos indicados, qual vendedor os trouxe e se já realizaram o pagamento.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-2">Saque de comissões</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                O saldo disponível aparece no card acima. Acesse <strong>Payment Management</strong> para solicitar o saque quando quiser.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Search,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useAgencyRevenueCalculationQuery } from '../../hooks/useAgencyQueries';
import { invalidateAffiliateAdminAll } from '../../lib/queryKeys';

const Overview = ({ stats, sellers = [], students = [], onRefresh, userId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ React Query Hook para cálculos de receita
  const {
    data: revenueData,
    isPending: isLoadingRevenue,
    error: revenueError
  } = useAgencyRevenueCalculationQuery(userId);

  // Default values for stats
  const safeStats = {
    totalSellers: stats?.totalSellers || 0,
    activeSellers: stats?.activeSellers || 0,
    pendingSellers: stats?.pendingSellers || 0,
    approvedSellers: stats?.approvedSellers || 0,
    rejectedSellers: stats?.rejectedSellers || 0,
    totalStudents: stats?.totalStudents || 0,
    totalRevenue: stats?.totalRevenue || 0
  };

  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // ✅ Usar dados do React Query com fallback para valores antigos
  const totalRevenue = revenueData?.totalRevenue ?? safeStats.totalRevenue;
  const adjustedRevenueByReferral = revenueData?.adjustedRevenueByReferral ?? {};
  const paidStudents = revenueData?.paidStudents ?? [];
  const paidStudentsCount = revenueData?.paidStudentsCount ?? 0;
  const revenueBreakdown = revenueData?.revenueBreakdown ?? [];

  // Mapear comissão por ID do estudante para exibição individual
  const studentCommissions = useMemo(() => {
    const map = {};
    (revenueBreakdown || []).forEach(b => {
      map[b.profile_id] = b.total;
    });
    return map;
  }, [revenueBreakdown]);

  // Estados para o Painel de Vendas e Registros
  const [searchTerm, setSearchTerm] = useStateReact('');
  const [statusFilter, setStatusFilter] = useStateReact('all'); // all, active, registered
  const [copiedSellerId, setCopiedSellerId] = useStateReact(null);

  // Mapeamento de vendedores por código de indicação para lookup rápido
  const sellersByReferralCode = useMemo(() => {
    const map = {};
    (sellers || []).forEach(s => {
      if (s.referral_code) {
        map[s.referral_code.toUpperCase()] = s;
      }
    });
    return map;
  }, [sellers]);

  // Lista de estudantes filtrados para o Painel de Vendas e Registros
  const filteredStudentList = useMemo(() => {
    return (students || []).filter(student => {
      const referralCode = (student.seller_referral_code || '').toUpperCase();
      const seller = sellersByReferralCode[referralCode];

      const studentName = student.full_name || '';
      const studentEmail = student.email || '';
      const sellerName = seller?.name || '';

      const matchesSearch =
        studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referralCode.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'active') {
        return matchesSearch && student.has_paid_selection_process_fee;
      }
      if (statusFilter === 'registered') {
        return matchesSearch && !student.has_paid_selection_process_fee;
      }
      return matchesSearch;
    });
  }, [students, sellersByReferralCode, searchTerm, statusFilter]);

  const handleCopyLink = (referralCode, sellerId) => {
    const link = `${window.location.origin}/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedSellerId(sellerId);
    setTimeout(() => {
      setCopiedSellerId(null);
    }, 2000);
  };


  // ✅ Função de refresh usando React Query
  const handleRefresh = () => {
    invalidateAffiliateAdminAll(queryClient);
    onRefresh?.(); // Manter compatibilidade com props externos
  };



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // ✅ Agrupar estudantes pagos por referral_code usando dados do React Query
  const paidStudentsByReferral = useMemo(() => {
    const map = {};
    (paidStudents || []).forEach((s) => {
      const referralCode = (s.seller_referral_code || '').toUpperCase();
      if (referralCode) {
        if (!map[referralCode]) {
          map[referralCode] = [];
        }
        map[referralCode].push(s);
      }
    });
    return map;
  }, [paidStudents]);

  // ✅ Recent sellers usando dados do React Query
  const recentSellers = useMemo(() => {
    if (isLoadingRevenue) return [];

    return (sellers || [])
      .filter((s) => {
        const referralCode = (s.referral_code || '').toUpperCase();
        const hasAdjustedRevenue = adjustedRevenueByReferral[referralCode] && adjustedRevenueByReferral[referralCode] > 0;
        return hasAdjustedRevenue;
      })
      .map((s) => {
        const paidCount = paidStudentsByReferral[(s?.referral_code || '').toUpperCase()]?.length || 0;
        return {
          ...s,
          students_count: paidCount
        };
      })
      .slice(0, 5);
  }, [sellers, paidStudentsByReferral, adjustedRevenueByReferral, isLoadingRevenue]);

  // ✅ Display sellers usando dados do React Query
  const displaySellers = useMemo(() => {
    if (isLoadingRevenue) return [];

    return (sellers || [])
      .filter((s) => {
        const referralCode = (s.referral_code || '').toUpperCase();
        const hasRevenue = (adjustedRevenueByReferral[referralCode] ?? 0) > 0;
        const hasPaidStudents = (paidStudentsByReferral[referralCode]?.length ?? 0) > 0;
        return hasRevenue || hasPaidStudents;
      })
      .map((s) => {
        const referralCode = (s?.referral_code || '').toUpperCase();
        const adjustedRevenue = adjustedRevenueByReferral[referralCode];
        const finalRevenue = adjustedRevenue != null && adjustedRevenue !== undefined ? adjustedRevenue : 0;
        const paidCount = paidStudentsByReferral[referralCode]?.length || 0;

        return {
          ...s,
          total_revenue: finalRevenue,
          students_count: paidCount
        };
      });
  }, [sellers, adjustedRevenueByReferral, paidStudentsByReferral, isLoadingRevenue]);

  // ✅ Total revenue usando dados do React Query
  const displayTotalRevenue = useMemo(() => {
    if (isLoadingRevenue) return 0;
    return Object.values(adjustedRevenueByReferral || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
  }, [adjustedRevenueByReferral, isLoadingRevenue]);


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Refresh Data
        </button>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card de Comissão: Comissões Acumuladas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500 mb-1">Comissões Acumuladas</p>
              {isLoadingRevenue ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-9 w-32 bg-slate-200 rounded"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalRevenue || 0)}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm font-medium text-blue-600">Total acumulado</span>
                  </div>
                </>
              )}
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        {/* Card de Número de Estudantes */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Número de Estudantes</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.totalStudents || 0}</p>
              <div className="flex items-center mt-2">
                <Users className="h-4 w-4 text-[#05294E] mr-1" />
                <span className="text-sm font-medium text-[#05294E]">Alunos vinculados</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-[#05294E] to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        {/* Card de Saldo Disponível para Saque */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500 mb-1">Saldo Disponível para Saque</p>
              {isLoadingRevenue ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-9 w-32 bg-slate-200 rounded"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats?.availableBalance || 0)}</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                    <span className="text-sm font-medium text-emerald-600">Disponível para retirada</span>
                  </div>
                </>
              )}
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* How the affiliate system works */}
      <HowItWorksAccordion />

      {/* Seller Management Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-slate-900">Seller Management</h3>
              <p className="text-slate-500 text-sm">Manage your sales team</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/agency/dashboard/users?tab=registration')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#05294E] text-white rounded-lg text-sm font-medium hover:bg-[#041f3a] transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add Seller
              </button>
              <button
                onClick={() => navigate('/agency/dashboard/users')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                View All
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {(sellers || []).length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-[#05294E]" />
              </div>
              <p className="text-slate-500 font-medium">No sellers yet</p>
              <button
                onClick={() => navigate('/agency/dashboard/users?tab=registration')}
                className="mt-3 text-sm text-[#05294E] font-semibold hover:underline"
              >
                Add your first seller →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-3 font-medium">Seller</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Students</th>
                    <th className="pb-3 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(sellers || []).slice(0, 8).map((seller) => {
                    const adjustedRevenue = adjustedRevenueByReferral[seller.referral_code] || 0;
                    const studentCount = paidStudentsByReferral[seller.referral_code]?.length || seller.students_count || 0;
                    return (
                      <tr key={seller.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white">{seller.name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{seller.name}</p>
                              <p className="text-xs text-slate-400 truncate">{seller.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${seller.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {seller.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-medium text-slate-900">{studentCount}</td>
                        <td className="py-3 text-right font-medium text-slate-900">{formatCurrency(adjustedRevenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(sellers || []).length > 8 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => navigate('/agency/dashboard/users')}
                    className="text-sm text-[#05294E] font-semibold hover:underline"
                  >
                    View all {sellers.length} sellers →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top Sellers Section */}
      {sellers && sellers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-slate-900">Top Sellers</h3>
                <p className="text-slate-500 text-sm break-words">
                  Ranking of top performing sellers based on performance
                </p>
              </div>
              <div
                onClick={() => navigate('/agency/dashboard/analytics')}
                className="text-[#05294E] hover:text-[#05294E] font-medium text-sm flex items-center cursor-pointer self-start sm:self-auto"
              >
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoadingRevenue ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                        <div className="min-w-0 flex-1">
                          <div className="h-5 w-32 bg-slate-200 rounded mb-2"></div>
                          <div className="h-4 w-48 bg-slate-200 rounded mb-2"></div>
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-20 bg-slate-200 rounded-full"></div>
                            <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="space-y-1">
                          <div className="h-6 w-24 bg-slate-200 rounded"></div>
                          <div className="h-5 w-20 bg-slate-200 rounded"></div>
                          <div className="h-4 w-28 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {displaySellers
                  .sort((a, b) => {
                    if (b.students_count !== a.students_count) {
                      return b.students_count - a.students_count;
                    }
                    return (b.total_revenue || 0) - (a.total_revenue || 0);
                  })
                  .slice(0, 3)
                  .map((seller, index) => (
                  <div
                    key={seller.id}
                    className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 break-words">{seller.name}</p>
                          <p className="text-sm text-slate-600 break-words">{seller.email}</p>
                          <div className="flex items-center flex-wrap gap-2 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                              {seller.referral_code}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                              seller.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {seller.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="space-y-1">
                          <div className="flex items-center sm:justify-end space-x-2">
                            <span className="text-lg font-bold text-slate-900 whitespace-nowrap">
                              {seller.students_count || 0}
                            </span>
                            <span className="text-sm text-slate-500">students</span>
                          </div>
                          <div className="text-sm font-medium text-slate-700">
                            {formatCurrency(seller.total_revenue || 0)}
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatDate(seller.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {displaySellers.length > 3 && (
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-600 mb-3">Other Sellers</h4>
                  <div className="space-y-3">
                    {displaySellers
                      .sort((a, b) => {
                        if (b.students_count !== a.students_count) {
                          return b.students_count - a.students_count;
                        }
                        return (b.total_revenue || 0) - (a.total_revenue || 0);
                      })
                      .slice(3, 6)
                      .map((seller, index) => (
                        <div
                          key={seller.id}
                          className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-6 h-6 bg-slate-300 rounded flex items-center justify-center text-white text-xs font-medium">
                                {index + 4}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 break-words">{seller.name}</p>
                                <p className="text-xs text-slate-500 break-words">{seller.email}</p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <div className="flex items-center sm:justify-end space-x-4">
                                <span className="text-sm text-slate-700 whitespace-nowrap">
                                  {seller.students_count || 0} students
                                </span>
                                <span className="text-sm text-slate-700 whitespace-nowrap">
                                  {formatCurrency(seller.total_revenue || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Painel de Vendas e Registros */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-slate-900">Painel de Vendas e Registros</h3>
              <p className="text-slate-500 text-sm mt-0.5">
                {filteredStudentList.length} de {students.length} registro{students.length !== 1 ? 's' : ''} • {students.filter(s => s.has_paid_selection_process_fee).length} aluno{students.filter(s => s.has_paid_selection_process_fee).length !== 1 ? 's' : ''} ativos
              </p>
            </div>
            <button
              onClick={() => navigate('/agency/dashboard/students')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors self-start sm:self-auto"
            >
              Ver Completo
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por aluno, email ou vendedor..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#05294E]/30 focus:border-[#05294E] bg-slate-50"
              />
            </div>
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 flex-shrink-0">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'active', label: 'Ativos' },
                { value: 'registered', label: 'Registrados' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    statusFilter === opt.value
                      ? 'bg-white text-[#05294E] shadow-sm font-semibold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Body */}
        {students.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Users className="h-10 w-10 text-[#05294E]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhum registro ainda</h3>
            <p className="text-slate-500 text-sm mb-4">Adicione vendedores para começar a capturar registros</p>
            <button
              onClick={() => navigate('/agency/dashboard/users?tab=registration')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#05294E] text-white rounded-lg text-sm font-medium hover:bg-[#041f3a] transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Adicionar Vendedor
            </button>
          </div>
        ) : filteredStudentList.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum resultado para "{searchTerm}"</p>
            <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} className="mt-2 text-sm text-[#05294E] font-semibold hover:underline">
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold">Estudante</th>
                  <th className="px-5 py-3 font-semibold">Vendedor</th>
                  <th className="px-5 py-3 font-semibold">Registro</th>
                  <th className="px-5 py-3 font-semibold">Etapas pagas</th>
                  <th className="px-5 py-3 font-semibold">Comissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudentList.slice(0, 15).map((student) => {
                  const referralCode = (student.seller_referral_code || '').toUpperCase();
                  const seller = sellersByReferralCode[referralCode];
                  const studentId = student.profile_id || student.id;
                  const commission = studentCommissions[studentId] != null
                    ? studentCommissions[studentId]
                    : 0;

                  // ── Etapas dinâmicas baseadas no tipo de processo (igual ao admin) ──
                  const isTransfer = student.student_process_type === 'transfer';
                  const isReinstatement = isTransfer && student.visa_transfer_active === false;
                  const isPlacementFlow = !!student.placement_fee_flow;
                  // I-20 apenas para Initial, COS e Reinstatement — Transfer ativo não tem I-20
                  const hasI20Step = !isTransfer || isReinstatement;

                  const fees = [
                    { key: 'selection', label: 'Sel.', paid: !!student.has_paid_selection_process_fee },
                    { key: 'application', label: 'App.', paid: !!student.is_application_fee_paid },
                    isPlacementFlow
                      ? { key: 'placement', label: 'Plac.', paid: !!student.is_placement_fee_paid }
                      : { key: 'scholarship', label: 'Schol.', paid: !!student.is_scholarship_fee_paid },
                    ...(isReinstatement
                      ? [
                          { key: 'reinstatement', label: 'Reinst.', paid: !!student.has_paid_reinstatement_package },
                          { key: 'control', label: 'Control', paid: !!(student.has_paid_i20_control_fee || student.has_paid_i539_cos_package || student.has_paid_ds160_package) }
                        ]
                      : (hasI20Step
                          ? [{ key: 'i20', label: 'I-20', paid: !!(student.has_paid_i20_control_fee || student.has_paid_i539_cos_package || student.has_paid_ds160_package) }]
                          : []))
                  ];
                  // ─────────────────────────────────────────────────────────────────

                  const isActive = !!student.has_paid_selection_process_fee;

                  return (
                    <tr key={student.profile_id || student.user_id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Estudante */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                            <span className={`text-xs font-bold ${isActive ? 'text-emerald-700' : 'text-orange-600'}`}>
                              {(student.full_name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate max-w-[160px]">{student.full_name || 'Sem nome'}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[160px]">{student.email}</p>
                          </div>
                          {isActive ? (
                            <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 flex-shrink-0">Ativo</span>
                          ) : (
                            <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600 flex-shrink-0">Registrado</span>
                          )}
                        </div>
                      </td>

                      {/* Vendedor */}
                      <td className="px-5 py-3">
                        {seller ? (
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate max-w-[120px]">{seller.name}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{referralCode}</span>
                                <button
                                  onClick={() => handleCopyLink(referralCode, seller.id)}
                                  className="text-slate-400 hover:text-[#05294E] transition-colors"
                                  title="Copiar link de indicação"
                                >
                                  {copiedSellerId === seller.id ? (
                                    <Check className="h-3 w-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Não atribuído</span>
                        )}
                      </td>

                      {/* Data de Registro */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-xs whitespace-nowrap">{formatDate(student.created_at)}</span>
                        </div>
                      </td>

                      {/* Etapas Pagas */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {fees.map(fee => (
                            <div key={fee.key} className="flex flex-col items-center gap-0.5" title={`${fee.label}: ${fee.paid ? 'Pago' : 'Pendente'}`}>
                              {fee.paid ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-slate-200" />
                              )}
                              <span className={`text-[9px] font-semibold ${fee.paid ? 'text-emerald-600' : 'text-slate-300'}`}>{fee.label}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Comissão */}
                      <td className="px-5 py-3">
                        {isActive ? (
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(commission)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Aguardando</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Show more */}
            {filteredStudentList.length > 15 && (
              <div className="px-5 py-4 border-t border-slate-100 text-center">
                <button
                  onClick={() => navigate('/agency/dashboard/students')}
                  className="text-sm text-[#05294E] font-semibold hover:underline"
                >
                  Ver todos os {filteredStudentList.length} registros →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Overview;
