import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { supabase } from '../../../lib/supabase';
import { StepProps } from '../types';

export const ApplicationFeeStep: React.FC<StepProps> = ({ onNext }) => {
  const { user, userProfile, refetchUserProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(user?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicationFeeAmount = getFeeAmount('application_fee');
  const formattedAmount = applicationFeeAmount && !isNaN(applicationFeeAmount)
    ? formatFeeAmount(applicationFeeAmount)
    : '$0.00';

  const hasPaid = userProfile?.is_application_fee_paid || false;

  useEffect(() => {
    // Verificar se já pagou
    if (hasPaid) {
      // Não fazer nada, apenas mostrar o estado
    }
  }, [hasPaid]);

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

      // Buscar primeira aplicação
      const { data: applications } = await supabase
        .from('scholarship_applications')
        .select('id, scholarship_id')
        .eq('student_id', userProfile.id)
        .limit(1);

      if (!applications || applications.length === 0) {
        throw new Error('No applications found. Please select scholarships first.');
      }

      const application = applications[0];

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout-application-fee`;
      
      const requestBody = {
        application_id: application.id,
        scholarship_id: application.scholarship_id,
        amount: applicationFeeAmount,
        payment_method: paymentMethod,
        success_url: `${window.location.origin}/student/onboarding?step=scholarship_fee&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/student/onboarding?step=application_fee&payment=cancelled`,
        mode: 'payment',
        payment_type: 'application_fee',
        fee_type: 'application_fee'
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
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Fee Paid!</h3>
        <p className="text-gray-600 mb-6">You've already paid the application fee.</p>
        <button
          onClick={onNext}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pay Application Fee</h2>
        <p className="text-gray-600">Complete your application by paying the application fee</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-medium text-gray-900">Application Fee</span>
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

