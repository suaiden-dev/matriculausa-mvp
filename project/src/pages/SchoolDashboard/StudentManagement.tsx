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
  // Removido o activeTab pois agora só mostra "All Students" (exceto os em processo de seleção)

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
        console.log(`  - Application Fee: ${student.is_application_fee_paid}`);
        console.log(`  - Scholarship Fee: ${(app as any).is_scholarship_fee_paid}`);
        console.log(`  - Both Fees Paid: ${student.is_application_fee_paid && (app as any).is_scholarship_fee_paid}`);
      }
    });
    
    // Filtra baseado no status de pagamento das taxas
    // Inclui alunos que já pagaram AMBAS as taxas (Application Fee + Scholarship Fee)
    let filtered = applications.filter(app => {
      const student = (app as any).user_profiles;
      const hasPaidApplicationFee = student?.is_application_fee_paid;
      const hasPaidScholarshipFee = (app as any).is_scholarship_fee_paid;
      const bothFeesPaid = hasPaidApplicationFee && hasPaidScholarshipFee;
      
      // Debug: log do filtro
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
        const student = app.user_profiles;
        const hasPaidApplicationFee = student?.is_application_fee_paid;
        const hasPaidScholarshipFee = app.is_scholarship_fee_paid;
        
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
  }, [applications, selectedScholarship, selectedStatus, selectedCountry, searchTerm]);

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

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to manage students"
      description="Finish setting up your university profile to view and manage student applications"
    >
      <div className="min-h-screen">


        {/* Filters and Search Section */}
        <div className="max-w-7xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            {/* Page Header */}
            <div className="bg-slate-50 border-b border-slate-200">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-[#05294E]" />
                    <h2 className="text-lg font-semibold text-slate-900">All Students</h2>
                    <span className="text-sm text-slate-600">
                      (students who have paid both Application Fee and Scholarship Fee)
                    </span>
                  </div>
                  <div className="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300">
                    <Users className="w-4 h-4 mr-1.5" />
                    {filteredApplications.length} Students
                  </div>
                </div>
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
                 <h3 className="text-lg font-medium text-slate-900 mb-2">No students with both fees paid</h3>
                 <p className="text-slate-600">Students will appear here once they have paid both Application Fee and Scholarship Fee.</p>
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
                              </div>
                              
                              {/* Scholarship Information */}
                              {(app as any).scholarships && (
                                <div className="mt-2 flex items-center space-x-1">
                                  <span className="text-xs text-slate-600">
                                    <span className="font-medium">Scholarship:</span> {(app as any).scholarships.title}
                                  </span>
                                </div>
                              )}
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