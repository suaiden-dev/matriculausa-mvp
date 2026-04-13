import React from 'react';
import { X } from 'lucide-react';
import { PendingPayment, StudentRecord } from './types';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  pendingPayment: PendingPayment | null;
  student: StudentRecord | null;
  paymentMethod: string;
  amount: number;
  onPaymentMethodChange: (method: string) => void;
  onAmountChange: (amount: number) => void;
  isProcessing: boolean;
  zelleProofFile?: File | null;
  onZelleProofFileChange?: (file: File | null) => void;
}

/**
 * PaymentConfirmationModal - Modal for confirming manual payment
 */
const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  pendingPayment,
  paymentMethod,
  amount,
  onPaymentMethodChange,
  onAmountChange,
  isProcessing,
  zelleProofFile,
  onZelleProofFileChange,
}) => {
  if (!isOpen || !pendingPayment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Confirm Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                onPaymentMethodChange(e.target.value);
                if (e.target.value !== 'zelle' && onZelleProofFileChange) {
                  onZelleProofFileChange(null);
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="manual">Outside Platform</option>
              <option value="stripe">Stripe</option>
              <option value="zelle">Zelle</option>
              <option value="parcelow">Parcelow</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              min="0"
              step="0.01"
            />
          </div>
          {paymentMethod === 'zelle' && onZelleProofFileChange && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Zelle Proof of Payment (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition font-medium text-slate-700 w-full justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>{zelleProofFile ? 'Change file' : 'Select file (PDF/Image)'}</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*,.pdf"
                    onChange={(e) => onZelleProofFileChange(e.target.files ? e.target.files[0] : null)}
                    disabled={isProcessing}
                  />
                </label>
              </div>
              {zelleProofFile && (
                <p className="mt-2 text-xs text-slate-600 font-medium truncate">
                  Selected: {zelleProofFile.name}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center space-x-3 pt-4">
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-[#05294E] hover:bg-[#05294E]/90 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </button>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmationModal;

