import React, { useState } from 'react';
import { 
  Award, 
  DollarSign, 
  Calendar, 
  Building, 
  Search, 
  Filter, 
  Eye, 
  Edit,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

interface ScholarshipManagementProps {
  scholarships: any[];
  stats: {
    total: number;
    active: number;
    totalFunding: number;
  };
}

const ScholarshipManagement: React.FC<ScholarshipManagementProps> = ({
  scholarships,
  stats
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  const filteredScholarships = scholarships.filter(scholarship => {
    const matchesSearch = scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scholarship.universities?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && scholarship.is_active) ||
      (statusFilter === 'inactive' && !scholarship.is_active);
    
    const matchesLevel = levelFilter === 'all' || scholarship.level === levelFilter;
    
    return matchesSearch && matchesStatus && matchesLevel;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineStatus = (deadline: string) => {
    const days = getDaysUntilDeadline(deadline);
    if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50' };
    if (days <= 7) return { status: 'urgent', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (days <= 30) return { status: 'soon', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Scholarships</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Scholarships</p>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Total Funding</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(stats.totalFunding)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search scholarships..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all duration-200"
            >
              <option value="all">All Levels</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="graduate">Graduate</option>
              <option value="doctorate">Doctorate</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center text-sm text-slate-600">
          <span className="font-medium">{filteredScholarships.length}</span>
          <span className="ml-1">
            scholarship{filteredScholarships.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Scholarships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredScholarships.map((scholarship) => {
          const deadlineInfo = getDeadlineStatus(scholarship.deadline);
          const daysLeft = getDaysUntilDeadline(scholarship.deadline);
          
          return (
            <div key={scholarship.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {scholarship.title}
                    </h3>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        scholarship.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {scholarship.is_active ? (
                          <>
                            <Zap className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                      
                      {scholarship.is_exclusive && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <Award className="h-3 w-3 mr-1" />
                          Exclusive
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Scholarship Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(Number(scholarship.amount))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-500 mb-1">Level</p>
                    <p className="text-sm font-bold text-slate-900 capitalize">
                      {scholarship.level}
                    </p>
                  </div>
                </div>

                {/* University */}
                <div className="flex items-center text-sm text-slate-600 mb-4">
                  <Building className="h-4 w-4 mr-2" />
                  {scholarship.universities?.name || 'Unknown University'}
                </div>

                {/* Deadline */}
                <div className={`p-3 rounded-xl border ${deadlineInfo.bg} border-slate-200`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Application Deadline</p>
                      <p className="font-bold text-slate-900">
                        {new Date(scholarship.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {daysLeft > 0 ? (
                        <>
                          <p className={`text-2xl font-bold ${deadlineInfo.color}`}>
                            {daysLeft}
                          </p>
                          <p className={`text-xs font-medium ${deadlineInfo.color}`}>
                            day{daysLeft !== 1 ? 's' : ''} left
                          </p>
                        </>
                      ) : (
                        <span className="text-sm font-bold text-red-600">Expired</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl text-center">
                    <Users className="h-5 w-5 mx-auto mb-2 text-slate-500" />
                    <p className="text-lg font-bold text-slate-900">0</p>
                    <p className="text-xs text-slate-500">Applicants</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl text-center">
                    <Eye className="h-5 w-5 mx-auto mb-2 text-slate-500" />
                    <p className="text-lg font-bold text-slate-900">0</p>
                    <p className="text-xs text-slate-500">Views</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6">
                <div className="flex space-x-2">
                  <button className="flex-1 bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm">
                    View Details
                  </button>
                  <button className="bg-purple-100 text-purple-700 py-2.5 px-4 rounded-xl hover:bg-purple-200 transition-colors">
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredScholarships.length === 0 && (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No scholarships found</h3>
          <p className="text-slate-500">
            {searchTerm ? `No scholarships match "${searchTerm}"` : 'No scholarships available yet'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ScholarshipManagement;