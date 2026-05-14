import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Globe, Calendar, MessageSquare } from 'lucide-react';
import type { Scholarship } from '../../types';
import { useUniversity } from '../../context/UniversityContext';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';

const StudentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { applications, university } = useUniversity();
  
  // States para filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScholarship, setSelectedScholarship] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  // Removido o activeTab e selectedStatus pois agora foca em "Enrolled Students"

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

  // Filtra aplicações baseado no status 'enrolled'
  const filteredApplications = useMemo(() => {
    // MOSTRAR APENAS ESTUDANTES COM STATUS 'ENROLLED'
    let filtered = applications.filter(app => app.status === 'enrolled');
    
    console.log(`Total applications: ${applications.length}`);
    console.log(`Filtered applications (enrolled): ${filtered.length}`);
    
    // Filtro por bolsa
    if (selectedScholarship) {
      filtered = filtered.filter(app => app.scholarship_id === selectedScholarship);
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
  }, [applications, selectedScholarship, selectedCountry, searchTerm]);

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to manage students"
      description="Finish setting up your university profile to view and manage student applications"
    >
      <div className="min-h-screen">
        {/* Header + Filters Section */}
        <div className="w-full">
          {/* Main Unified Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="max-w-full mx-auto">
              {/* Header: title + note + counter - Light background for contrast */}
              <div className="bg-slate-50 px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                    Enrolled Students
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-600">
                    Students who have successfully completed the admission process and are now enrolled.
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    Manage your student roster and view their application details.
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-300 shadow-sm">
                    <Users className="w-5 h-5 mr-2" />
                    {filteredApplications.length} Students
                  </div>
                </div>
              </div>

              {/* Filters row */}
              <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 border-b border-slate-100">
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
                </div>
            {/* Main Content (Student Grid) - No border/bg needed as it's inside the unified container */}
            <div className="overflow-x-auto">
              {filteredApplications.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No enrolled students found</h3>
                  <p className="text-sm text-slate-500">Students will appear here once their application status is updated to 'Enrolled'.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Scholarship
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Chat
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Applied Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredApplications.map((app) => {
                      const student = (app as any).user_profiles;

                      return (
                        <tr 
                          key={app.id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => window.location.href = `/school/dashboard/student/${app.id}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 relative">
                                {student?.avatar_url ? (
                                  <img
                                    src={student.avatar_url}
                                    alt={student?.full_name || 'Student'}
                                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#05294E] to-blue-600 flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      {(student?.full_name || student?.name || 'U')[0].toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-slate-900 group-hover:text-[#05294E] transition-colors">
                                  {student?.full_name || student?.name || 'Unknown Student'}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                  {student?.country && (
                                    <>
                                      <Globe className="w-3 h-3 mr-1 text-slate-400" />
                                      {student.country}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-900 font-medium max-w-md truncate">
                              {(app as any).scholarships?.title || 'Unknown Scholarship'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/school/dashboard/messages?studentId=${student?.user_id || app.user_id}`);
                              }}
                              className="inline-flex items-center px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-[#05294E] hover:border-[#05294E] transition-all shadow-sm group/btn"
                              title="Send message to student"
                            >
                              <MessageSquare className="w-4 h-4 mr-2 text-slate-400 group-hover/btn:text-[#05294E] transition-colors" />
                              Message
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500">
                            <div className="flex items-center justify-end">
                              <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                              {new Date((app as any).created_at || Date.now()).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProfileCompletionGuard>
  );
};

export default StudentManagement;