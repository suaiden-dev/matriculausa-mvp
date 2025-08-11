import React from 'react';
import { CheckCircle, Gift, X } from 'lucide-react';

interface WelcomeDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount?: number;
}

const WelcomeDiscountModal: React.FC<WelcomeDiscountModalProps> = ({ isOpen, onClose, amount = 50 }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Gift className="h-4 w-4" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Welcome!</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h4 className="mb-2 text-center text-xl font-bold text-slate-900">Congratulations!</h4>
          <p className="mb-4 text-center text-slate-600">
            You’ve received a ${amount} coupon for your first fee (Selection Process Fee). It will be automatically
            applied at checkout.
          </p>
          <div className="mt-6 flex justify-center">
            <button onClick={onClose} className="rounded-xl bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 transition-colors">
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDiscountModal;
