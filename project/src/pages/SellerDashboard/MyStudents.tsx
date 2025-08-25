import React, { useState } from 'react';
import { GraduationCap, Search, DollarSign, Calendar, MapPin, Mail, ChevronLeft, ChevronRight } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string;
  country?: string;
  total_paid: number;
  created_at: string;
  status: string;
  latest_activity: string;
  commission_earned?: number;
  fees_count?: number;
  scholarship_title?: string;
  university_name?: string;
}

interface MyStudentsProps {
  students: Student[];
  sellerProfile: any;
  onRefresh: () => void;
  onViewStudent: (studentId: string) => void;
}

const MyStudents: React.FC<MyStudentsProps> = ({ students, sellerProfile, onRefresh, onViewStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Pagination constants
  const STUDENTS_PER_PAGE = 10;

  const filteredStudents = students.filter(student => 
    student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / STUDENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const endIndex = startIndex + STUDENTS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Estatísticas calculadas dinamicamente

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-600">
            Track the students you have referenced
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="bg-[#3B82F6] hover:bg-[#365d9b] text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Students</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{filteredStudents.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Students</p>
                             <p className="text-3xl font-bold text-orange-600 mt-1">
                 {filteredStudents.filter(s => s.status === 'active' || s.status === 'registered' || s.status === 'enrolled').length}
               </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center text-sm text-slate-600">
            <span className="font-medium">{filteredStudents.length}</span>
            <span className="ml-1">student{filteredStudents.length !== 1 ? 's' : ''} found</span>
          </div>
          {totalPages > 1 && (
            <div className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {paginatedStudents.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {paginatedStudents.map((student, index) => (
              <div 
                key={`${student.id}-${index}`}
                className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onViewStudent(student.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="text-lg font-medium text-blue-600">
                        {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {student.full_name || 'Name not provided'}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                        <div className="flex items-center text-sm text-slate-500">
                          <Mail className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{student.email}</span>
                        </div>
                        {student.country && (
                          <div className="flex items-center text-sm text-slate-500">
                            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{student.country}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-slate-500">
                          <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{formatDate(student.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      student.status === 'active' || student.status === 'registered' || student.status === 'enrolled' || student.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : student.status === 'pending' || student.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : student.status === 'dropped' || student.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status === 'active' ? 'Active' :
                       student.status === 'registered' ? 'Registered' : 
                       student.status === 'enrolled' ? 'Enrolled' :
                       student.status === 'completed' ? 'Completed' :
                       student.status === 'pending' ? 'Pending' :
                       student.status === 'processing' ? 'Processing' :
                       student.status === 'dropped' ? 'Dropped' : 
                       student.status === 'cancelled' ? 'Cancelled' :
                       student.status || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {searchTerm ? 'No students found' : 'No referenced students yet'}
            </h3>
            <p className="text-slate-500">
              {searchTerm ? `No students match "${searchTerm}"` : 'Share your referral code to get started!'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200">
            {/* Page information centered */}
            <div className="flex items-center justify-center mb-4">
              <div className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </div>
            </div>
            
            {/* Navigation controls centered */}
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => goToPage(pageNumber)}
                      className={`inline-flex items-center px-3 py-1 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 ${
                        currentPage === pageNumber
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-slate-500">...</span>
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStudents;
