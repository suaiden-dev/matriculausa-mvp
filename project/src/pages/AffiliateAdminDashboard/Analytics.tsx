import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

const Analytics: React.FC<AnalyticsProps> = ({ stats, sellers = [], userId }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Valores padrão para stats
  const safeStats = {
    totalSellers: stats?.totalSellers || 0,
    activeSellers: stats?.activeSellers || 0,
    totalStudents: stats?.totalStudents || 0,
    totalRevenue: stats?.totalRevenue || 0
  };

  // Carregar dados de performance mensal
  const loadMonthlyPerformance = async () => {
    if (!userId) {
      console.warn('No user ID provided for analytics');
      return;
    }

    try {
      setLoadingMonthly(true);
      const { data, error } = await supabase
        .rpc('get_admin_monthly_performance_fixed', { 
          admin_user_id: userId,
          months_back: 12 
        });

      if (error) {
        console.error('Error loading monthly performance:', error);
        return;
      }

      setMonthlyData(data || []);
    } catch (error) {
      console.error('Error loading monthly performance:', error);
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Carregar dados mensais quando o componente montar ou userId mudar
  useEffect(() => {
    if (userId) {
      loadMonthlyPerformance();
    }
  }, [userId]);

  // Top vendedores por performance
  const topSellers = (sellers || [])
    .sort((a, b) => (b.students_count || 0) - (a.students_count || 0))
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
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <span className={`font-medium ${
              sellersGrowthPercentage > 0 ? 'text-green-600' : 
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
            <span className={`font-medium ${
              revenueGrowthPercentage > 0 ? 'text-green-600' : 
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
              <p className="text-3xl font-bold text-red-600 mt-1">
                {safeStats.totalStudents > 0 ? formatCurrency(safeStats.totalRevenue / safeStats.totalStudents) : '$0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className={`font-medium ${
              revenueGrowthPercentage > 0 ? 'text-green-600' : 
              revenueGrowthPercentage < 0 ? 'text-red-600' : 'text-slate-600'
            }`}>
              {revenueGrowthPercentage > 0 ? `+${revenueGrowthPercentage.toFixed(1)}%` : 
               revenueGrowthPercentage < 0 ? `${revenueGrowthPercentage.toFixed(1)}%` : '0%'}
            </span>
            <span className="text-slate-600 ml-1">vs mês anterior</span>
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
            {loadingMonthly ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-slate-500 text-sm">Loading monthly data...</p>
              </div>
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
            {topSellers.length > 0 ? (
              topSellers.map((seller, idx) => (
                <div key={seller.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-800' :
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
  );
};

export default Analytics;
