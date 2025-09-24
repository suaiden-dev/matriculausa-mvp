import React, { useState, useEffect } from 'react';
import { 
  Search,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  GraduationCap,
  Building,
  User,
  ArrowRight,
  AlertCircle,
  Lock,
  CreditCard,
  Award,
  BookOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StudentRecord {
  // Dados do estudante (sempre presentes)
  student_id: string;
  student_name: string;
  student_email: string;
  student_created_at: string;
  has_paid_selection_process_fee: boolean;
  has_paid_i20_control_fee: boolean;
  
  // Dados da aplicação (podem ser null se não aplicou ainda)
  application_id: string | null;
  scholarship_id: string | null;
  status: string | null;
  applied_at: string | null;
  is_application_fee_paid: boolean;
  is_scholarship_fee_paid: boolean;
  acceptance_letter_status: string | null;
  payment_status: string | null;
  scholarship_title: string | null;
  university_name: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  
  // Campos adicionais para múltiplas aplicações
  is_locked: boolean;
  total_applications: number;
  all_applications: any[];
}

const StudentApplicationsView: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      // Buscar todos os estudantes com suas aplicações (se houver)
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          email,
          created_at,
          has_paid_selection_process_fee,
          has_paid_i20_control_fee,
          role,
          scholarship_applications (
            id,
            scholarship_id,
            status,
            applied_at,
            is_application_fee_paid,
            is_scholarship_fee_paid,
            acceptance_letter_status,
            payment_status,
            reviewed_at,
            reviewed_by,
            scholarships (
              title,
              universities (
                name
              )
            )
          )
        `)
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((student: any) => {
        // Cada estudante aparece apenas uma vez na tabela
        let scholarshipInfo = null;
        let applicationStatus = null;
        
        let lockedApplication = null;
        
        if (student.scholarship_applications && student.scholarship_applications.length > 0) {
          // Verificar se existe uma aplicação "locked" (aprovada + application_fee paga)
          lockedApplication = student.scholarship_applications.find((app: any) => 
            app.status === 'approved' && app.is_application_fee_paid
          );
          
          // Se há uma aplicação locked, mostrar informações dela no campo scholarship
          if (lockedApplication) {
            scholarshipInfo = {
              title: lockedApplication.scholarships?.title || 'N/A',
              university: lockedApplication.scholarships?.universities?.name || 'N/A'
            };
            applicationStatus = lockedApplication.status;
          }
          // Se não há aplicação locked, deixar campo scholarship vazio
        }

        return {
          student_id: student.id,
          student_name: student.full_name || 'N/A',
          student_email: student.email || 'N/A',
          student_created_at: student.created_at,
          has_paid_selection_process_fee: student.has_paid_selection_process_fee || false,
          has_paid_i20_control_fee: student.has_paid_i20_control_fee || false,
          // Dados da aplicação só aparecem se locked
          application_id: lockedApplication?.id || null,
          scholarship_id: lockedApplication?.scholarship_id || null,
          status: applicationStatus,
          applied_at: lockedApplication?.applied_at || null,
          is_application_fee_paid: !!lockedApplication,
          is_scholarship_fee_paid: lockedApplication?.is_scholarship_fee_paid || false,
          acceptance_letter_status: lockedApplication?.acceptance_letter_status || null,
          payment_status: lockedApplication?.payment_status || null,
          scholarship_title: scholarshipInfo ? scholarshipInfo.title : null,
          university_name: scholarshipInfo ? scholarshipInfo.university : null,
          reviewed_at: lockedApplication?.reviewed_at || null,
          reviewed_by: lockedApplication?.reviewed_by || null,
          is_locked: !!lockedApplication,
          total_applications: student.scholarship_applications ? student.scholarship_applications.length : 0,
          // Guardar todas as aplicações para o modal
          all_applications: student.scholarship_applications || []
        };
      }) || [];

      setStudents(formattedData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (student: StudentRecord, step: string) => {
    switch (step) {
      case 'selection_fee':
        return student.has_paid_selection_process_fee ? 'completed' : 'pending';
      case 'apply':
        return student.applied_at ? 'completed' : 'pending';
      case 'review':
        if (student.status === 'approved') return 'completed';
        if (student.status === 'rejected') return 'rejected';
        if (student.status === 'under_review') return 'in_progress';
        return 'pending';
      case 'application_fee':
        return student.is_application_fee_paid ? 'completed' : 'pending';
      case 'scholarship_fee':
        return student.is_scholarship_fee_paid ? 'completed' : 'pending';
      case 'acceptance_letter':
        if (student.acceptance_letter_status === 'approved') return 'completed';
        if (student.acceptance_letter_status === 'sent') return 'in_progress';
        return 'pending';
      case 'i20_fee':
        return student.has_paid_i20_control_fee ? 'completed' : 'pending';
      case 'enrollment':
        return student.status === 'enrolled' ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      case 'rejected': return XCircle;
      case 'pending': return AlertCircle;
      default: return AlertCircle;
    }
  };

  const filteredStudents = students.filter((student: StudentRecord) => {
    const matchesSearch = 
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.scholarship_title && student.scholarship_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.university_name && student.university_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      student.status === statusFilter || 
      (statusFilter === 'no_applications' && !student.application_id) ||
      (statusFilter === 'multiple_applications' && student.total_applications > 1 && !student.is_locked) ||
      (statusFilter === 'locked' && student.is_locked) ||
      (statusFilter === 'single_application' && student.total_applications === 1);
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const ApplicationFlowSteps = ({ student }: { student: StudentRecord }) => {
    const steps = [
      { key: 'selection_fee', label: 'Selection Fee', icon: CreditCard },
      { key: 'apply', label: 'Application', icon: FileText },
      { key: 'review', label: 'Review', icon: Eye },
      { key: 'application_fee', label: 'App Fee', icon: DollarSign },
      { key: 'scholarship_fee', label: 'Scholarship Fee', icon: Award },
      { key: 'acceptance_letter', label: 'Acceptance', icon: BookOpen },
      { key: 'i20_fee', label: 'I-20 Fee', icon: CreditCard },
      { key: 'enrollment', label: 'Enrollment', icon: GraduationCap }
    ];

    return (
      <div className="flex items-center space-x-2 overflow-x-auto">
        {steps.map((step, index) => {
          const status = getStepStatus(student, step.key);
          const StatusIcon = getStatusIcon(status);
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.key}>
              <div className={`flex flex-col items-center p-2 rounded-lg transition-all ${getStatusColor(status)}`}>
                <div className="relative">
                  <StepIcon className="h-5 w-5 mb-1" />
                  <StatusIcon className="h-3 w-3 absolute -top-1 -right-1" />
                </div>
                <span className="text-xs font-medium text-center">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#05294E]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Application Tracking</h2>
          <p className="text-gray-600">Monitor the complete application journey of all students</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredStudents.length} students found
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name, email, scholarship, or university..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#05294E] focus:border-[#05294E]"
            >
              <option value="all">All Students</option>
              <option value="no_applications">No Applications</option>
              <option value="single_application">Single Application</option>
              <option value="multiple_applications">Multiple Applications</option>
              <option value="locked">Committed to Scholarship</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="enrolled">Enrolled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scholarship
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application Flow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentStudents.map((student) => (
                <tr key={student.application_id || student.student_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {student.student_name}
                          </div>
                          {student.is_locked && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <Lock className="h-3 w-3 mr-1" />
                              Committed
                            </span>
                          )}
                          {!student.is_locked && student.total_applications > 1 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              {student.total_applications} Applications
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.student_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {student.scholarship_title ? (
                        student.scholarship_title
                      ) : student.total_applications > 0 ? (
                        <span className="text-amber-600">
                          {student.total_applications} Application{student.total_applications > 1 ? 's' : ''} (Pending Payment)
                        </span>
                      ) : (
                        'No Application'
                      )}
                    </div>
                    {student.university_name && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <Building className="h-4 w-4 mr-1" />
                        {student.university_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <ApplicationFlowSteps student={student} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {student.applied_at 
                        ? new Date(student.applied_at).toLocaleDateString()
                        : `Joined ${new Date(student.student_created_at).toLocaleDateString()}`
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="text-[#05294E] hover:text-[#05294E]/80 transition-colors"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(startIndex + itemsPerPage, filteredStudents.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredStudents.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-[#05294E] border-[#05294E] text-white'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed View Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Student Details</h3>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Student Info */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Student Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-sm text-gray-900">{selectedStudent.student_name}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{selectedStudent.student_email}</p>
                  </div>
                </div>
              </div>

              {/* Scholarship Info */}
              {selectedStudent.scholarship_title ? (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Scholarship Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-gray-500">Scholarship</label>
                      <p className="text-sm text-gray-900">{selectedStudent.scholarship_title}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-gray-500">University</label>
                      <p className="text-sm text-gray-900">{selectedStudent.university_name}</p>
                    </div>
                  </div>
                </div>
              ) : selectedStudent.total_applications > 0 ? (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Active Applications ({selectedStudent.total_applications})
                  </h4>
                  <div className="space-y-3">
                    {selectedStudent.all_applications.map((app: any) => (
                      <div key={app.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {app.scholarships?.title || 'N/A'}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {app.scholarships?.universities?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied: {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              app.status === 'approved' 
                                ? 'bg-green-100 text-green-800'
                                : app.status === 'under_review'
                                ? 'bg-blue-100 text-blue-800' 
                                : app.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {app.status || 'Pending'}
                            </span>
                            {app.status === 'approved' && (
                              <div className="mt-1">
                                <span className={`text-xs font-medium ${
                                  app.is_application_fee_paid 
                                    ? 'text-green-600' 
                                    : 'text-amber-600'
                                }`}>
                                  {app.is_application_fee_paid ? '✓ Fee Paid' : 'Payment Pending'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> Student can apply to multiple scholarships. 
                      Once approved and application fee is paid for one scholarship, 
                      the student will be committed to that scholarship.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Application Status</h4>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-yellow-800">This student hasn't applied to any scholarship yet.</p>
                  </div>
                </div>
              )}

              {/* Application Flow */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Application Progress</h4>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <ApplicationFlowSteps student={selectedStudent} />
                </div>
              </div>

              {/* Payment Status */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Payment Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Selection Process Fee</label>
                    <div className="flex items-center mt-2">
                      {selectedStudent.has_paid_selection_process_fee ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedStudent.has_paid_selection_process_fee 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {selectedStudent.has_paid_selection_process_fee ? 'Paid' : 'Not Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Application Fee</label>
                    <div className="flex items-center mt-2">
                      {selectedStudent.is_application_fee_paid ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedStudent.is_application_fee_paid 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {selectedStudent.is_application_fee_paid ? 'Paid' : 'Not Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">Scholarship Fee</label>
                    <div className="flex items-center mt-2">
                      {selectedStudent.is_scholarship_fee_paid ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedStudent.is_scholarship_fee_paid 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {selectedStudent.is_scholarship_fee_paid ? 'Paid' : 'Not Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-500">I-20 Control Fee</label>
                    <div className="flex items-center mt-2">
                      {selectedStudent.has_paid_i20_control_fee ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedStudent.has_paid_i20_control_fee 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {selectedStudent.has_paid_i20_control_fee ? 'Paid' : 'Not Paid'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-gray-900">
                      Joined on {new Date(selectedStudent.student_created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedStudent.applied_at && (
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-gray-900">
                        Applied on {new Date(selectedStudent.applied_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedStudent.reviewed_at && (
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                      <span className="text-sm text-gray-900">
                        Reviewed on {new Date(selectedStudent.reviewed_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentApplicationsView;