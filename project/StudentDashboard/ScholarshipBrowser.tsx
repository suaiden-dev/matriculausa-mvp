import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Award, 
  Building, 
  Calendar, 
  DollarSign, 
  Clock, 
  Target, 
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Eye,
  Heart
} from 'lucide-react';

interface ScholarshipBrowserProps {
  scholarships: any[];
  applications: any[];
  onApplyScholarship: (scholarshipId: string) => void;
}

const ScholarshipBrowser: React.FC<ScholarshipBrowserProps> = ({
  scholarships,
  applications,
  onApplyScholarship
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedField, setSelectedField] = useState('all');
  const [sortBy, setSortBy] = useState('deadline');

  const filteredScholarships = scholarships.filter(scholarship => {
    const matchesSearch = scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scholarship.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scholarship.schoolName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = selectedLevel === 'all' || scholarship.level === selectedLevel;
    const matchesField = selectedField === 'all' || scholarship.fieldOfStudy.toLowerCase().includes(selectedField.toLowerCase());

    return matchesSearch && matchesLevel && matchesField;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return b.amount - a.amount;
      case 'deadline':
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case 'name':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
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
    if (days < 0) return { status: 'expired', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (days <= 7) return { status: 'urgent', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (days <= 30) return { status: 'soon', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  };

  const hasApplied = (scholarshipId: string) => {
    return applications.some(app => app.scholarship_id === scholarshipId);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Find Scholarships</h2>
          <p className="text-slate-600">Discover opportunities tailored to your academic profile</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search scholarships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            />
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
          >
            <option value="all">All Levels</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="graduate">Graduate</option>
            <option value="doctorate">Doctorate</option>
          </select>

          {/* Field Filter */}
          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
          >
            <option value="all">All Fields</option>
            <option value="stem">STEM</option>
            <option value="business">Business</option>
            <option value="engineering">Engineering</option>
            <option value="any">Any Field</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
          >
            <option value="deadline">Sort by Deadline</option>
            <option value="amount">Sort by Amount</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            <span className="font-medium text-blue-600">{filteredScholarships.length}</span> scholarships found
          </span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-xs">Urgent</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-xs">Soon</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-xs">Normal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scholarships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredScholarships.map((scholarship) => {
          const deadlineInfo = getDeadlineStatus(scholarship.deadline);
          const daysLeft = getDaysUntilDeadline(scholarship.deadline);
          const alreadyApplied = hasApplied(scholarship.id);
          
          return (
            <div key={scholarship.id} className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      {scholarship.isExclusive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                          <Zap className="h-3 w-3 mr-1" />
                          Exclusive
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {scholarship.fieldOfStudy}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {scholarship.title}
                    </h3>
                    
                    <div className="flex items-center text-sm text-slate-600 mb-3">
                      <Building className="h-4 w-4 mr-2" />
                      {scholarship.schoolName}
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Scholarship Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatAmount(scholarship.amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-500 mb-1">Level</p>
                    <p className="text-sm font-bold text-slate-900 capitalize">
                      {scholarship.level}
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                <div className={`p-3 rounded-xl border ${deadlineInfo.bg} ${deadlineInfo.border}`}>
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

              {/* Requirements Preview */}
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">Requirements</span>
                  <span className="text-xs text-slate-500">{scholarship.requirements.length} criteria</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {scholarship.requirements.slice(0, 2).map((req: string, index: number) => (
                    <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs font-medium">
                      {req}
                    </span>
                  ))}
                  {scholarship.requirements.length > 2 && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-medium">
                      +{scholarship.requirements.length - 2} more
                    </span>
                  )}
                </div>
              </div>

              {/* Benefits Preview */}
              <div className="px-6 pb-6">
                <div className="flex items-center mb-3">
                  <Heart className="h-4 w-4 mr-2 text-red-500" />
                  <span className="text-sm font-medium text-slate-700">Benefits</span>
                </div>
                <div className="space-y-2">
                  {scholarship.benefits.slice(0, 2).map((benefit: string, index: number) => (
                    <div key={index} className="flex items-center text-xs text-slate-600">
                      <CheckCircle className="h-3 w-3 mr-2 text-green-500 flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6">
                <div className="flex space-x-2">
                  <button className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm flex items-center justify-center">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </button>
                  
                  <button
                    onClick={() => onApplyScholarship(scholarship.id)}
                    disabled={alreadyApplied || daysLeft <= 0}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center ${
                      alreadyApplied
                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                        : daysLeft <= 0
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    {alreadyApplied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Applied
                      </>
                    ) : daysLeft <= 0 ? (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Expired
                      </>
                    ) : (
                      <>
                        <Award className="h-4 w-4 mr-2" />
                        Apply Now
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredScholarships.length === 0 && (
        <div className="text-center py-20">
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Award className="h-16 w-16 text-slate-400" />
          </div>
          <h3 className="text-3xl font-bold text-slate-600 mb-4">No scholarships found</h3>
          <p className="text-slate-500 text-lg mb-8">Try adjusting your search criteria to discover more opportunities</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedLevel('all');
              setSelectedField('all');
            }}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 transition-all duration-300 font-bold"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ScholarshipBrowser;