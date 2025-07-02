import React, { useState, useEffect } from 'react';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { StripeCheckout } from '../../components/StripeCheckout';
import { useAuth } from '../../hooks/useAuth';
import DocumentUpload from '../../components/DocumentUpload';
import DocumentUploadModal from '../../components/DocumentUploadModal';
import StudentTypeModal from '../../components/StudentTypeModal';
import { supabase } from '../../lib/supabase';

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
    if (user?.id) {
      fetchCart(user.id);
    }
  }, [user?.id, fetchCart]);

  // Carregar studentType do localStorage na inicialização
  useEffect(() => {
    const savedStudentType = window.localStorage.getItem('studentProcessType');
    if (savedStudentType) {
      setStudentType(savedStudentType);
    }
  }, []);

  // Auto-selecionar primeira bolsa se documentos aprovados e apenas uma bolsa
  useEffect(() => {
    if (userProfile?.documents_status === 'approved' && cart.length === 1 && !selectedScholarship) {
      setSelectedScholarship(cart[0].scholarships.id);
    }
  }, [userProfile?.documents_status, cart, selectedScholarship]);

  const total = SCHOLARSHIP_PRICE;

  const handleNextStep = () => {
    setShowStudentTypeModal(true);
  };

  const handleStudentTypeConfirm = async (type: string) => {
    setStudentType(type);
    setShowStudentTypeModal(false);
    window.localStorage.setItem('studentProcessType', type);
    // Salvar no banco se houver aplicação ativa
    if (userProfile?.id) {
      try {
        const { data: applications, error } = await supabase
          .from('scholarship_applications')
          .select('id')
          .eq('student_id', userProfile.id)
          .order('applied_at', { ascending: false })
          .limit(1);
        
        if (!error && applications && applications.length > 0) {
          const application = applications[0];
          const { error: updateError } = await supabase
            .from('scholarship_applications')
            .update({ student_process_type: type })
            .eq('id', application.id);
          
          if (updateError) {
            console.error('Error updating student_process_type in cart:', updateError);
          } else {
            console.log('student_process_type saved in cart:', type);
          }
        }
      } catch (e) {
        console.error('Error saving student type in cart:', e);
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
    if (user?.id) {
      removeFromCart(scholarshipId, user.id);
    }
  };

  const handleClearCart = () => {
    if (user?.id) {
      clearCart(user.id);
    }
  };

  const createOrGetApplication = async (): Promise<{ applicationId: string } | undefined> => {
    if (!selectedScholarship || !user?.id || !userProfile?.id) {
      throw new Error('Scholarship, usuário e perfil são obrigatórios');
    }

    try {
      // Busca aplicação existente usando userProfile.id (correto)
      const { data: existingApp, error: findError } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', userProfile.id)
        .eq('scholarship_id', selectedScholarship)
        .maybeSingle();

      if (findError) {
        console.error('Erro ao buscar aplicação existente:', findError);
        throw new Error('Erro ao buscar aplicação existente');
      }

      if (existingApp) {
        return { applicationId: existingApp.id };
      }

      // Cria nova aplicação usando userProfile.id (correto)
      const { data: newApp, error: insertError } = await supabase
        .from('scholarship_applications')
        .insert([
          {
            student_id: userProfile.id,
            scholarship_id: selectedScholarship,
            status: 'pending',
            student_process_type: studentType || window.localStorage.getItem('studentProcessType') || null,
            applied_at: new Date().toISOString(),
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
    
    if (userProfile?.documents_status === 'approved') {
      return (
        <div>
          <h2 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2">
            <CheckCircle /> Documents Approved! Ready to proceed with payment.
          </h2>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-green-700 font-medium">
              Congratulations! Your documents have been approved. 
              {cart.length === 1 
                ? ' Your scholarship has been automatically selected for payment.'
                : ' Please select one scholarship below to proceed with the application fee payment.'
              }
            </p>
          </div>
          <ul className="space-y-4 mb-8">
            {cart.map((item) => (
              <li 
                key={item.scholarships.id} 
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  selectedScholarship === item.scholarships.id 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-slate-200 bg-slate-50'
                } ${cart.length > 1 ? 'cursor-pointer' : ''}`}
                onClick={() => cart.length > 1 && setSelectedScholarship(item.scholarships.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-lg">{item.scholarships.title}</div>
                    <div className="text-slate-600 text-sm">{item.scholarships.universities?.name || 'Unknown University'}</div>
                  </div>
                  {cart.length > 1 && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedScholarship === item.scholarships.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {selectedScholarship === item.scholarships.id ? 'Selected' : 'Select'}
                    </div>
                  )}
                  {cart.length === 1 && (
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

    return (
      <div>
        <ul className="divide-y divide-slate-200 mb-8">
          {cart.map((item) => (
            <li key={item.scholarships.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4 w-full">
                <div>
                  <div className="font-bold text-slate-900">{item.scholarships.title}</div>
                  <div className="text-slate-600 text-sm">{item.scholarships.universities?.name || 'Unknown University'}</div>
                </div>
              </div>
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
      <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
        <GraduationCap className="h-7 w-7 text-[#05294E]" /> Selected Scholarships
      </h1>
      
      {/* Description */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8 rounded-lg">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Welcome to your scholarship selection!</strong> Here you can see all the scholarships you have selected for the application process. These are the programs you are interested in applying to. Follow the steps below to complete your application and start your journey toward studying abroad.
            </p>
          </div>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <h2 className="text-xl font-bold text-slate-700 mb-4">No scholarships selected</h2>
          <p className="text-slate-600 mb-6">You haven't selected any scholarships yet. Browse our available programs and add them to your selection.</p>
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