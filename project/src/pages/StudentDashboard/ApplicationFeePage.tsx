import React, { useState, useEffect } from 'react';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { StripeCheckout } from '../../components/StripeCheckout';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

const ApplicationFeePage: React.FC = () => {
  const { cart, clearCart } = useCartStore();
  const [selectedScholarshipId, setSelectedScholarshipId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  // Auto-selecionar primeira bolsa se apenas uma disponível
  useEffect(() => {
    if (cart.length === 1 && !selectedScholarshipId) {
      setSelectedScholarshipId(cart[0].scholarships.id);
    }
  }, [cart, selectedScholarshipId]);

  const createOrGetApplication = async (): Promise<{ applicationId: string } | undefined> => {
    if (!selectedScholarshipId || !userProfile?.id) {
      console.error('Missing selectedScholarshipId or userProfile.id');
      return undefined;
    }

    try {
      // Verifica se já existe aplicação
      const { data: existing, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('id, student_process_type')
        .eq('student_id', userProfile.id)
        .eq('scholarship_id', selectedScholarshipId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching existing application:', fetchError);
        throw fetchError;
      }

      if (existing) {
        console.log('Application already exists:', existing.id);
        return { applicationId: existing.id };
      }

      // Obter student_process_type do localStorage
      const studentProcessType = localStorage.getItem('studentProcessType');

      // Cria nova aplicação
      const { data, error } = await supabase
        .from('scholarship_applications')
        .insert({
          student_id: userProfile.id,
          scholarship_id: selectedScholarshipId,
          status: 'pending',
          applied_at: new Date().toISOString(),
          student_process_type: studentProcessType || null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating application:', error);
        throw error;
      }

      console.log('New application created:', data.id, 'with student_process_type:', studentProcessType);
      return { applicationId: data.id };
    } catch (error) {
      console.error('Error in createOrGetApplication:', error);
      return undefined;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-green-800 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-3">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <h1 className="text-2xl font-bold text-green-700">Congratulations!</h1>
        </div>
        <p className="text-green-700 font-medium leading-relaxed">
          You have been <strong>accepted</strong> to these amazing universities! 🎉<br/>
          {cart.length === 1 ? (
            <>Please proceed with your application to continue with your application process and secure your spot at your chosen institution.</>
          ) : (
            <>Please select <strong>one scholarship</strong> below to continue with your application process and secure your spot at your chosen institution.</>
          )}
        </p>
      </div>
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">
          {cart.length === 1 ? 'Your Selected Scholarship' : 'Select Your Scholarship'}
        </h2>
        {cart.length > 1 && (
          <p className="text-slate-600 text-center mb-4">Choose one scholarship to continue your application process.</p>
        )}
        <ul className="mb-6 space-y-4">
          {cart.map((item) => (
            <li 
              key={item.scholarships.id} 
              className={`p-4 rounded-xl border transition-all duration-200 ${
                selectedScholarshipId === item.scholarships.id 
                  ? 'border-blue-600 bg-blue-50 shadow-lg' 
                  : 'border-slate-200 bg-slate-50'
              } ${cart.length > 1 ? 'cursor-pointer' : ''}`}
              onClick={() => cart.length > 1 && setSelectedScholarshipId(item.scholarships.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-lg">{item.scholarships.title}</div>
                  <div className="text-slate-600 text-sm">{item.scholarships.universities?.name || 'Unknown University'}</div>
                </div>
                {cart.length > 1 ? (
                  <button
                    onClick={() => setSelectedScholarshipId(item.scholarships.id)}
                    className={`px-5 py-2 rounded-xl font-bold transition-all duration-200 ${
                      selectedScholarshipId === item.scholarships.id 
                        ? 'bg-blue-600 text-white shadow' 
                        : 'bg-slate-200 text-slate-700 hover:bg-blue-100'
                    }`}
                  >
                    {selectedScholarshipId === item.scholarships.id ? 'Selected' : 'Select'}
                  </button>
                ) : (
                  <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-600 text-white">
                    Selected
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <StripeCheckout
            productId="applicationFee"
            paymentType="application_fee"
            feeType="application_fee"
            buttonText="Pay Application Fee ($350)"
            successUrl={`${window.location.origin}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`}
            cancelUrl={`${window.location.origin}/student/dashboard/application-fee-error`}
            disabled={!selectedScholarshipId}
            beforeCheckout={createOrGetApplication}
            metadata={{ 
              selected_scholarship_id: selectedScholarshipId,
              student_process_type: localStorage.getItem('studentProcessType') || null,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ApplicationFeePage; 