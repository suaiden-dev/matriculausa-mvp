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
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Payment Management</h1>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <p>Here you can view student payments for your university's scholarships - only the application fee status is shown.</p>
        <div className="mt-4 flex items-center justify-between">
          <input
            type="text"
            placeholder="Filter by student name..."
            className="border rounded px-3 py-2 w-full max-w-xs"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <span className="text-sm text-gray-500 ml-4">
            Showing {filtered.length} students from {university.name}
          </span>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-10">Loading payments...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-xl shadow border border-slate-200">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Phone</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Application Fee</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-400 py-8">No students found.</td>
                </tr>
              )}
              {filtered.map((student, idx) => (
                <tr key={student.id} className={
                  `border-b last:border-0 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50`
                }>
                  <td className="px-4 py-3 font-semibold text-[#05294E]">{student.full_name}</td>
                  <td className="px-4 py-3">{student.email || '-'}</td>
                  <td className="px-4 py-3">{student.phone || '-'}</td>
                  <td className="px-4 py-3">
                    {student.is_application_fee_paid ? (
                      <span className="flex items-center gap-1 text-green-600 font-bold"><CheckCircle size={18} className="inline" /> Paid</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle size={18} className="inline" /> Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </ProfileCompletionGuard>
  );
};

export default PaymentManagement; 