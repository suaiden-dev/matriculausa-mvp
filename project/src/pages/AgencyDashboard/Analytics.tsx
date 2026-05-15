import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Award, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDisplayAmounts } from '../../utils/paymentConverter';
import { 
  useFinancialStatsQuery, 
  useAgencyCommissionsQuery,
  useAgencyRevenueCalculationQuery 
} from '../../hooks/useAgencyQueries';

interface AnalyticsProps {
  stats: {
    totalSellers?: number;
    activeSellers?: number;
    totalStudents?: number;
    totalRevenue?: number;
  };
  sellers?: any[];
  students?: any[];
  userId?: string; // Adicionar userId como prop
}

interface MonthlyPerformance {
  month_year: string;
  students_count: number;
  total_revenue: number;
  active_sellers: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ stats: initialStats, sellers = [], userId }) => {
  // Queries do React Query
  const { data: financialData, isLoading: loadingFinancial } = useFinancialStatsQuery(userId);
  const { data: revenueData, isLoading: loadingRevenue } = useAgencyRevenueCalculationQuery(userId);
  const { data: commissionsData, isLoading: loadingCommissions } = useAgencyCommissionsQuery(userId);

  const loading = loadingFinancial || loadingRevenue || loadingCommissions;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // 1. Processar dados mensais a partir de comissões REAIS
  const monthlyData = React.useMemo(() => {
    if (!commissionsData) return [];

    const monthlyMap: Record<string, { students_count: number; total_revenue: number; active_sellers: Set<string> }> = {};

    // Inicializar últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[monthYear] = {
        students_count: 0,
        total_revenue: 0,
        active_sellers: new Set()
      };
    }

    commissionsData.forEach((c: any) => {
      const date = new Date(c.created_at);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyMap[monthYear]) {
        monthlyMap[monthYear].total_revenue += Number(c.amount) || 0;
        monthlyMap[monthYear].active_sellers.add(c.student_id); // Usando student_id como proxy para atividade
        // Nota: Para students_count real por mês, precisaríamos contar alunos únicos
      }
    });

    // Adicionar contagem de alunos registrados por mês (simplificado)
    if (financialData?.enrichedProfiles) {
      financialData.enrichedProfiles.forEach((p: any) => {
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
  }, [commissionsData, financialData]);

  // 2. Processar sellers com receita REAL
  const displaySellers = React.useMemo(() => {
    const revenueByReferral = revenueData?.adjustedRevenueByReferral || {};
    return (sellers || []).map((s) => ({
      ...s,
      total_revenue: revenueByReferral[s?.referral_code] || 0
    }));
  }, [sellers, revenueData]);

  // 3. Stats unificados
  const stats = financialData?.stats || {
    totalCredits: 0,
    totalEarned: 0,
    totalReferrals: 0,
    activeReferrals: 0,
    completedReferrals: 0
  };

  const paidStudentsCount = stats.completedReferrals;
  const registeredOnlyCount = stats.totalReferrals - stats.completedReferrals;
  const clientAdjustedRevenue = stats.totalCredits;

  const safeStats = {
    totalSellers: sellers.length,
    activeSellers: sellers.filter(s => s.is_active).length,
    totalStudents: stats.totalReferrals,
    totalRevenue: stats.totalCredits
  };

  // Top vendedores por performance
  const topSellers = displaySellers
    .sort((a, b) => {
      // Sort by revenue first, then by number of students
      const revenueA = a.total_revenue || 0;
      const revenueB = b.total_revenue || 0;

      if (revenueB !== revenueA) {
        return revenueB - revenueA;
      }
      return (b.students_count || 0) - (a.students_count || 0);
    })
    .slice(0, 5);

  // Cálculos de crescimento mensal
  const lastMonthData = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2] : null;
  const currentMonthData = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1] : null;

  const calculateSafeGrowth = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
  };

  const sellersGrowthPercentage = lastMonthData && currentMonthData ?
    calculateSafeGrowth(currentMonthData.active_sellers, lastMonthData.active_sellers) : 0;

  const revenueGrowthPercentage = lastMonthData && currentMonthData ?
    calculateSafeGrowth(Number(currentMonthData.total_revenue), Number(lastMonthData.total_revenue)) : 0;

  return (
    <div className="min-h-screen">
      {/* Header + Tabs Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="max-w-full mx-auto bg-slate-50">
            {/* Header: title + note + counter */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Analytics Dashboard
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  Comprehensive analytics and performance insights for your affiliate program.
                </p>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="border-t border-slate-200 bg-white">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Performance Analytics
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Real-time insights and performance metrics for data-driven decisions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Activation Rate</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {safeStats.totalSellers > 0
                      ? ((safeStats.activeSellers / safeStats.totalSellers) * 100).toFixed(1)
                      : 0
                    }%
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={`font-medium ${sellersGrowthPercentage > 0 ? 'text-green-600' :
                    sellersGrowthPercentage < 0 ? 'text-red-600' : 'text-slate-600'
                  }`}>
                  {sellersGrowthPercentage > 0 ? `+${sellersGrowthPercentage.toFixed(1)}%` :
                    sellersGrowthPercentage < 0 ? `${sellersGrowthPercentage.toFixed(1)}%` : '0%'}
                </span>
                <span className="text-slate-600 ml-1">vs previous month</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Conversion per Seller</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {safeStats.activeSellers > 0
                      ? (safeStats.totalStudents / safeStats.activeSellers).toFixed(1)
                      : 0
                    }
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={`font-medium ${revenueGrowthPercentage > 0 ? 'text-green-600' :
                    revenueGrowthPercentage < 0 ? 'text-red-600' : 'text-slate-600'
                  }`}>
                  {revenueGrowthPercentage > 0 ? `+${revenueGrowthPercentage.toFixed(1)}%` :
                    revenueGrowthPercentage < 0 ? `${revenueGrowthPercentage.toFixed(1)}%` : '0%'}
                </span>
                <span className="text-slate-600 ml-1">vs previous month</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Revenue per Student</p>
                  {loading ? (
                    <div className="h-9 bg-slate-200 rounded animate-pulse mt-1"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-blue-600 mt-1">
                        {paidStudentsCount > 0
                          ? formatCurrency(clientAdjustedRevenue / paidStudentsCount)
                          : '$0.00'
                        }
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Per paid student</p>
                    </>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {loading ? (
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-24"></div>
                ) : (
                  <>
                    <span className={`font-medium ${revenueGrowthPercentage > 0 ? 'text-green-600' :
                        revenueGrowthPercentage < 0 ? 'text-red-600' : 'text-slate-600'
                      }`}>
                      {revenueGrowthPercentage > 0 ? `+${revenueGrowthPercentage.toFixed(1)}%` :
                        revenueGrowthPercentage < 0 ? `${revenueGrowthPercentage.toFixed(1)}%` : '0%'}
                    </span>
                    <span className="text-slate-600 ml-1">vs previous month</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Monthly Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Monthly Performance</h3>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>

              <div className="space-y-4">
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Top Sellers</h3>
                <Award className="h-5 w-5 text-slate-400" />
              </div>

              <div className="space-y-4">
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
                        <div className="text-sm font-medium text-slate-900">{seller.students_count || 0} students</div>
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

          {/* Data Source Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-slate-600 text-sm">
              <Calendar className="h-4 w-4" />
              <span>Data last updated: {new Date().toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              All data is sourced from real-time database queries using optimized SQL functions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
