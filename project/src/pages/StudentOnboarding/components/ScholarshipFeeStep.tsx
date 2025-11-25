import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';

export const ScholarshipFeeStep: React.FC<StepProps> = ({ onNext, onComplete }) => {
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(user?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scholarshipFeeAmount = getFeeAmount('scholarship_fee');
  const formattedAmount = scholarshipFeeAmount && !isNaN(scholarshipFeeAmount)
    ? formatFeeAmount(scholarshipFeeAmount)
    : '$0.00';

  const hasPaid = userProfile?.is_scholarship_fee_paid || false;

  useEffect(() => {
    // Verificar se já pagou
    if (hasPaid && onComplete) {
      // Não fazer nada, apenas mostrar o estado
    }
  }, [hasPaid, onComplete]);

  const handleCheckout = async (paymentMethod: 'stripe' | 'pix' = 'stripe') => {
    if (!user?.id || !userProfile?.id) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('User not authenticated');
      }

      // Buscar aplicações
      const { data: applications } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id')
        .eq('student_id', userProfile.id);

      if (!applications || applications.length === 0) {
        throw new Error('No applications found.');
      }

      const scholarshipIds = applications.map(app => app.scholarship_id);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-scholarship-fee`;
      
      const requestBody = {
        price_id: 'price_scholarship_fee',
        amount: scholarshipFeeAmount,
        payment_method: paymentMethod,
        success_url: `${window.location.origin}/student/onboarding?step=completed&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/student/onboarding?step=scholarship_fee&payment=cancelled`,
        mode: 'payment',
        payment_type: 'scholarship_fee',
        fee_type: 'scholarship_fee',
        scholarships_ids: scholarshipIds,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de checkout');
      }

      const data = await response.json();
      
      if (data.session_url) {
        window.location.href = data.session_url;
      } else {
        throw new Error('URL da sessão não encontrada');
      }
    } catch (err: any) {
      console.error('Erro ao processar checkout:', err);
      setError(err.message || 'Erro ao processar pagamento. Tente novamente.');
      setLoading(false);
    }
  };

  if (hasPaid) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Scholarship Fee Paid!</h3>
        <p className="text-gray-600 mb-6">You've completed all required payments.</p>
        {onComplete && (
          <button
            onClick={onComplete}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Complete Onboarding
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pay Scholarship Fee</h2>
        <p className="text-gray-600">Final step: pay the scholarship fee to complete your application</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-medium text-gray-900">Scholarship Fee</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{formattedAmount}</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleCheckout('stripe')}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Pay with Card</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

