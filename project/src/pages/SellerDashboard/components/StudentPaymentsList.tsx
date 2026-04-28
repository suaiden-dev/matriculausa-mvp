import React, { useState } from 'react';
import { Eye, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { useStudentPaymentsQuery } from '../hooks/useStudentPaymentsQuery';
import { formatCurrency } from '../../../utils/currency';
import { PaymentDetailsModal } from '../../AdminDashboard/PaymentManagement/components/PaymentDetailsModal';
import type { PaymentRecord } from '../../AdminDashboard/PaymentManagement/data/types';

interface StudentPaymentsListProps {
  studentId: string;
  profileId: string;
}

const FEE_TYPES = [
  { value: 'selection_process', label: 'Selection Process', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'application', label: 'Application Fee', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'scholarship', label: 'Scholarship Fee', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'i20_control_fee', label: 'I-20 Control Fee', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'placement', label: 'Placement Fee', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'ds160_package', label: 'DS-160 Package', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'i539_cos_package', label: 'I-539 COS Package', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { value: 'reinstatement_fee', label: 'Reinstatement Fee', color: 'bg-rose-100 text-rose-700 border-rose-200' }
];

const StudentPaymentsList: React.FC<StudentPaymentsListProps> = ({ studentId, profileId }) => {
  const { data: payments, isLoading, error } = useStudentPaymentsQuery(studentId, profileId);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleViewDetails = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#05294E] animate-spin" />
        <p className="text-slate-500 font-medium">Loading payment history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-slate-900 font-bold">Error loading payments</h4>
          <p className="text-slate-500 text-sm">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Payment History</h3>
          </div>
        </div>
        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200">
          {payments?.length || 0} Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments && payments.length > 0 ? (
              payments.map((payment) => {
                const feeType = FEE_TYPES.find(f => f.value === payment.fee_type);
                return (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${feeType?.color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {feeType?.label || payment.fee_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">
                        {payment.amount > 0 ? formatCurrency(payment.amount / 100) : '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 capitalize">
                        {payment.payment_method || 'manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-US')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(payment)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-[#05294E]/5 text-[#05294E] hover:bg-[#05294E] hover:text-white rounded-lg transition-all duration-200"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <p className="text-slate-400 font-medium">No payment records found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaymentDetailsModal
        open={showModal}
        payment={selectedPayment}
        onClose={() => setShowModal(false)}
        FEE_TYPES={FEE_TYPES.map(f => ({ value: f.value, label: f.label }))}
      />
    </div>
  );
};

export default StudentPaymentsList;
