import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Clock, CheckCircle, FileText, Globe, MessageCircle } from 'lucide-react';
import type { Scholarship } from '../../types';
import { useUniversity } from '../../context/UniversityContext';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';
import MessagesDashboard from '../../components/MessagesDashboard';
import { useUniversityMessages } from '../../hooks/useUniversityMessages';

const StudentManagement: React.FC = () => {
  const { applications, university } = useUniversity();
  const { conversations, loading: messagesLoading, isUpdating: messagesUpdating, markAsRead, sendQuickReply } = useUniversityMessages();
  
  // States para filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScholarship, setSelectedScholarship] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  // Toggle e estados de filtros avançados
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [advancedAcademicLevel, setAdvancedAcademicLevel] = useState<string>('');
  const [advancedFieldOfInterest, setAdvancedFieldOfInterest] = useState<string>('');
  const [advancedEnglishProficiency, setAdvancedEnglishProficiency] = useState<string>('');
  // Document Requests
  const [docRequestTitle, setDocRequestTitle] = useState<string>('');
  const [docRequestState, setDocRequestState] = useState<string>(''); // any | has_requests | has_uploads | missing_uploads
  const [advancedDateFrom, setAdvancedDateFrom] = useState<string>('');
  const [advancedDateTo, setAdvancedDateTo] = useState<string>('');

  // Contador de filtros avançados ativos
  const advancedActiveCount = useMemo(() => {
    let count = 0;
    if (advancedAcademicLevel) count++;
    if (advancedFieldOfInterest) count++;
    if (advancedEnglishProficiency) count++;
    if (docRequestTitle) count++;
    if (docRequestState) count++;
    if (advancedDateFrom || advancedDateTo) count++;
    return count;
  }, [
    advancedAcademicLevel,
    advancedFieldOfInterest,
    advancedEnglishProficiency,
    docRequestTitle,
    docRequestState,
    advancedDateFrom,
    advancedDateTo,
  ]);

  const clearAdvancedFilters = () => {
    setAdvancedAcademicLevel('');
    setAdvancedFieldOfInterest('');
    setAdvancedEnglishProficiency('');
    setDocRequestTitle('');
    setDocRequestState('');
    setAdvancedDateFrom('');
    setAdvancedDateTo('');
  };
  const [activeTab, setActiveTab] = useState<'students' | 'messages'>('students');

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

  // Opções únicas para filtros avançados
  const {
    academicLevels,
    fieldsOfInterest,
    englishProficiencies,
  } = useMemo(() => {
    const academic = new Set<string>();
    const fields = new Set<string>();
    const english = new Set<string>();
    // outros filtros removidos por solicitação

    applications.forEach(app => {
      const student = (app as any).user_profiles;
      if (!student) return;
      if (student.academic_level) academic.add(student.academic_level);
      if (student.field_of_interest) fields.add(student.field_of_interest);
      if (student.english_proficiency) english.add(student.english_proficiency);
    });

    return {
      academicLevels: Array.from(academic).sort(),
      fieldsOfInterest: Array.from(fields).sort(),
      englishProficiencies: Array.from(english).sort(),
    };
  }, [applications]);

  // Filtra aplicações baseado no status de pagamento das taxas
  const filteredApplications = useMemo(() => {
    // Debug: log de todas as aplicações
    console.log('=== DEBUG: Todas as aplicações ===');
    applications.forEach(app => {
      const student = (app as any).user_profiles;
      if (student?.full_name) {
        console.log(`Student: ${student.full_name}`);
        console.log(`  - Application Status: ${app.status}`);
        console.log(`  - Documents Status: ${student.documents_status}`);
        console.log(`  - Application Fee: ${(app as any).is_application_fee_paid}`);
        console.log(`  - Scholarship Fee: ${(app as any).is_scholarship_fee_paid}`);
        console.log(`  - Both Fees Paid: ${(app as any).is_application_fee_paid && (app as any).is_scholarship_fee_paid}`);
      }
    });
    
    // MOSTRAR APENAS ESTUDANTES QUE PAGARAM AMBAS AS TAXAS
    let filtered = applications.filter(app => {
      const hasPaidApplicationFee = (app as any).is_application_fee_paid;
      const hasPaidScholarshipFee = (app as any).is_scholarship_fee_paid;
      const bothFeesPaid = hasPaidApplicationFee && hasPaidScholarshipFee;
      
      // Debug: log do filtro
      const student = (app as any).user_profiles;
      if (student?.full_name) {
        console.log(`Filtering ${student.full_name}: ${bothFeesPaid ? 'INCLUDED (both fees paid)' : 'EXCLUDED (fees pending)'}`);
      }
      
      return bothFeesPaid;
    });
    
    console.log(`Total applications: ${applications.length}`);
    console.log(`Filtered applications (both fees paid): ${filtered.length}`);
    
    // Filtro por bolsa
    if (selectedScholarship) {
      filtered = filtered.filter(app => app.scholarship_id === selectedScholarship);
    }

    // Filtro por status de taxas
    if (selectedStatus) {
      filtered = filtered.filter(app => {
        const hasPaidApplicationFee = (app as any).is_application_fee_paid;
        const hasPaidScholarshipFee = (app as any).is_scholarship_fee_paid;
        
        if (selectedStatus === 'both_paid') return hasPaidApplicationFee && hasPaidScholarshipFee;
        if (selectedStatus === 'application_paid') return hasPaidApplicationFee && !hasPaidScholarshipFee;
        if (selectedStatus === 'scholarship_paid') return !hasPaidApplicationFee && hasPaidScholarshipFee;
        if (selectedStatus === 'pending') return !hasPaidApplicationFee && !hasPaidScholarshipFee;
        return true;
      });
    }

    // Filtro por país
    if (selectedCountry) {
      filtered = filtered.filter(app => (app as any).user_profiles?.country === selectedCountry);
    }

    // Filtros avançados
    if (advancedAcademicLevel) {
      filtered = filtered.filter(app => (app as any).user_profiles?.academic_level === advancedAcademicLevel);
    }

    if (advancedFieldOfInterest) {
      filtered = filtered.filter(app => (app as any).user_profiles?.field_of_interest === advancedFieldOfInterest);
    }

    if (advancedEnglishProficiency) {
      filtered = filtered.filter(app => (app as any).user_profiles?.english_proficiency === advancedEnglishProficiency);
    }

    // Document Requests: assumimos que application pode conter arrays agregados (requests/uploads) via contexto
    if (docRequestTitle) {
      const term = docRequestTitle.toLowerCase();
      filtered = filtered.filter(app => {
        const requests = (app as any).document_requests as Array<any> | undefined;
        if (!requests || requests.length === 0) return false;
        return requests.some(r => (r?.title || '').toLowerCase().includes(term));
      });
    }

    if (docRequestState) {
      filtered = filtered.filter(app => {
        const requests = (app as any).document_requests as Array<any> | undefined;
        const uploads = (app as any).document_request_uploads as Array<any> | undefined;
        const hasRequests = !!requests && requests.length > 0;
        const hasUploads = !!uploads && uploads.length > 0;

        if (docRequestState === 'has_requests') return hasRequests;
        if (docRequestState === 'has_uploads') return hasUploads;
        if (docRequestState === 'missing_uploads') return hasRequests && !hasUploads;
        return true;
      });
    }

    // Faixa de data por created_at do application
    if (advancedDateFrom || advancedDateTo) {
      const from = advancedDateFrom ? new Date(advancedDateFrom) : null;
      const to = advancedDateTo ? new Date(advancedDateTo) : null;
      filtered = filtered.filter(app => {
        const createdAt = new Date((app as any).created_at || 0);
        if (from && createdAt < from) return false;
        if (to) {
          const toEnd = new Date(to);
          toEnd.setHours(23, 59, 59, 999);
          if (createdAt > toEnd) return false;
        }
        return true;
      });
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
  }, [
    applications,
    selectedScholarship,
    selectedStatus,
    selectedCountry,
    searchTerm,
    advancedAcademicLevel,
    advancedFieldOfInterest,
    advancedEnglishProficiency,
    docRequestTitle,
    docRequestState,
    advancedDateFrom,
    advancedDateTo,
  ]);

  // Função para obter status e badge baseado no pagamento das taxas
  const getStudentStatus = (app: any) => {
    const student = app.user_profiles;
    const hasPaidApplicationFee = student?.is_application_fee_paid;
    const hasPaidScholarshipFee = app.is_scholarship_fee_paid;
    const bothFeesPaid = hasPaidApplicationFee && hasPaidScholarshipFee;
    
    if (bothFeesPaid) {
      return { text: 'Fees Paid', class: 'bg-green-50 text-green-700 border border-green-200', icon: CheckCircle };
    } else if (hasPaidApplicationFee && !hasPaidScholarshipFee) {
      return { text: 'Application Fee Paid', class: 'bg-blue-50 text-blue-700 border border-blue-200', icon: Clock };
    } else if (!hasPaidApplicationFee && hasPaidScholarshipFee) {
      return { text: 'Scholarship Fee Paid', class: 'bg-orange-50 text-orange-700 border border-orange-200', icon: Clock };
    } else {
      return { text: 'Fees Pending', class: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: FileText };
    }
  };

  // Handlers para o MessagesDashboard (usando funções reais do hook)
  const handleMarkAsRead = markAsRead;
  const handleQuickReply = sendQuickReply;

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to manage students"
      description="Finish setting up your university profile to view and manage student applications"
    >
      <div className="min-h-screen">
        {/* Header + Tabs Section */}
        <div className="w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="max-w-full mx-auto bg-slate-50">
              {/* Header: title + note + counter */}
              <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                    Student Management
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-600">
                    {activeTab === 'students' 
                      ? 'Students who have completed both fee payments and are ready for enrollment.'
                      : 'Manage student conversations and messages in one place.'
                    }
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {activeTab === 'students'
                      ? 'These students have paid both the application fee and scholarship fee, and are now enrolled students.'
                      : 'View, filter, and respond to student messages efficiently.'
                    }
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
                    {activeTab === 'students' ? (
                      <>
                        <Users className="w-5 h-5 mr-2" />
                        {filteredApplications.length} Students
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5 mr-2" />
                        {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)} Unread
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-slate-200 bg-white">
                <div className="px-4 sm:px-6 lg:px-8">
                  <div className="flex space-x-8">
                    <button
                      onClick={() => setActiveTab('students')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'students'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Students ({filteredApplications.length})</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'messages'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4" />
                        <span>Messages ({conversations.length})</span>
                        {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0) > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Separation and Filters row - Only show for students tab */}
              {activeTab === 'students' && (
                <div className="border-t border-slate-200 bg-white">
                  <div className="px-4 sm:px-6 lg:px-8 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {/* Search Bar */}
                      <div className="lg:col-span-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                          <input
                            type="text"
                            placeholder="Search enrolled students..."
                            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Scholarship Filter */}
                      <div>
                        <select
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
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
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                          <option value="">All Fee Status</option>
                          <option value="both_paid">Both Fees Paid</option>
                          <option value="application_paid">Application Fee Paid</option>
                          <option value="scholarship_paid">Scholarship Fee Paid</option>
                          <option value="pending">Fees Pending</option>
                        </select>
                      </div>

                      {/* Country Filter */}
                      <div>
                        <select
                          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
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

                  {/* Toggle Advanced */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Advanced filters help refine enrolled students.
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      onClick={() => setShowAdvanced(v => !v)}
                    >
                      {showAdvanced ? 'Hide Advanced' : 'Advanced Filters'}
                      {advancedActiveCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                          {advancedActiveCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="mt-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                      {/* Academic Level */}
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Academic Level</label>
                            <select
                              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent bg-white"
                              value={advancedAcademicLevel}
                              onChange={(e) => setAdvancedAcademicLevel(e.target.value)}
                            >
                              <option value="">Any</option>
                              {academicLevels.map(level => (
                                <option key={level} value={level}>{level}</option>
                              ))}
                            </select>
                          </div>

                      {/* Field of Interest */}
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Field of Interest</label>
                            <select
                              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent bg-white"
                              value={advancedFieldOfInterest}
                              onChange={(e) => setAdvancedFieldOfInterest(e.target.value)}
                            >
                              <option value="">Any</option>
                              {fieldsOfInterest.map(field => (
                                <option key={field} value={field}>{field}</option>
                              ))}
                            </select>
                          </div>

                      {/* English Proficiency */}
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">English Proficiency</label>
                            <select
                              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent bg-white"
                              value={advancedEnglishProficiency}
                              onChange={(e) => setAdvancedEnglishProficiency(e.target.value)}
                            >
                              <option value="">Any</option>
                              {englishProficiencies.map(level => (
                                <option key={level} value={level}>{level}</option>
                              ))}
                            </select>
                          </div>

                      {/* Document Requests - título */}
                          <div className="lg:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Document Request Title</label>
                            <input
                              type="text"
                              placeholder="e.g. Passport, Diploma, I-20"
                              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent bg-white"
                              value={docRequestTitle}
                              onChange={(e) => setDocRequestTitle(e.target.value)}
                            />
                          </div>

                      {/* Document Requests - estado */}
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Document Request State</label>
                            <select
                              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent bg-white"
                              value={docRequestState}
                              onChange={(e) => setDocRequestState(e.target.value)}
                            >
                              <option value="">Any</option>
                              <option value="has_requests">Has Requests</option>
                              <option value="has_uploads">Has Uploads</option>
                              <option value="missing_uploads">Missing Uploads</option>
                            </select>
                          </div>

                      {/* Date range */}
                          <div className="lg:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Application Date Range</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="date"
                                className="w-full px-3 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent bg-white"
                                value={advancedDateFrom}
                                onChange={(e) => setAdvancedDateFrom(e.target.value)}
                              />
                              <input
                                type="date"
                                className="w-full px-3 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent bg-white"
                                value={advancedDateTo}
                                onChange={(e) => setAdvancedDateTo(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-3">
                          {advancedActiveCount > 0 && (
                            <button
                              type="button"
                              className="text-sm text-slate-600 hover:text-slate-800 underline underline-offset-4"
                              onClick={clearAdvancedFilters}
                            >
                              Clear advanced filters
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Students Summary - Only show for students tab */}
          {activeTab === 'students' && filteredApplications.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">Student Management</h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      {filteredApplications.length} students have completed all requirements and are enrolled
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 text-center sm:text-right">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{filteredApplications.length}</div>
                    <div className="text-xs sm:text-sm text-slate-600">Students</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          {activeTab === 'students' ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Students Grid */}
            <div className="p-6">
              <div className="space-y-4">
                {filteredApplications.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
                    <Users className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No students with both fees paid</h3>
                    <p className="text-sm sm:text-base text-slate-600">Students will appear here once they have paid both Application Fee and Scholarship Fee.</p>
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
                        <div className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                              {student?.avatar_url ? (
                                <img
                                  src={student.avatar_url}
                                  alt={student?.full_name || student?.name || 'Student Avatar'}
                                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#05294E] to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-semibold text-base sm:text-lg">
                                    {(student?.full_name || student?.name || 'U')[0].toUpperCase()}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 break-words">
                                  {student?.full_name || student?.name || 'Unknown Student'}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-600 mt-1">
                                  {student?.country && (
                                    <div className="flex items-center">
                                      <Globe className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                                      <span className="truncate">{student.country}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Scholarship Information */}
                                {(app as any).scholarships && (
                                  <div className="mt-2">
                                    <span className="text-xs text-slate-600 break-words">
                                      <span className="font-medium">Scholarship:</span> {(app as any).scholarships.title}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          
                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-3">
                              <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border ${status.class}`}>
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
          ) : (
            /* Messages Dashboard */
            <MessagesDashboard
              conversations={conversations}
              onMarkAsRead={handleMarkAsRead}
              onQuickReply={handleQuickReply}
              loading={messagesLoading}
              isUpdating={messagesUpdating}
            />
          )}
        </div>
      </div>
    </ProfileCompletionGuard>
  );
};

export default StudentManagement;