import React, { useState } from 'react';
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

  const createOrGetApplication = async (): Promise<{ applicationId: string } | undefined> => {
    if (!selectedScholarshipId || !userProfile?.id) {
      console.error('Missing selectedScholarshipId or userProfile.id');
      return undefined;
    }

    try {
      // Verifica se já existe aplicação
      const { data: existing, error: fetchError } = await supabase
        .from('scholarship_applications')
        .select('id')
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

      // Cria nova aplicação
      const { data, error } = await supabase
        .from('scholarship_applications')
        .insert({
          student_id: userProfile.id,
          scholarship_id: selectedScholarshipId,
          status: 'pending',
          applied_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating application:', error);
        throw error;
      }

      console.log('New application created:', data.id);
      return { applicationId: data.id };
    } catch (error) {
      console.error('Error in createOrGetApplication:', error);
      return undefined;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-green-800 font-semibold text-center animate-fade-in flex items-center justify-center gap-2">
        <CheckCircle className="h-6 w-6 text-green-600" />
        Documents approved! Please select one scholarship to proceed.
      </div>
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">Select Your Scholarship</h2>
        <p className="text-slate-600 text-center mb-4">Choose one scholarship to continue your application process.</p>
        <ul className="mb-6 space-y-4">
          {cart.map((item) => (
            <li key={item.scholarships.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${selectedScholarshipId === item.scholarships.id ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-200 bg-slate-50'}`}>
              <div>
                <div className="font-bold text-slate-900 text-lg">{item.scholarships.title}</div>
                <div className="text-slate-600 text-sm">{item.scholarships.universities?.name || 'Unknown University'}</div>
              </div>
              <button
                onClick={() => setSelectedScholarshipId(item.scholarships.id)}
                className={`px-5 py-2 rounded-xl font-bold transition-all duration-200 ${selectedScholarshipId === item.scholarships.id ? 'bg-blue-600 text-white shadow' : 'bg-slate-200 text-slate-700 hover:bg-blue-100'}`}
              >
                {selectedScholarshipId === item.scholarships.id ? 'Selected' : 'Select'}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <StripeCheckout
            productId="APPLICATION_FEE"
            paymentType="application_fee"
            feeType="application_fee"
            buttonText="Pay Application Fee ($350)"
            successUrl={`${window.location.origin}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`}
            cancelUrl={`${window.location.origin}/student/dashboard/application-fee-error`}
            disabled={!selectedScholarshipId}
            beforeCheckout={createOrGetApplication}
            metadata={{ selected_scholarship_id: selectedScholarshipId }}
          />
        </div>
      </div>
    </div>
  );
};

export default ApplicationFeePage; 