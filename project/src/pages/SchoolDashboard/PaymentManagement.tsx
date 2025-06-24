import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { CheckCircle, XCircle } from 'lucide-react';

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
  { key: 'selectionProcessFee', label: 'Selection Process Fee', column: 'has_paid_selection_process_fee' },
  { key: 'applicationFee', label: 'Application Fee', column: 'is_application_fee_paid' },
  { key: 'scholarshipFee', label: 'Scholarship Fee', column: 'is_scholarship_fee_paid' },
  { key: 'i20ControlFee', label: 'I-20 Control Fee', column: null }, // sempre pendente
];

const PaymentManagement: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*');
    if (error) {
      setLoading(false);
      return;
    }
    setStudents(profiles || []);
    setLoading(false);
  };

  const filtered = students.filter((s) =>
    s.full_name?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Payment Management</h1>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <p>Here you can view all student payments for selection process, application, scholarship, and I-20 control fees.</p>
        <input
          type="text"
          placeholder="Filter by student name..."
          className="mt-4 border rounded px-3 py-2 w-full max-w-xs"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
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
                {FEE_TYPES.map(fee => (
                  <th key={fee.key} className="px-4 py-3 text-left font-semibold text-slate-700">{fee.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-8">No students found.</td>
                </tr>
              )}
              {filtered.map((student, idx) => (
                <tr key={student.id} className={
                  `border-b last:border-0 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50`
                }>
                  <td className="px-4 py-3 font-semibold text-[#05294E]">{student.full_name}</td>
                  <td className="px-4 py-3">{student.email || '-'}</td>
                  <td className="px-4 py-3">{student.phone || '-'}</td>
                  {/* Selection Process Fee */}
                  <td className="px-4 py-3">
                    {student.has_paid_selection_process_fee ? (
                      <span className="flex items-center gap-1 text-green-600 font-bold"><CheckCircle size={18} className="inline" /> Paid</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle size={18} className="inline" /> Pending</span>
                    )}
                  </td>
                  {/* Application Fee */}
                  <td className="px-4 py-3">
                    {student.is_application_fee_paid ? (
                      <span className="flex items-center gap-1 text-green-600 font-bold"><CheckCircle size={18} className="inline" /> Paid</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle size={18} className="inline" /> Pending</span>
                    )}
                  </td>
                  {/* Scholarship Fee */}
                  <td className="px-4 py-3">
                    {student.is_scholarship_fee_paid ? (
                      <span className="flex items-center gap-1 text-green-600 font-bold"><CheckCircle size={18} className="inline" /> Paid</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle size={18} className="inline" /> Pending</span>
                    )}
                  </td>
                  {/* I-20 Control Fee (sempre pendente) */}
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle size={18} className="inline" /> Pending</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement; 