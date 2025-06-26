import React, { useState, useEffect } from 'react';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Trash2, CheckCircle, Loader2, Clock, XCircle, FileText } from 'lucide-react';
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
        const { data: applications, error } = await supabase
          .from('scholarship_applications')
          .select('id')
          .eq('student_id', userProfile.user_id)
          .order('applied_at', { ascending: false })
          .limit(1);
        
        if (!error && applications && applications.length > 0) {
          const application = applications[0];
          await supabase
            .from('scholarship_applications')
            .update({ student_process_type: type })
            .eq('id', application.id);
        }
      } catch (e) {
        // Se der erro, só salva no localStorage mesmo
      }
    }
    // Redireciona para a página de upload de documentos
    navigate('/student/dashboard/documents-and-scholarship-choice');
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

  const createOrGetApplication = async (): Promise<{ applicationId: string } | undefined> => {
    if (!selectedScholarship || !user) {
      throw new Error('Scholarship e usuário são obrigatórios');
    }

    try {
      // Busca aplicação existente
      const { data: existingApp, error: findError } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', user.id)
        .eq('scholarship_id', selectedScholarship)
        .maybeSingle();

      if (findError) {
        console.error('Erro ao buscar aplicação existente:', findError);
        throw new Error('Erro ao buscar aplicação existente');
      }

      if (existingApp) {
        return { applicationId: existingApp.id };
      }

      // Cria nova aplicação
      const { data: newApp, error: insertError } = await supabase
        .from('scholarship_applications')
        .insert([
          {
            student_id: user.id,
            scholarship_id: selectedScholarship,
            status: 'pending',
            student_process_type: studentType || null,
          },
        ])
        .select('id')
        .single();

      if (insertError || !newApp) {
        console.error('Erro ao criar aplicação:', insertError);
        throw new Error('Erro ao criar aplicação');
      }

      return { applicationId: newApp.id };
    } catch (error) {
      console.error('Erro em createOrGetApplication:', error);
      throw error;
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
    
    // Se documentos foram aprovados, mostrar opção de pagamento
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
              beforeCheckout={createOrGetApplication}
              metadata={{ selected_scholarship_id: selectedScholarship }}
            />
          </div>
        </div>
      );
    }

    // Se documentos estão sendo analisados
    if (userProfile?.documents_status === 'analyzing') {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Documents Under Review</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Your documents are currently being reviewed by our team. You'll be able to proceed with payment once they are approved.
          </p>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              💡 <strong>Review typically takes 1-2 business days.</strong> We'll notify you by email once your documents are approved.
            </p>
          </div>
        </div>
      );
    }

    // Se documentos foram rejeitados
    if (userProfile?.documents_status === 'rejected') {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">Documents Need Revision</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Some of your documents need to be updated. Please upload new versions and we'll review them again.
          </p>
          <button
            onClick={handleNextStep}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all duration-300"
          >
            Upload New Documents
          </button>
        </div>
      );
    }

    // Se ainda não fez upload de documentos (ou status é pending/null)
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileText className="h-10 w-10 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">Upload Required Documents</h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          Before you can pay the application fee, you need to upload your required documents for review.
        </p>
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-6">
          <h4 className="font-bold text-blue-900 mb-3">Required Documents:</h4>
          <ul className="text-sm text-blue-800 space-y-1 text-left max-w-xs mx-auto">
            <li>• Valid Passport</li>
            <li>• Academic Diploma/Transcript</li>
            <li>• Proof of Financial Funds</li>
          </ul>
        </div>
        <button
          onClick={handleNextStep}
          disabled={isProcessing}
          className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 disabled:bg-slate-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isProcessing ? 'Processing...' : 'Upload Documents Now'}
        </button>
        <div className="mt-6">
          <button
            onClick={handleClearCart}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
          >
            Clear Cart
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <GraduationCap className="h-7 w-7 text-[#05294E]" /> Cart
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