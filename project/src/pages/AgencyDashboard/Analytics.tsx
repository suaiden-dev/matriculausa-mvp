import React, { useState, useMemo } from 'react';
import { BarChart3, Calendar, Award, UserCheck, UserX, DollarSign, TrendingUp } from 'lucide-react';
import { 
  useFinancialStatsQuery, 
  useAgencyCommissionsQuery
} from '../../hooks/useAgencyQueries';

interface AnalyticsProps {
  stats?: {
    totalSellers?: number;
    activeSellers?: number;
    totalStudents?: number;
    totalRevenue?: number;
  };
  sellers?: any[];
  students?: any[];
  userId?: string; // Adicionar userId como prop
}

const Analytics: React.FC<AnalyticsProps> = ({ sellers = [], userId }) => {
  // Queries do React Query
  const { data: financialData, isLoading: loadingFinancial } = useFinancialStatsQuery(userId);
  const { data: commissionsData, isLoading: loadingCommissions } = useAgencyCommissionsQuery(userId);

  const loading = loadingFinancial || loadingCommissions;

  // Estados para os filtros
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Gerar a lista de períodos disponíveis (últimos 12 meses)
  const availablePeriods = useMemo(() => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({ value: monthYear, label });
      date.setMonth(date.getMonth() - 1);
    }
    return months;
  }, []);

  // 1. Filtrar perfis de estudantes baseados nos filtros selecionados
  const filteredProfiles = useMemo(() => {
    let list = financialData?.enrichedProfiles || [];

    if (selectedSeller !== 'all') {
      list = list.filter((p: any) => p.seller_referral_code?.toUpperCase() === selectedSeller.toUpperCase());
    }

    if (selectedPeriod !== 'all') {
      list = list.filter((p: any) => {
        if (!p.created_at) return false;
        const monthYear = p.created_at.substring(0, 7); // "YYYY-MM"
        return monthYear === selectedPeriod;
      });
    }

    return list;
  }, [financialData?.enrichedProfiles, selectedSeller, selectedPeriod]);

  // 2. Filtrar comissões baseadas nos filtros selecionados
  const filteredCommissions = useMemo(() => {
    let list = commissionsData || [];

    // Mapeamento rápido de student_id -> seller_referral_code
    const studentsMap: Record<string, string> = {};
    (financialData?.enrichedProfiles || []).forEach((p: any) => {
      studentsMap[p.profile_id] = p.seller_referral_code || '';
    });

    if (selectedSeller !== 'all') {
      list = list.filter((c: any) => {
        const refCode = c.affiliate_code || studentsMap[c.student_id] || '';
        return refCode.toUpperCase() === selectedSeller.toUpperCase();
      });
    }

    if (selectedPeriod !== 'all') {
      list = list.filter((c: any) => {
        if (!c.created_at) return false;
        const monthYear = c.created_at.substring(0, 7); // "YYYY-MM"
        return monthYear === selectedPeriod;
      });
    }

    return list;
  }, [commissionsData, financialData?.enrichedProfiles, selectedSeller, selectedPeriod]);

  // Re-calcular KPIs com base nos dados filtrados
  const paidStudentsCount = useMemo(() => {
    return filteredProfiles.filter((p: any) => !!p?.has_paid_selection_process_fee || p?.is_scholarship_fee_paid || !!p?.has_paid_i20_control_fee).length;
  }, [filteredProfiles]);

  const registeredOnlyCount = useMemo(() => {
    return filteredProfiles.length - paidStudentsCount;
  }, [filteredProfiles, paidStudentsCount]);

  const totalPeriodRevenue = useMemo(() => {
    return filteredCommissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [filteredCommissions]);

  // 3. Processar dados mensais a partir de comissões FILTRADAS
  const monthlyData = useMemo(() => {
    if (!commissionsData) return [];

    let commissionsForGraph = commissionsData;
    // Mapeamento rápido de student_id -> seller_referral_code
    const studentsMap: Record<string, string> = {};
    (financialData?.enrichedProfiles || []).forEach((p: any) => {
      studentsMap[p.profile_id] = p.seller_referral_code || '';
    });

    if (selectedSeller !== 'all') {
      commissionsForGraph = commissionsForGraph.filter((c: any) => {
        const refCode = c.affiliate_code || studentsMap[c.student_id] || '';
        return refCode.toUpperCase() === selectedSeller.toUpperCase();
      });
    }

    // Filtrar também por período quando selecionado
    if (selectedPeriod !== 'all') {
      commissionsForGraph = commissionsForGraph.filter((c: any) => {
        if (!c.created_at) return false;
        return c.created_at.substring(0, 7) === selectedPeriod;
      });
    }

    const monthlyMap: Record<string, { students_count: number; total_revenue: number; active_sellers: Set<string> }> = {};

    // Inicializar últimos 12 meses
    const date = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[monthYear] = {
        students_count: 0,
        total_revenue: 0,
        active_sellers: new Set()
      };
    }

    commissionsForGraph.forEach((c: any) => {
      const date = new Date(c.created_at);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyMap[monthYear]) {
        monthlyMap[monthYear].total_revenue += Number(c.amount) || 0;
        monthlyMap[monthYear].active_sellers.add(c.student_id); // Usando student_id como proxy para atividade
      }
    });

    // Adicionar contagem de alunos registrados por mês (simplificado)
    if (financialData?.enrichedProfiles) {
      financialData.enrichedProfiles.forEach((p: any) => {
        if (selectedSeller !== 'all' && p.seller_referral_code?.toUpperCase() !== selectedSeller.toUpperCase()) {
          return;
        }
        const date = new Date(p.created_at);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap[monthYear]) {
          monthlyMap[monthYear].students_count++;
        }
      });
    }

    return Object.entries(monthlyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthYear, data]) => ({
        month_year: monthYear,
        students_count: data.students_count,
        total_revenue: data.total_revenue,
        active_sellers: data.active_sellers.size
      }));
  }, [commissionsData, financialData, selectedSeller, selectedPeriod]);

  // 4. Processar receita por vendedor por mês
  const revenueBySellerPerMonth = useMemo(() => {
    if (!commissionsData) return [];

    const studentsMap: Record<string, { seller_name: string, referral_code: string }> = {};
    (financialData?.enrichedProfiles || []).forEach((p: any) => {
      const seller = sellers.find((s: any) => s.referral_code?.toUpperCase() === p.seller_referral_code?.toUpperCase());
      studentsMap[p.profile_id] = {
        seller_name: seller?.name || p.seller_referral_code || 'Unknown Seller',
        referral_code: p.seller_referral_code || ''
      };
    });

    const sellerNamesMap: Record<string, string> = {};
    sellers.forEach((s: any) => {
      if (s.referral_code) {
        sellerNamesMap[s.referral_code.toUpperCase()] = s.name;
      }
    });

    // Aplicar filtro de vendedor
    let filteredCommissions = commissionsData;
    if (selectedSeller !== 'all') {
      filteredCommissions = filteredCommissions.filter((c: any) => {
        const refCode = c.affiliate_code || studentsMap[c.student_id]?.referral_code || '';
        return refCode.toUpperCase() === selectedSeller.toUpperCase();
      });
    }

    // Aplicar filtro de período
    if (selectedPeriod !== 'all') {
      filteredCommissions = filteredCommissions.filter((c: any) => {
        if (!c.created_at) return false;
        return c.created_at.substring(0, 7) === selectedPeriod;
      });
    }

    const group: Record<string, Record<string, { name: string, amount: number }>> = {};

    filteredCommissions.forEach((c: any) => {
      if (!c.created_at) return;
      const monthYear = c.created_at.substring(0, 7); // "YYYY-MM"
      const refCodeRaw = c.affiliate_code || studentsMap[c.student_id]?.referral_code || '';
      if (!refCodeRaw) return;
      const refCode = refCodeRaw.toUpperCase();
      const sellerName = sellerNamesMap[refCode] || studentsMap[c.student_id]?.seller_name || refCode;
      const amount = Number(c.amount) || 0;

      if (!group[monthYear]) {
        group[monthYear] = {};
      }
      if (!group[monthYear][refCode]) {
        group[monthYear][refCode] = { name: sellerName, amount: 0 };
      }
      group[monthYear][refCode].amount += amount;
    });

    return Object.entries(group)
      .map(([month, sellersMap]) => {
        const sellersList = Object.entries(sellersMap).map(([code, data]) => ({
          code,
          name: data.name,
          amount: data.amount
        })).sort((a, b) => b.amount - a.amount);

        return {
          month,
          sellers: sellersList,
          total: sellersList.reduce((sum, s) => sum + s.amount, 0)
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 6); // Mostrar os últimos 6 meses ativos
  }, [commissionsData, financialData?.enrichedProfiles, sellers, selectedSeller, selectedPeriod]);

  // 5. Processar receita bruta, quantidade de vendas e comissão por vendedor para a tabela
  const sellersTableData = useMemo(() => {
    const studentsMap: Record<string, string> = {};
    (financialData?.enrichedProfiles || []).forEach((p: any) => {
      studentsMap[p.profile_id] = p.seller_referral_code || '';
    });

    return (sellers || []).map((s: any) => {
      const referral = s.referral_code?.toUpperCase();

      // Alunos vinculados a este vendedor que foram filtrados pelo período
      const sellerStudents = filteredProfiles.filter((p: any) => p.seller_referral_code?.toUpperCase() === referral);

      // Quantidade de vendas: alunos que efetuaram algum pagamento
      const salesCount = sellerStudents.filter((p: any) => 
        p.has_paid_selection_process_fee || p.is_scholarship_fee_paid || p.has_paid_i20_control_fee
      ).length;

      // Calcular Receita Bruta baseada no valor total original que os alunos pagaram
      const grossRevenue = sellerStudents.reduce((sum: number, p: any) => {
        const dependents = Number(p.dependents) || 0;
        const isSimplified = p.system_type === 'simplified';
        const baseSelection = isSimplified ? 350 : 400;
        const selectionVal = isSimplified ? baseSelection : baseSelection + dependents * 150;
        const scholarshipVal = isSimplified ? 550 : 900;
        const i20Val = 900;

        let total = 0;
        if (p.has_paid_selection_process_fee) total += selectionVal;
        if (p.is_scholarship_fee_paid) total += scholarshipVal;
        if (p.is_scholarship_fee_paid && p.has_paid_i20_control_fee) total += i20Val;

        return sum + total;
      }, 0);

      // Calcular Comissão ganha (soma de filteredCommissions para este vendedor)
      const commissionTotal = filteredCommissions
        .filter((c: any) => {
          const refCode = c.affiliate_code || studentsMap[c.student_id] || '';
          return refCode.toUpperCase() === referral;
        })
        .reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);

      return {
        id: s.id,
        name: s.name,
        code: s.referral_code,
        salesCount,
        grossRevenue,
        commissionTotal
      };
    }).sort((a, b) => b.commissionTotal - a.commissionTotal);
  }, [sellers, filteredProfiles, filteredCommissions, financialData?.enrichedProfiles]);

  // 6. Processar sellers com receita REAL e contagem de alunos filtrada
  const displaySellers = useMemo(() => {
    let commissionsForSellers = commissionsData || [];

    // Aplicar filtro de período
    if (selectedPeriod !== 'all') {
      commissionsForSellers = commissionsForSellers.filter((c: any) => c.created_at?.substring(0, 7) === selectedPeriod);
    }

    const revenueByReferral: Record<string, number> = {};
    const studentsMap: Record<string, string> = {};
    (financialData?.enrichedProfiles || []).forEach((p: any) => {
      studentsMap[p.profile_id] = p.seller_referral_code || '';
    });

    commissionsForSellers.forEach((c: any) => {
      const refCode = c.affiliate_code || studentsMap[c.student_id] || '';
      if (refCode) {
        const ref = refCode.toUpperCase();
        revenueByReferral[ref] = (revenueByReferral[ref] || 0) + (Number(c.amount) || 0);
      }
    });

    // Calcular contagem de alunos por seller a partir de filteredProfiles (respeita vendedor + período)
    const studentsByReferral: Record<string, number> = {};
    filteredProfiles.forEach((p: any) => {
      const ref = p.seller_referral_code?.toUpperCase();
      if (ref) {
        studentsByReferral[ref] = (studentsByReferral[ref] || 0) + 1;
      }
    });

    // Filtrar lista de sellers pelo selectedSeller antes de mapear
    const sellerList = selectedSeller !== 'all'
      ? (sellers || []).filter((s: any) => s.referral_code?.toUpperCase() === selectedSeller.toUpperCase())
      : (sellers || []);

    return sellerList.map((s) => ({
      ...s,
      total_revenue: s?.referral_code ? (revenueByReferral[s.referral_code.toUpperCase()] || 0) : 0,
      // students_count calculado dinamicamente com filtros aplicados
      filtered_students_count: s?.referral_code ? (studentsByReferral[s.referral_code.toUpperCase()] || 0) : 0
    }));
  }, [sellers, commissionsData, financialData?.enrichedProfiles, filteredProfiles, selectedPeriod, selectedSeller]);

  // Top vendedores por performance (displaySellers já aplica o filtro de selectedSeller)
  const topSellers = useMemo(() => {
    return [...displaySellers]
      .sort((a, b) => {
        const revenueA = a.total_revenue || 0;
        const revenueB = b.total_revenue || 0;
        if (revenueB !== revenueA) return revenueB - revenueA;
        return (b.filtered_students_count || 0) - (a.filtered_students_count || 0);
      })
      .slice(0, 5);
  }, [displaySellers]);

  return (
    <div className="min-h-screen">
      {/* Header + Tabs Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Analytics Dashboard
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Comprehensive analytics and performance insights for your affiliate program.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-slate-500 text-sm md:self-end mb-1">
                <Calendar className="h-4 w-4" />
                <span>Data last updated: {new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row gap-5 items-stretch sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center">
              {/* Dropdown de Vendedor */}
              <div className="flex flex-col min-w-[220px] w-full sm:w-auto">
                <label htmlFor="seller-filter" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Seller
                </label>
                <select
                  id="seller-filter"
                  value={selectedSeller}
                  onChange={(e) => setSelectedSeller(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="all">All Sellers</option>
                  {sellers.map((s: any) => (
                    <option key={s.id} value={s.referral_code}>
                      {s.name} ({s.referral_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown de Período */}
              <div className="flex flex-col min-w-[220px] w-full sm:w-auto">
                <label htmlFor="period-filter" className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Period
                </label>
                <select
                  id="period-filter"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="all">All Periods</option>
                  {availablePeriods.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botão de Reset */}
            {(selectedSeller !== 'all' || selectedPeriod !== 'all') && (
              <button
                onClick={() => {
                  setSelectedSeller('all');
                  setSelectedPeriod('all');
                }}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors self-end sm:self-center bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Estudantes que pagaram */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Paid Students</p>
                  {loading ? (
                    <div className="h-9 bg-slate-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-green-600 mt-1">{paidStudentsCount}</p>
                      <p className="text-xs text-slate-500 mt-1">At least one fee paid</p>
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Estudantes apenas registrados */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Registered Only</p>
                  {loading ? (
                    <div className="h-9 bg-slate-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-orange-600 mt-1">{registeredOnlyCount}</p>
                      <p className="text-xs text-slate-500 mt-1">No commissions generated yet</p>
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <UserX className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Total do Período */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total of the Period</p>
                  {loading ? (
                    <div className="h-9 bg-slate-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-blue-600 mt-1">{formatCurrency(totalPeriodRevenue)}</p>
                      <p className="text-xs text-slate-500 mt-1">Total revenue generated</p>
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Melhor Vendedor */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Best Seller</p>
                  {loading ? (
                    <div className="h-9 bg-slate-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-slate-900 mt-2 truncate max-w-[170px]">
                        {topSellers[0]?.name || 'No seller'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {topSellers[0] ? formatCurrency(topSellers[0].total_revenue) : '$0.00'}
                      </p>
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Média por Venda */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Average per Sale</p>
                  {loading ? (
                    <div className="h-9 bg-slate-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-green-600 mt-1">
                        {paidStudentsCount > 0 
                          ? formatCurrency(totalPeriodRevenue / paidStudentsCount) 
                          : '$0.00'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Per paid student</p>
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Monthly Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h3 className="text-lg font-semibold text-slate-900">Monthly Performance</h3>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {loading ? (
                  // Skeleton loading para monthly performance
                  [...Array(6)].map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-20 h-4 bg-slate-200 rounded animate-pulse"></div>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[120px]">
                          <div className="bg-slate-200 h-2 rounded-full w-1/2 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-slate-200 rounded animate-pulse w-16 mb-1"></div>
                        <div className="h-3 bg-slate-200 rounded animate-pulse w-12"></div>
                      </div>
                    </div>
                  ))
                ) : monthlyData.length > 0 ? (
                  monthlyData.map((data) => (
                    <div key={data.month_year} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-20 text-sm text-slate-600 font-medium">{data.month_year}</div>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[120px]">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(data.students_count / Math.max(...monthlyData.map(d => d.students_count), 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">{data.students_count} students</div>
                        <div className="text-xs text-slate-500">{formatCurrency(data.total_revenue)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No monthly data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Sellers */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h3 className="text-lg font-semibold text-slate-900">Top Sellers</h3>
                <Award className="h-5 w-5 text-slate-400" />
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {loading ? (
                  // Skeleton loading para top sellers
                  [...Array(3)].map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
                        <div>
                          <div className="h-4 bg-slate-200 rounded animate-pulse w-24 mb-1"></div>
                          <div className="h-3 bg-slate-200 rounded animate-pulse w-32"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-4 bg-slate-200 rounded animate-pulse w-16 mb-1"></div>
                        <div className="h-3 bg-slate-200 rounded animate-pulse w-12"></div>
                      </div>
                    </div>
                  ))
                ) : topSellers.length > 0 ? (
                  topSellers.map((seller, idx) => (
                    <div key={seller.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                            idx === 1 ? 'bg-slate-100 text-slate-800' :
                              idx === 2 ? 'bg-orange-100 text-orange-800' :
                                'bg-slate-50 text-slate-600'
                          }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{seller.name}</div>
                          <div className="text-xs text-slate-500">{seller.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">{seller.filtered_students_count || 0} students</div>
                        <div className="text-xs text-slate-500">{formatCurrency(seller.total_revenue || 0)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No sellers registered</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Revenue by Seller per Month Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Revenue by Seller per Month</h3>
                <p className="text-sm text-slate-500 mt-1">Monthly breakdown of commissions generated by each seller</p>
              </div>
              <DollarSign className="h-5 w-5 text-slate-400" />
            </div>

            <div className="space-y-8">
              {loading ? (
                // Skeleton loading
                [...Array(3)].map((_, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-24"></div>
                    <div className="space-y-2">
                      <div className="h-8 bg-slate-100 rounded animate-pulse w-full"></div>
                    </div>
                  </div>
                ))
              ) : revenueBySellerPerMonth.length > 0 ? (
                revenueBySellerPerMonth.map((monthData) => (
                  <div key={monthData.month} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                      <span>{monthData.month}</span>
                      <span className="text-xs font-normal text-slate-500">Total: {formatCurrency(monthData.total)}</span>
                    </h4>
                    <div className="space-y-3">
                      {monthData.sellers.map((s) => {
                        const percent = monthData.total > 0 ? (s.amount / monthData.total) * 100 : 0;
                        return (
                          <div key={s.code} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium text-slate-600">
                              <span>{s.name} ({s.code})</span>
                              <span>{formatCurrency(s.amount)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No monthly data by seller available</p>
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Vendedores */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Performance Summary by Seller</h3>
                <p className="text-sm text-slate-500 mt-1">Detailed statistics of sales, revenue, and commissions for each seller</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Seller
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Sales Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Commission
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {loading ? (
                    [...Array(3)].map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
                        <td className="px-6 py-4 whitespace-nowrap text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
                      </tr>
                    ))
                  ) : sellersTableData.length > 0 ? (
                    sellersTableData.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-900">{row.name}</div>
                          <div className="text-xs text-slate-500">{row.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-center font-medium">
                          {row.salesCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium">
                          {formatCurrency(row.grossRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">
                          {formatCurrency(row.commissionTotal)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-500 text-sm">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500">
              All data is sourced from real-time database queries using optimized SQL functions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
