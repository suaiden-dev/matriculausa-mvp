import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, CreditCard, User, Calendar, DollarSign } from 'lucide-react';
import { insertZelleCode } from '../services/ZellePaymentService';

interface ZellePaymentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    user_id: string;
    student_name: string;
    student_email: string;
    fee_type: string;
    amount: number;
    status: string;
    payment_date?: string;
    screenshot_url?: string;
    created_at: string;
  };
  onSuccess: () => void;
  adminId: string;
  onApprove?: (paymentId: string) => Promise<void>;
  onReject?: (paymentId: string, reason: string) => Promise<void>;
}

export const ZellePaymentReviewModal: React.FC<ZellePaymentReviewModalProps> = ({
  isOpen,
  onClose,
  payment,
  onSuccess,
  adminId,
  onApprove,
  onReject
}) => {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [zelleCode, setZelleCode] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedRejectionReason, setSelectedRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opções pré-definidas de motivos de rejeição
  const rejectionReasons = [
    'Incomplete proof of payment',
    'Illegible screenshot',
    'Proof does not match payment amount',
    'Missing payment details',
    'Invalid payment date',
    'Wrong recipient information',
    'Duplicate payment submission',
    'Payment not received',
    'Insufficient payment amount',
    'Other (specify in notes)'
  ];

  const handleSubmit = async () => {
    if (!action) return;

    setLoading(true);
    setError(null);

    try {
      // Se o admin digitou um código Zelle, inserir no PostgreSQL externo
      if (zelleCode.trim()) {
        console.log('💾 [ZellePaymentReviewModal] Inserindo código Zelle no PostgreSQL:', zelleCode.trim());
        const result = await insertZelleCode(zelleCode.trim());
        
        if (!result.success) {
          console.error('❌ [ZellePaymentReviewModal] Erro ao inserir código Zelle:', result.error);
          setError('Erro ao inserir código Zelle: ' + result.error);
          return;
        }
        console.log('✅ [ZellePaymentReviewModal] Código Zelle inserido com sucesso:', result.data);
      }

      // Chamar a função correta baseada na ação
      if (action === 'approve' && onApprove) {
        console.log('✅ [ZellePaymentReviewModal] Chamando função de aprovação...');
        await onApprove(payment.id);
      } else if (action === 'reject' && onReject) {
        console.log('❌ [ZellePaymentReviewModal] Chamando função de rejeição...');
        const rejectionReason = selectedRejectionReason || adminNotes;
        await onReject(payment.id, rejectionReason);
      } else {
        console.warn('⚠️ [ZellePaymentReviewModal] Função de aprovação/rejeição não disponível');
        setError('Função de aprovação/rejeição não disponível');
        return;
      }

      console.log('✅ [ZellePaymentReviewModal] Ação executada com sucesso');
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('❌ [ZellePaymentReviewModal] Erro ao processar ação:', error);
      setError('Erro inesperado ao processar ação');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAction(null);
    setZelleCode('');
    setAdminNotes('');
    setSelectedRejectionReason('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getFeeTypeLabel = (feeType: string) => {
    const types: { [key: string]: string } = {
      'selection_process': 'Selection Process Fee',
      'application_fee': 'Application Fee',
      'scholarship_fee': 'Scholarship Fee',
      'i-20_control_fee': 'I-20 Control Fee'
    };
    return types[feeType] || feeType;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Review Zelle Payment
              </h2>
              <p className="text-sm text-gray-600">
                Approve or reject payment verification
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Payment Details */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Student</p>
                <p className="font-medium text-gray-900">{payment.student_name}</p>
                <p className="text-sm text-gray-500">{payment.student_email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-medium text-gray-900">${payment.amount.toLocaleString()} USD</p>
                <p className="text-sm text-gray-500">{getFeeTypeLabel(payment.fee_type)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Payment Date</p>
                <p className="font-medium text-gray-900">
                  {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-sm text-gray-500">
                  Submitted: {new Date(payment.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(payment.status).split(' ')[0]}`}></div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                  {payment.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Screenshot Preview */}
          {payment.screenshot_url && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Payment Screenshot</p>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <img
                  src={payment.screenshot_url}
                  alt="Payment screenshot"
                  className="max-w-full max-h-48 mx-auto rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Selection */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Review Action</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setAction('approve')}
              className={`p-4 border-2 rounded-lg transition-colors ${
                action === 'approve'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle className={`w-6 h-6 ${action === 'approve' ? 'text-green-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Approve Payment</p>
                  <p className="text-sm text-gray-600">Mark payment as verified and approved</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setAction('reject')}
              className={`p-4 border-2 rounded-lg transition-colors ${
                action === 'reject'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <XCircle className={`w-6 h-6 ${action === 'reject' ? 'text-red-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Reject Payment</p>
                  <p className="text-sm text-gray-600">Mark payment as invalid or incomplete</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Additional Fields */}
        {action && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            
            {/* Zelle Code Field - Only for approval */}
            {action === 'approve' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zelle Code (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={zelleCode}
                    onChange={(e) => setZelleCode(e.target.value)}
                    placeholder="Enter Zelle transaction code if available"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This field is optional. You can enter the Zelle transaction code if you have it available.
                </p>
              </div>
            )}

            {/* Rejection Reason Cards - Only for rejection */}
            {action === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rejection Reason (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rejectionReasons.map((reason, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedRejectionReason(reason)}
                      className={`p-3 text-left border-2 rounded-lg transition-all duration-200 ${
                        selectedRejectionReason === reason
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-25 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedRejectionReason === reason
                            ? 'border-red-500 bg-red-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedRejectionReason === reason && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="text-sm font-medium">{reason}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Optionally choose a reason for rejecting this payment, or leave blank and use notes below.
                </p>
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes {action === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  action === 'approve' 
                    ? 'Add any notes about this approval (optional)'
                    : selectedRejectionReason === 'Other (specify in notes)'
                      ? 'Please provide additional details about the rejection reason (required)'
                      : 'Add any additional notes about this rejection (optional)'
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required={action === 'reject'}
              />
              {action === 'reject' && (
                <p className="text-xs text-red-500 mt-1">
                  {selectedRejectionReason === 'Other (specify in notes)' && !adminNotes.trim()
                    ? 'Please provide additional details in the notes field.'
                    : 'Optional: Add any additional notes about this rejection.'
                  }
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-6 border-b border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!action || loading || (action === 'reject' && (selectedRejectionReason === 'Other (specify in notes)' && !adminNotes.trim()))}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${
              action === 'approve'
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
            } disabled:cursor-not-allowed`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              `${action === 'approve' ? 'Approve' : 'Reject'} Payment`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZellePaymentReviewModal;
