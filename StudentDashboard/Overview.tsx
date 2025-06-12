import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  FileText, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Search, 
  Target, 
  BookOpen,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Building,
  Star,
  Eye,
  Plus
} from 'lucide-react';

interface OverviewProps {
  profile: any;
  scholarships: any[];
  applications: any[];
  stats: {
    totalApplications: number;
    approvedApplications: number;
    pendingApplications: number;
    availableScholarships: number;
  };
  onApplyScholarship: (scholarshipId: string) => void;
}

const Overview: React.FC<OverviewProps> = ({ 
  profile, 
  scholarships, 
  applications, 
  stats, 
  onApplyScholarship 
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return Clock;
      case 'under_review': return Clock;
      default: return Clock;
    }
  };

  const quickActions = [
    {
      title: 'Find Scholarships',
      description: 'Discover new scholarship opportunities',
      icon: Search,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      link: '/student/dashboard/scholarships',
      count: stats.availableScholarships
    },
    {
      title: 'My Applications',
      description: 'Track your application status',
      icon: FileText,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      link: '/student/dashboard/applications',
      count: stats.totalApplications
    },
    {
      title: 'Update Profile',
      description: 'Keep your profile current',
      icon: Target,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      link: '/student/dashboard/profile',
      count: null
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Award className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Welcome back, {profile?.name || 'Student'}!
              </h2>
              <p className="text-blue-100 text-lg">
                Continue your journey to academic excellence
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
              <Award className="h-8 w-8 text-white mb-4" />
              <h3 className="font-bold text-white mb-2">Discover Scholarships</h3>
              <p className="text-blue-100 text-sm">Find opportunities that match your profile</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
              <FileText className="h-8 w-8 text-yellow-400 mb-4" />
              <h3 className="font-bold text-white mb-2">Apply with Confidence</h3>
              <p className="text-blue-100 text-sm">Get guidance throughout the process</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
              <CheckCircle className="h-8 w-8 text-green-400 mb-4" />
              <h3 className="font-bold text-white mb-2">Track Your Progress</h3>
              <p className="text-blue-100 text-sm">Monitor applications in real-time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Available Scholarships</p>
              <p className="text-3xl font-bold text-slate-900">{stats.availableScholarships}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">New opportunities</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Award className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">My Applications</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalApplications}</p>
              <div className="flex items-center mt-2">
                <FileText className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">Total submitted</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Approved</p>
              <p className="text-3xl font-bold text-slate-900">{stats.approvedApplications}</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">Successful</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
              <p className="text-3xl font-bold text-slate-900">{stats.pendingApplications}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm font-medium text-yellow-600">Under review</span>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-7 w-7 text-white" />
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
                  {action.count !== null && (
                    <span className="text-2xl font-bold text-slate-900 mr-2">{action.count}</span>
                  )}
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
        {/* Recent Applications */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Recent Applications</h3>
                  <p className="text-slate-500 text-sm">Track your scholarship applications</p>
                </div>
                <Link
                  to="/student/dashboard/applications"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
                >
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
            
            <div className="p-6">
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">No applications yet</h3>
                  <p className="text-slate-500 mb-6">Start applying for scholarships to see your progress here</p>
                  <Link
                    to="/student/dashboard/scholarships"
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Find Scholarships
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.slice(0, 5).map((application) => {
                    const StatusIcon = getStatusIcon(application.status);
                    return (
                      <div key={application.id} className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Award className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                              {application.scholarship?.title}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm text-slate-500">
                              <div className="flex items-center">
                                <Building className="h-4 w-4 mr-1" />
                                {application.scholarship?.schoolName}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(application.applied_at).toLocaleDateString()}
                              </div>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {application.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommended Scholarships & Profile Status */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-500" />
              Profile Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Basic information</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Academic details</span>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Documents uploaded</span>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Complete your profile to unlock more opportunities
              </p>
              <Link
                to="/student/dashboard/profile"
                className="text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors"
              >
                Complete now →
              </Link>
            </div>
          </div>

          {/* Recommended Scholarships */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-500" />
              Recommended for You
            </h3>
            
            <div className="space-y-4">
              {scholarships.slice(0, 3).map((scholarship) => (
                <div key={scholarship.id} className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group">
                  <h4 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {scholarship.title}
                  </h4>
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
                    <span className="font-semibold text-green-600">
                      {formatAmount(scholarship.amount)}
                    </span>
                    <span>{scholarship.schoolName}</span>
                  </div>
                  <button
                    onClick={() => onApplyScholarship(scholarship.id)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Apply Now
                  </button>
                </div>
              ))}
              
              {scholarships.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No recommendations yet</p>
              )}
            </div>
          </div>

          {/* Study Tips */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg text-white p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              💡 Success Tips
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-blue-100">
                  Apply early to increase your chances of success
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-blue-100">
                  Tailor your applications to each scholarship
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-white rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-blue-100">
                  Keep your profile updated with latest achievements
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;