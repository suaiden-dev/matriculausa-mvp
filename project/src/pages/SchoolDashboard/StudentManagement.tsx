import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Clock, CheckCircle, FileText, Globe, Phone } from 'lucide-react';
import type { Scholarship } from '../../types';
import { useUniversity } from '../../context/UniversityContext';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';

const StudentManagement: React.FC = () => {
  const { applications, university } = useUniversity();
  
  // States para filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScholarship, setSelectedScholarship] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'selection-process'>('all');

  // Extrai bolsas únicas das aplicações
  const scholarships: Scholarship[] = Array.from(
    applications
      .map(app => app.scholarships)
      .filter((s): s is Scholarship => !!s)
      .reduce((map, scholarship) => {
        if (!map.has(scholarship.id)) map.set(scholarship.id, scholarship);
        return map;
      }, new Map<string, Scholarship>()).values()
  );

  // Extrai países únicos
  const countries = useMemo(() => {
    const countrySet = new Set<string>();
    applications.forEach(app => {
      const country = (app as any).user_profiles?.country;
      if (country) countrySet.add(country);
    });
    return Array.from(countrySet).sort();
  }, [applications]);

  // Filtra aplicações
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    // Filtro por aba
    if (activeTab === 'selection-process') {
      filtered = filtered.filter(app => (app as any).user_profiles?.documents_status === 'under_review');
    }

    // Filtro por bolsa
    if (selectedScholarship) {
      filtered = filtered.filter(app => app.scholarship_id === selectedScholarship);
    }

    // Filtro por status
    if (selectedStatus) {
      filtered = filtered.filter(app => {
        const docsStatus = (app as any).user_profiles?.documents_status;
        if (selectedStatus === 'enrolled') return app.status === 'enrolled';
        if (selectedStatus === 'under_review') return docsStatus === 'under_review';
        if (selectedStatus === 'pending') return app.status !== 'enrolled' && docsStatus !== 'under_review';
        return true;
      });
    }

    // Filtro por país
    if (selectedCountry) {
      filtered = filtered.filter(app => (app as any).user_profiles?.country === selectedCountry);
    }

    // Filtro por termo de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app => {
        const student = (app as any).user_profiles;
        return (
          student?.full_name?.toLowerCase().includes(term) ||
          student?.name?.toLowerCase().includes(term) ||
          student?.phone?.includes(term) ||
          student?.country?.toLowerCase().includes(term)
        );
      });
    }

    return filtered;
  }, [applications, activeTab, selectedScholarship, selectedStatus, selectedCountry, searchTerm]);

  // Função para obter status e badge
  const getStudentStatus = (app: any) => {
    const docsStatus = app.user_profiles?.documents_status;
    if (docsStatus === 'under_review') {
      return { text: 'Selection Process', class: 'bg-blue-50 text-blue-700 border border-blue-200', icon: Clock };
    } else if (app.status === 'enrolled') {
      return { text: 'Enrolled', class: 'bg-green-50 text-green-700 border border-green-200', icon: CheckCircle };
    } else {
      return { text: 'Pending', class: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: FileText };
    }
  };

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to manage students"
      description="Finish setting up your university profile to view and manage student applications"
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
        {/* Header Section */}
        <div className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Student Management
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Manage and review student applications
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300">
                  <Users className="w-4 h-4 mr-1.5" />
                  {filteredApplications.length} Students
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            {/* Navigation Tabs */}
            <div className="bg-slate-50 border-b border-slate-200">
              <div className="px-6 py-4">
                <nav className="flex space-x-8" role="tablist">
                  <button
                    className={`group flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                      activeTab === 'all' 
                        ? 'border-[#05294E] text-[#05294E]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveTab('all')}
                    type="button"
                    role="tab"
                  >
                    <Users className={`w-5 h-5 mr-2 transition-colors ${
                      activeTab === 'all' ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    All Students
                  </button>
                  <button
                    className={`group flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                      activeTab === 'selection-process' 
                        ? 'border-[#05294E] text-[#05294E]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveTab('selection-process')}
                    type="button"
                    role="tab"
                  >
                    <Clock className={`w-5 h-5 mr-2 transition-colors ${
                      activeTab === 'selection-process' ? 'text-[#05294E]' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    Selection Process
                  </button>
                </nav>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search Bar */}
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Scholarship Filter */}
                <div>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    value={selectedScholarship}
                    onChange={(e) => setSelectedScholarship(e.target.value)}
                  >
                    <option value="">All Scholarships</option>
                    {scholarships.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="enrolled">Enrolled</option>
                    <option value="under_review">Selection Process</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {/* Country Filter */}
                <div>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                  >
                    <option value="">All Countries</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Students Grid */}
          <div className="space-y-4">
            {filteredApplications.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No students found</h3>
                <p className="text-slate-600">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              filteredApplications.map((app) => {
                const student = (app as any).user_profiles;
                const status = getStudentStatus(app);
                const StatusIcon = status.icon;

                  return (
                    <Link 
                      to={`/school/dashboard/student/${app.id}`} 
                      key={app.id} 
                      className="block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200"
                    >
                      <div className="p-6">
                        <div className="flex sm:flex-row items-start sm:items-center justify-between">
                          <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-0">
                            {student?.avatar_url ? (
                              <img
                                src={student.avatar_url}
                                alt={student?.full_name || student?.name || 'Student Avatar'}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-slate-200 bg-slate-100"
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#05294E] to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm sm:text-lg">
                                  {(student?.full_name || student?.name || 'U')[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <h3 className="text-sm text-wrap sm:text-lg font-semibold text-slate-900">
                                {student?.full_name || student?.name || 'Unknown Student'}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                                {student?.country && (
                                  <div className="flex items-center">
                                    <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    {student.country}
                                  </div>
                                )}
                                {student?.phone && (
                                  <div className="flex items-center">
                                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    {student.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        
                          <div className="flex flex-col items-end space-y-2 sm:space-y-3">
                            <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${status.class}`}>
                              <StatusIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                              {status.text}
                            </span>
                            <div className="text-xs sm:text-sm text-slate-500 text-right">
                              Applied: {new Date((app as any).created_at || Date.now()).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
              })
            )}
          </div>
        </div>
      </div>
    </ProfileCompletionGuard>
  );
};

export default StudentManagement;