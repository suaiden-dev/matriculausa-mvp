import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUniversity } from '../../context/UniversityContext';
import { CheckCircle, XCircle } from 'lucide-react';
import ProfileCompletionGuard from '../../components/ProfileCompletionGuard';

interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  country?: string;
}

interface PaymentStatus {
  paid: boolean;
  date?: string;
}

interface StudentPaymentInfo {
  student: StudentProfile;
  applicationFee: PaymentStatus;
  schoolMatriculaFee: PaymentStatus;
  scholarshipFee: PaymentStatus;
  i20ControlFee: PaymentStatus;
}

const FEE_TYPES = [
  // { key: 'selectionProcessFee', label: 'Selection Process Fee', column: 'has_paid_selection_process_fee' },
  { key: 'applicationFee', label: 'Application Fee', column: 'is_application_fee_paid' },
  { key: 'scholarshipFee', label: 'Scholarship Fee', column: 'is_scholarship_fee_paid' },
  { key: 'i20ControlFee', label: 'I-20 Control Fee', column: null }, // sempre pendente
];

const PaymentManagement: React.FC = () => {
  const { user } = useAuth();
  const { university, applications, loading: universityLoading } = useUniversity();
  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (university && applications.length >= 0) {
      fetchStudents();
    }
  }, [university, applications]);

  const fetchStudents = async () => {
    if (!university) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Buscar apenas estudantes que se aplicaram para bolsas desta universidade
      const { data: profiles, error } = await supabase
        .from('scholarship_applications')
        .select(`
          user_profiles!student_id(
            id,
            user_id,
            full_name,
            phone,
            country,
            is_application_fee_paid,
            is_scholarship_fee_paid,
            email
          ),
          scholarships!inner(university_id)
        `)
        .eq('scholarships.university_id', university.id);

      if (error) {
        console.error('Error fetching students:', error);
        setLoading(false);
        return;
      }

      // Extrair perfis únicos dos estudantes (evitar duplicatas)
      const uniqueStudents = new Map();
      profiles?.forEach((application: any) => {
        const profile = application.user_profiles;
        if (profile && !uniqueStudents.has(profile.user_id)) {
          uniqueStudents.set(profile.user_id, profile);
        }
      });

      setStudents(Array.from(uniqueStudents.values()));
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter((s) =>
    s.full_name?.toLowerCase().includes(filter.toLowerCase())
  );

  // Mostrar loading se ainda está carregando dados da universidade
  if (universityLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-10">Loading university data...</div>
      </div>
    );
  }

  // Verificar se a universidade existe
  if (!university) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-10">
          <p className="text-gray-500">University information not found.</p>
        </div>
      </div>
    );
  }

  return (
    <ProfileCompletionGuard 
      isProfileCompleted={university?.profile_completed}
      title="Complete your profile to manage payments"
      description="Finish setting up your university profile to track and manage scholarship payments"
    >
      <div className="min-h-screen ">
        <div className="max-w-7xl ">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            {/* Header: title + description + counter */}
            <div className="px-4 sm:px-6 py-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#05294E] tracking-tight">Payment Management</h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-600">
                    Here you can view student payments for your university's scholarships - only the application fee status is shown.
                  </p>
                </div>

                <div className="flex items-center w-full sm:w-auto justify-start sm:justify-end">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                    <span className="font-medium">{filtered.length}</span>
                    <span className="ml-2 text-sm text-slate-600">Students</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Separation and Filters */}
            <div className="border-t border-slate-100 bg-white">
              <div className="px-4 sm:px-6 py-4">
                <div className="flex flex-col gap-4">
                  <div className="w-full">
                    <input
                      type="text"
                      placeholder="Filter by student name..."
                      className="border border-slate-300 rounded-lg px-4 py-3 w-full sm:max-w-md focus:outline-none focus:ring-2 focus:ring-[#05294E] focus:border-transparent"
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Showing {filtered.length} students from <span className="font-medium">{university.name}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">Loading payments...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-xl shadow border border-slate-200">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-700 text-sm sm:text-base">Student</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-700 text-sm sm:text-base hidden sm:table-cell">Email</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-700 text-sm sm:text-base hidden md:table-cell">Phone</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold text-slate-700 text-sm sm:text-base">Application Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-400 py-8 text-sm sm:text-base">No students found.</td>
                    </tr>
                  )}
                  {filtered.map((student, idx) => (
                    <tr key={student.id} className={
                      `border-b last:border-0 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50`
                    }>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#05294E] text-sm sm:text-base">{student.full_name}</span>
                          <div className="flex flex-col gap-1 sm:hidden">
                            {student.email && (
                              <span className="text-xs text-slate-600">{student.email}</span>
                            )}
                            {student.phone && (
                              <span className="text-xs text-slate-600">{student.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell text-sm sm:text-base">{student.email || '-'}</td>
                      <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-sm sm:text-base">{student.phone || '-'}</td>
                      <td className="px-3 sm:px-4 py-3">
                        {student.is_application_fee_paid ? (
                          <span className="flex items-center justify-center gap-1 text-green-600 font-bold text-sm sm:text-base">
                            <CheckCircle size={16} className="sm:w-[18px] sm:h-[18px]" /> 
                            <span className="hidden sm:inline">Paid</span>
                            <span className="sm:hidden">✓</span>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1 text-red-500 font-bold text-sm sm:text-base">
                            <XCircle size={16} className="sm:w-[18px] sm:h-[18px]" /> 
                            <span className="hidden sm:inline">Pending</span>
                            <span className="sm:hidden">✗</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProfileCompletionGuard>
  );
};

export default PaymentManagement;