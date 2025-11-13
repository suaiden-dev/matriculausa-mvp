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
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="manual">Outside Platform</option>
              <option value="stripe">Stripe</option>
              <option value="zelle">Zelle</option>
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

