import React from 'react';
import { 
  Users, 
  UserPlus, 
  GraduationCap, 
  DollarSign, 
  TrendingUp, 
  Eye,
  ArrowUpRight,
  CheckCircle,
  Activity,
  Star,
  Crown
} from 'lucide-react';

interface OverviewProps {
  stats: {
    totalSellers?: number;
    activeSellers?: number;
    totalStudents?: number;
    totalRevenue?: number;
    monthlyGrowth?: number;
  };
  sellers?: any[];
  students?: any[];
  onRefresh: () => void;
}

const Overview: React.FC<OverviewProps> = ({ stats, sellers = [], students = [], onRefresh }) => {
  const recentSellers = (sellers || []).slice(0, 5);
  const recentStudents = (students || []).slice(0, 5);

  // Valores padrão para stats
  const safeStats = {
    totalSellers: stats?.totalSellers || 0,
    activeSellers: stats?.activeSellers || 0,
    totalStudents: stats?.totalStudents || 0,
    totalRevenue: stats?.totalRevenue || 0,
    monthlyGrowth: stats?.monthlyGrowth || 0
  };

  // Verificar se há dados
  const hasData = safeStats.totalStudents > 0 || safeStats.totalSellers > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const quickActions = [
    {
      title: 'Add Seller',
      description: 'Register new affiliate sellers',
      icon: UserPlus,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/affiliate-admin/dashboard/sellers',
      count: safeStats.totalSellers
    },
    {
      title: 'Manage Users',
      description: 'View and manage sellers',
      icon: Users,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      link: '/affiliate-admin/dashboard/sellers',
      count: safeStats.activeSellers
    },
    {
      title: 'View Reports',
      description: 'Track performance and metrics',
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-orange-500 to-orange-600',
      link: '/affiliate-admin/dashboard/analytics',
      count: safeStats.totalStudents
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="mt-2 text-slate-600">
            Monitor your affiliate program performance and key metrics
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Refresh Data
        </button>
      </div>

      {/* No Data State */}
      {!hasData && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <TrendingUp className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum dado disponível</h3>
          <p className="text-slate-600">
            Ainda não há dados para exibir. Os dados aparecerão aqui assim que houver estudantes referenciados ou vendedores cadastrados.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total de Vendedores</p>
                <p className="text-3xl font-bold text-slate-900">{safeStats.totalSellers}</p>
                <div className="flex items-center mt-2">
                  <Users className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm font-medium text-blue-600">{safeStats.activeSellers} ativos</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Active Sellers</p>
                <p className="text-3xl font-bold text-slate-900">{safeStats.activeSellers}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm font-medium text-green-600">
                    {safeStats.totalSellers > 0 
                      ? ((safeStats.activeSellers / safeStats.totalSellers) * 100).toFixed(1)
                      : 0
                    }% of total
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <UserPlus className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Referred Students</p>
                <p className="text-3xl font-bold text-slate-900">{safeStats.totalStudents}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-[#05294E] mr-1" />
                  <span className="text-sm font-medium text-[#05294E]">+{safeStats.monthlyGrowth}% this month</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-[#05294E] to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(safeStats.totalRevenue)}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                  <span className="text-sm font-medium text-emerald-600">
                    {safeStats.monthlyGrowth > 0 ? `+${safeStats.monthlyGrowth}%` : `${safeStats.monthlyGrowth}%`} vs last month
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            return (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-slate-900 mr-2">{action.count}</span>
                    <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{action.title}</h3>
                <p className="text-slate-600 text-sm">{action.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Data */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Sellers */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Recent Sellers</h3>
                    <p className="text-slate-500 text-sm">
                      {recentSellers.length} seller{recentSellers.length !== 1 ? 's' : ''} registered
                    </p>
                  </div>
                  <div className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center cursor-pointer">
                    View All
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {recentSellers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Users className="h-10 w-10 text-[#05294E]" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">No sellers yet!</h3>
                    <p className="text-slate-500">Register your first seller to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentSellers.map((seller) => (
                      <div key={seller.id} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200 hover:shadow-lg transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-sm font-bold text-white">
                                {seller.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{seller.name}</p>
                              <p className="text-xs text-slate-500">{seller.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">
                              {seller.students_count || 0} students
                            </p>
                            <p className="text-xs text-slate-500">{formatDate(seller.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - System Status & Tools */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                System Status
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Database</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-600 font-medium">Operational</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">API Services</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-600 font-medium">Operational</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Email Service</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-600 font-medium">Operational</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-500" />
                Recent Activity
              </h3>
              
              <div className="space-y-4">
                {recentStudents.slice(0, 4).map((student, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        New student referred
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {student.full_name} by {student.seller_name} • {formatDate(student.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {recentStudents.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">No recent activity</p>
                )}
              </div>
            </div>

            {/* Affiliate Tools */}
            <div className="bg-gradient-to-br from-[#05294E] to-blue-700 rounded-2xl shadow-lg text-white p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <Crown className="h-5 w-5 mr-2" />
                Affiliate Tools
              </h3>
              <div className="space-y-3">
                <button
                  onClick={onRefresh}
                  className="block w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white py-2 px-4 rounded-xl hover:bg-white/30 transition-all duration-300 font-medium text-sm text-center"
                >
                  Refresh Data
                </button>
                <div className="block w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white py-2 px-4 rounded-xl hover:bg-white/30 transition-all duration-300 font-medium text-sm text-center cursor-pointer">
                  View Analytics
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
