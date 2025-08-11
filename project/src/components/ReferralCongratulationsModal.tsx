import React, { useState } from 'react';
import { X, Gift, CheckCircle, Star, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface ReferralCongratulationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  discountAmount: number;
  affiliateCode: string;
}

const ReferralCongratulationsModal: React.FC<ReferralCongratulationsModalProps> = ({
  isOpen,
  onClose,
  discountAmount,
  affiliateCode
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleContinue = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-in slide-in-from-bottom-4 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Fechar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            🎉 Parabéns!
          </h2>

          {/* Subtitle */}
          <p className="text-slate-600 mb-6">
            Você ganhou um desconto especial!
          </p>

          {/* Discount Card */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-6 border border-purple-200">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <Gift className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                Código Aplicado: {affiliateCode}
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(discountAmount)}
            </div>
            <div className="text-sm text-slate-600">
              de desconto na primeira taxa
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3 text-sm text-slate-700">
              <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <span>Desconto aplicado automaticamente</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-slate-700">
              <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <span>Válido para Selection Process Fee</span>
            </div>
            <div className="flex items-center space-x-3 text-sm text-slate-700">
              <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <span>Expira em 30 dias</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <span>Continuar</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Info */}
          <p className="text-xs text-slate-500 mt-4">
            O desconto será aplicado automaticamente quando você pagar a taxa de Selection Process.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralCongratulationsModal;
