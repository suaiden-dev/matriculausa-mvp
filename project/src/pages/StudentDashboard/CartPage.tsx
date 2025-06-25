import React, { useState, useEffect } from 'react';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { StripeCheckout } from '../../components/StripeCheckout';
import { useAuth } from '../../hooks/useAuth';
import DocumentUpload from '../../components/DocumentUpload';
import DocumentUploadModal from '../../components/DocumentUploadModal';
import StudentTypeModal from '../../components/StudentTypeModal';
import { supabase } from '../../lib/supabase';

const STRIPE_CHECKOUT_URL = 'https://checkout.stripe.com/pay/cs_test_YOUR_CHECKOUT_LINK'; // Substitua pelo link real do produto Stripe
const SCHOLARSHIP_PRICE = 550;

const CartPage: React.FC = () => {
  const { cart, removeFromCart, clearCart, fetchCart, isLoading } = useCartStore();
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStudentTypeModal, setShowStudentTypeModal] = useState(false);
  const [studentType, setStudentType] = useState<string | null>(null);
  const [selectedScholarship, setSelectedScholarship] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCart(user.id);
    }
  }, [user, fetchCart]);

  const total = SCHOLARSHIP_PRICE;

  const handleNextStep = () => {
    setShowStudentTypeModal(true);
  };

  const handleStudentTypeConfirm = async (type: string) => {
    setStudentType(type);
    setShowStudentTypeModal(false);
    window.localStorage.setItem('studentProcessType', type);
    // Tenta salvar no banco na aplicação ativa
    if (userProfile) {
      try {
        const { data: application, error } = await supabase
          .from('scholarship_applications')
          .select('id')
          .eq('student_id', userProfile.user_id)
          .order('applied_at', { ascending: false })
          .limit(1)
          .single();
        if (!error && application) {
          await supabase
            .from('scholarship_applications')
            .update({ student_process_type: type })
            .eq('id', application.id);
        }
      } catch (e) {
        // Se der erro, só salva no localStorage mesmo
      }
    }
    setShowUploadModal(true);
  };

  const handleUploadSuccess = async () => {
    setIsProcessing(true);
    try {
      if (userProfile) {
        await updateUserProfile({ documents_status: 'approved' });
      }
      setShowUploadModal(false);
    } catch (error) {
      console.error('Failed to update user profile:', error);
      // Optionally, show an error message to the user
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedToPayment = () => {
    if (selectedScholarship) {
      window.localStorage.setItem('selectedScholarshipId', selectedScholarship);
      navigate('/student/dashboard/college-enrollment-checkout');
    }
  };

  const handleRemoveFromCart = (scholarshipId: string) => {
    if (user) {
      removeFromCart(scholarshipId, user.id);
    }
  };

  const handleClearCart = () => {
    if (user) {
      clearCart(user.id);
    }
  };

  const renderCartContents = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      );
    }
    
    if (userProfile?.documents_status === 'approved') {
      return (
        <div>
          <h2 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2">
            <CheckCircle /> Documents Approved! Please select one scholarship to proceed.
          </h2>
          <ul className="divide-y divide-slate-200 mb-8">
            {cart.map((item) => (
              <li key={item.scholarships.id} className="flex items-center justify-between py-4">
                <label className="flex items-center gap-4 cursor-pointer w-full">
                  <input
                    type="radio"
                    name="scholarship"
                    value={item.scholarships.id}
                    checked={selectedScholarship === item.scholarships.id}
                    onChange={() => setSelectedScholarship(item.scholarships.id)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{item.scholarships.title}</div>
                    <div className="text-slate-600 text-sm">{item.scholarships.universities?.name || 'Unknown University'}</div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <StripeCheckout
              productId="APPLICATION_FEE"
              paymentType="application_fee"
              feeType="application_fee"
              scholarshipsIds={selectedScholarship ? [selectedScholarship] : []}
              buttonText="Pay Application Fee ($350)"
              successUrl={`${window.location.origin}/student/dashboard/application-fee-success?session_id={CHECKOUT_SESSION_ID}`}
              cancelUrl={`${window.location.origin}/student/dashboard/application-fee-error`}
              disabled={!selectedScholarship}
              metadata={{ application_id: selectedScholarship }}
              edgeFunction="stripe-checkout-application-fee"
            />
          </div>
        </div>
      );
    }

    return (
      <div>
        <ul className="divide-y divide-slate-200 mb-8">
          {cart.map((item) => (
            <li key={item.scholarships.id} className="flex items-center justify-between py-4">
              <label className="flex items-center gap-4 cursor-pointer w-full">
                <input
                  type="radio"
                  name="scholarship"
                  value={item.scholarships.id}
                  checked={selectedScholarship === item.scholarships.id}
                  onChange={() => setSelectedScholarship(item.scholarships.id)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-full"
                />
                <div>
                  <div className="font-bold text-slate-900">{item.scholarships.title}</div>
                  <div className="text-slate-600 text-sm">{item.scholarships.universities?.name || 'Unknown University'}</div>
                </div>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleNextStep}
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 mb-4 disabled:bg-slate-300"
          >
            {isProcessing ? 'Processing...' : 'Next Step'}
          </button>
        </div>
        <button
          onClick={handleClearCart}
          className="w-full bg-slate-100 text-slate-700 py-3 px-6 rounded-2xl font-medium text-sm hover:bg-slate-200 transition-all duration-300"
        >
          Clear Cart
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <ShoppingCart className="h-7 w-7 text-[#05294E]" /> Cart
      </h1>
      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <h2 className="text-xl font-bold text-slate-700 mb-4">Your cart is empty</h2>
          <button
            onClick={() => navigate('/student/dashboard/scholarships')}
            className="bg-[#05294E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#05294E]/90 transition-all"
          >
            Browse Scholarships
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {renderCartContents()}
        </div>
      )}
      {showStudentTypeModal && (
        <StudentTypeModal
          onConfirm={handleStudentTypeConfirm}
          onClose={() => setShowStudentTypeModal(false)}
        />
      )}
      {showUploadModal && (
        <DocumentUploadModal
          onSuccess={handleUploadSuccess}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
};

export default CartPage; 