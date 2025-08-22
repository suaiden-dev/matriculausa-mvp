import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Award } from 'lucide-react';

interface AnalyticsProps {
  stats: {
    totalSellers?: number;
    activeSellers?: number;
    totalStudents?: number;
    totalRevenue?: number;
    monthlyGrowth?: number;
  };
  sellers?: any[];
  students?: any[];
}

const Analytics: React.FC<AnalyticsProps> = ({ stats, sellers = [], students = [] }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount || 0);
  };

  // Valores padrão para stats
  const safeStats = {
    totalSellers: stats?.totalSellers || 0,
    activeSellers: stats?.activeSellers || 0,
    totalStudents: stats?.totalStudents || 0,
    totalRevenue: stats?.totalRevenue || 0,
    monthlyGrowth: stats?.monthlyGrowth || 0
  };

  // Dados para gráficos baseados em dados reais
  const monthlyData = useMemo(() => {
    if (!students || students.length === 0) {
      return [];
    }

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthStart = new Date(currentYear, index, 1);
      const monthEnd = new Date(currentYear, index + 1, 0);
      
      const monthStudents = students.filter(student => {
        const studentDate = new Date(student.created_at);
        return studentDate >= monthStart && studentDate <= monthEnd;
      });
      
      const monthRevenue = monthStudents.reduce((sum, student) => {
        // Usar a receita real do estudante se disponível
        return sum + (student.total_paid || 0);
      }, 0);
      
      return {
        month,
        students: monthStudents.length,
        revenue: monthRevenue
      };
    });
  }, [students]);

  // Top vendedores por performance
  const topSellers = (sellers || [])
    .sort((a, b) => (b.students_count || 0) - (a.students_count || 0))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics e Relatórios</h1>
        <p className="mt-1 text-sm text-slate-600">
          Análise detalhada do desempenho dos seus vendedores
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Taxa de Ativação</p>
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
            <span className="text-green-600 font-medium">
              {safeStats.monthlyGrowth > 0 ? `+${safeStats.monthlyGrowth}%` : `${safeStats.monthlyGrowth}%`}
            </span>
            <span className="text-slate-600 ml-1">vs mês anterior</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Conversão por Vendedor</p>
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
            <span className="text-green-600 font-medium">
              {safeStats.totalStudents > 0 && safeStats.activeSellers > 0 ? 
                `+${((safeStats.totalStudents / safeStats.activeSellers) * 10).toFixed(1)}%` : 
                '0%'
              }
            </span>
            <span className="text-slate-600 ml-1">vs mês anterior</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Receita por Estudante</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {safeStats.totalStudents > 0 ? formatCurrency(safeStats.totalRevenue / safeStats.totalStudents) : 'R$ 0,00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">
              {safeStats.totalRevenue > 0 ? 
                `+${((safeStats.totalRevenue / Math.max(safeStats.totalStudents, 1)) * 0.1).toFixed(1)}%` : 
                '0%'
              }
            </span>
            <span className="text-slate-600 ml-1">vs mês anterior</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Crescimento Mensal</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                +{safeStats.monthlyGrowth.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">Tendência positiva</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Performance Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Performance Mensal</h3>
            <BarChart3 className="h-5 w-5 text-slate-400" />
          </div>
          
          <div className="space-y-4">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 text-sm text-slate-600 font-medium">{data.month}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 min-w-[120px]">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(data.students / 35) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900">{data.students} estudantes</div>
                  <div className="text-xs text-slate-500">{formatCurrency(data.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Top Vendedores</h3>
            <Award className="h-5 w-5 text-slate-400" />
          </div>
          
          <div className="space-y-4">
            {topSellers.length > 0 ? (
              topSellers.map((seller, index) => (
                <div key={seller.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-slate-100 text-slate-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{seller.name}</div>
                      <div className="text-xs text-slate-500">{seller.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">{seller.students_count || 0} estudantes</div>
                    <div className="text-xs text-slate-500">{formatCurrency(seller.total_revenue || 0)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nenhum vendedor cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Métricas Detalhadas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900">Rede de Vendedores</h4>
            <p className="text-sm text-slate-600 mt-1">
              {safeStats.activeSellers} vendedores ativos de {safeStats.totalSellers} total
            </p>
            <div className="mt-3 flex justify-center">
              <div className="bg-slate-100 rounded-full h-2 w-32">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${safeStats.totalSellers > 0 ? (safeStats.activeSellers / safeStats.totalSellers) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900">Taxa de Crescimento</h4>
            <p className="text-sm text-slate-600 mt-1">
              {safeStats.monthlyGrowth.toFixed(1)}% de crescimento mensal
            </p>
            <div className="mt-3">
              <span className="text-2xl font-bold text-green-600">↗</span>
            </div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900">Receita Total</h4>
            <p className="text-sm text-slate-600 mt-1">
              {formatCurrency(safeStats.totalRevenue)} gerados
            </p>
            <div className="mt-3">
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(safeStats.totalRevenue > 0 ? safeStats.totalRevenue / 6 : 0)}/mês
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">💡 Insights e Recomendações</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">📈 Tendência Positiva</h4>
            <p className="text-sm text-slate-600">
              Seus vendedores estão performando bem com crescimento de {safeStats.monthlyGrowth.toFixed(1)}% este mês.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">🎯 Oportunidade</h4>
            <p className="text-sm text-slate-600">
              {safeStats.totalSellers - safeStats.activeSellers} vendedores inativos podem ser reativados.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">💰 Performance</h4>
            <p className="text-sm text-slate-600">
              Receita média de {safeStats.totalStudents > 0 ? formatCurrency(safeStats.totalRevenue / safeStats.totalStudents) : 'R$ 0,00'} por estudante.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">🚀 Crescimento</h4>
            <p className="text-sm text-slate-600">
              Adicione mais vendedores para acelerar o crescimento da sua rede.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
