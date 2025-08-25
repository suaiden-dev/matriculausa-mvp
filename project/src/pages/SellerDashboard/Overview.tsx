import React from 'react';
import {
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  Eye,
  ArrowUpRight,
  CheckCircle,
  Activity,
  Star,
  Crown,
  Target
} from 'lucide-react';

interface OverviewProps {
  stats: {
    totalStudents: number;
    totalRevenue: number;
    monthlyStudents: number;
    conversionRate: number;
  };
  sellerProfile: any;
  students: any[];
  onRefresh: () => void;
  onNavigate?: (view: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ stats, sellerProfile, students = [], onRefresh, onNavigate }) => {
  const recentStudents = students.slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const quickActions = [
    {
      title: 'View Students',
      description: 'View all referenced students',
      icon: GraduationCap,
      color: 'bg-gradient-to-r from-red-500 to-red-600',
      count: stats.totalStudents,
      view: 'students'
    },
    {
      title: 'Referral Tools',
      description: 'Access tools to increase sales',
      icon: Target,
      color: 'bg-gradient-to-r from-orange-500 to-orange-600',
      count: `${stats.conversionRate}%`,
      view: 'referral-tools'
    },
    {
      title: 'Performance',
      description: 'Analyze metrics and performance',
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      count: formatCurrency(stats.totalRevenue),
      view: 'performance'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mt-2 text-slate-600">
            Monitor your sales performance and key metrics
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Refresh Data
        </button>
      </div>



      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Students</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalStudents}</p>
              <div className="flex items-center mt-2">
                <GraduationCap className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-600">{stats.monthlyStudents} this month</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                <span className="text-sm font-medium text-emerald-600">
                  {stats.totalStudents > 0 ? (stats.totalRevenue / stats.totalStudents).toFixed(2) : 0} per student
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Monthly Students</p>
              <p className="text-3xl font-bold text-slate-900">{stats.monthlyStudents}</p>
              <div className="flex items-center mt-2">
                <Activity className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">
                  {stats.totalStudents > 0 ? ((stats.monthlyStudents / stats.totalStudents) * 100).toFixed(1) : 0}% of total
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Activity className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-slate-900">{stats.conversionRate}%</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">
                  Goal: 90%
                </span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Target className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action, index) => {
          return (
            <div 
              key={index} 
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
              onClick={() => onNavigate && onNavigate(action.view)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${action.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-slate-900">{action.count}</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{action.title}</h3>
              <p className="text-slate-600 text-sm mb-4">{action.description}</p>
              <div className="flex items-center text-red-600 font-medium text-sm group-hover:text-red-700 transition-colors">
                Access
                <ArrowUpRight className="h-4 w-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Students */}
      {recentStudents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Recent Students</h2>
              <button className="text-red-600 hover:text-red-700 font-medium text-sm hover:bg-red-50 px-3 py-1 rounded-lg transition-colors">
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentStudents.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-red-50 rounded-xl hover:from-red-50 hover:to-orange-50 transition-all duration-300 border border-slate-100 hover:border-red-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-sm">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{student.full_name}</h3>
                      <p className="text-sm text-slate-500">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(student.total_paid || 0)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(student.created_at)}
                      </p>
                    </div>
                    <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-sm"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {recentStudents.length === 0 && (
        <div className="text-center py-16 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100">
          <div className="text-slate-400 mb-4">
            <GraduationCap className="h-16 w-16 mx-auto text-red-300" />
          </div>
          <h3 className="text-xl font-medium text-slate-900 mb-3">No referenced students yet</h3>
          <p className="text-slate-600 max-w-md mx-auto">
            Start using your referral code to reference students and see your metrics here.
          </p>
          <div className="mt-6">
            <div className="inline-flex items-center px-4 py-2 bg-white border-2 border-red-200 rounded-lg">
              <span className="text-sm text-slate-600 mr-2">Your code:</span>
              <code className="text-red-700 font-mono font-bold">{sellerProfile?.referral_code}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
