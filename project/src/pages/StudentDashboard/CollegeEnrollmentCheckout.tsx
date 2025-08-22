import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../stores/applicationStore';
import { StripeCheckout } from '../../components/StripeCheckout';

const CollegeEnrollmentCheckout: React.FC = () => {
  const { userProfile } = useAuth();
  const { cart } = useCartStore();
  const navigate = useNavigate();

  // Simulação: bolsa selecionada salva no localStorage/sessionStorage (ajuste para persistência real se necessário)
  const selectedScholarshipId = window.localStorage.getItem('selectedScholarshipId');
  const studentProcessType = window.localStorage.getItem('studentProcessType');

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.documents_status !== 'approved') {
      navigate('/student/dashboard/application-fee');
      return;
    }
    if (!selectedScholarshipId) {
      navigate('/student/dashboard/application-fee');
      return;
    }
  }, [userProfile, selectedScholarshipId, navigate]);

  if (!userProfile || userProfile.documents_status !== 'approved' || !selectedScholarshipId) {
    return null;
  }

  const selectedScholarship = cart.find(s => s.scholarships.id === selectedScholarshipId);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold mb-8 text-center text-slate-800">College Enrollment Payment</h1>
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">Selected Scholarship</h2>
        {selectedScholarship ? (
          <div className="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50 shadow">
            <div className="font-bold text-slate-900 text-lg">{selectedScholarship.scholarships.title}</div>
            <div className="text-slate-600 text-sm">{selectedScholarship.scholarships.universities?.name || selectedScholarship.scholarships.university_name || 'Unknown University'}</div>
          </div>
        ) : (
          <div className="mb-6 text-red-600 text-center">No scholarship selected.</div>
        )}
        <div className="mb-8">
          <p className="text-slate-700 text-center mb-2 font-semibold">To complete your enrollment, please pay the following fees:</p>
          <ul className="text-slate-700 text-center mb-4">
            <li>• <span className="font-bold">Application Fee:</span> $350</li>
            <li>• <span className="font-bold">Scholarship Fee:</span> $850</li>
          </ul>
        </div>
        <StripeCheckout
          productId="applicationFee"
          buttonText="Pay Now ($900)"
          className="w-full py-4"
          paymentType="enrollment_and_scholarship"
          feeType="enrollment_fee"
          scholarshipsIds={[selectedScholarshipId]}
          studentProcessType={studentProcessType}
          successUrl={`${window.location.origin}/student/dashboard/enrollment-fee-success?session_id={CHECKOUT_SESSION_ID}`}
          cancelUrl={`${window.location.origin}/student/dashboard/payment-error`}
        />
      </div>
    </div>
  );
};

export default CollegeEnrollmentCheckout; 