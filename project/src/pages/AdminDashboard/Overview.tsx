import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  Users, 
  Award, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Activity,
  Crown,
  Shield,
  Eye,
  ArrowUpRight,
  Calendar,
  Target
} from 'lucide-react';

interface OverviewProps {
  stats: {
    totalUniversities: number;
    pendingUniversities: number;
    approvedUniversities: number;
    totalStudents: number;
    totalScholarships: number;
    totalApplications: number;
    totalFunding: number;
    monthlyGrowth: number;
  };
  universities: any[];
  users: any[];
  applications: any[];
  error: string | null;
}

const Overview: React.FC<OverviewProps> = ({ stats, universities, users, applications, error }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const quickActions = [
    {
      title: 'Approve Universities',
      description: 'Review pending university applications',
      icon: Building,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/admin/dashboard/universities',
      count: stats.pendingUniversities
    },
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: Users,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      link: '/admin/dashboard/users',
      count: users.length
    },
    {
      title: 'Monitor Scholarships',
      description: 'Track scholarship programs',
      icon: Award,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      link: '/admin/dashboard/scholarships',
      count: stats.totalScholarships
    }
  ];

  return (
    <div className="space-y-8">
      {/* Error Alert */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h3 className="font-medium text-yellow-800">System Notice</h3>
              <p className="text-sm text-yellow-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Universities</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalUniversities}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+{stats.monthlyGrowth}% this month</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Building className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-slate-900">{users.length}</p>
              <div className="flex items-center mt-2">
                <Users className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">{stats.totalStudents} students</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Scholarships</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalScholarships}</p>
              <div className="flex items-center mt-2">
                <DollarSign className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-sm font-medium text-purple-600">{formatCurrency(stats.totalFunding)}</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Award className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Applications</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalApplications}</p>
              <div className="flex items-center mt-2">
                <FileText className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">Active submissions</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={index}
              to={action.link}
              className="group block p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-slate-900 mr-2">{action.count}</span>
                  <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{action.title}</h3>
              <p className="text-slate-600 text-sm">{action.description}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Approvals */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Pending University Approvals</h3>
                  <p className="text-slate-500 text-sm">Universities awaiting admin review</p>
                </div>
                <Link
                  to="/admin/dashboard/universities"
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center"
                >
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
            
            <div className="p-6">
              {universities.filter(u => !u.is_approved).length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">All caught up!</h3>
                  <p className="text-slate-500">No universities pending approval</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {universities.filter(u => !u.is_approved).slice(0, 5).map((university) => (
                    <div key={university.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors group">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Building className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 mb-1 truncate group-hover:text-purple-600 transition-colors">
                            {university.name}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            <div className="flex items-center">
                              <Target className="h-4 w-4 mr-1" />
                              {university.location}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(university.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Status & Recent Activity */}
        <div className="space-y-6">
          {/* System Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-500" />
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
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">File Storage</span>
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
              {applications.slice(0, 4).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      New scholarship application
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {activity.scholarship_title} • {new Date(activity.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {applications.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          {/* Admin Tools */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg text-white p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Crown className="h-5 w-5 mr-2" />
              Admin Tools
            </h3>
            <div className="space-y-3">
              <Link
                to="/admin/dashboard/settings"
                className="block w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white py-2 px-4 rounded-xl hover:bg-white/30 transition-all duration-300 font-medium text-sm text-center"
              >
                System Settings
              </Link>
              <Link
                to="/admin/logs"
                className="block w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white py-2 px-4 rounded-xl hover:bg-white/30 transition-all duration-300 font-medium text-sm text-center"
              >
                Activity Logs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;