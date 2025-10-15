import React, { useState, useEffect } from 'react';
import { useCartStore } from '../../stores/applicationStore';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import DocumentUploadModal from '../../components/DocumentUploadModal';
import StudentTypeModal from '../../components/StudentTypeModal';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import NotificationService from '../../services/NotificationService';

const CartPage: React.FC = () => {
  const { t } = useTranslation();
  const { cart, clearCart, fetchCart, isLoading } = useCartStore();
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showStudentTypeModal, setShowStudentTypeModal] = useState(false);
  const [studentType, setStudentType] = useState<string | null>(null);
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
          .select('id, scholarship_id')
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
            
            // Notificar universidade sobre seleção do aluno (após confirmar tipo)
            if (application.scholarship_id) {
              try {
                await notifyUniversityStudentSelection(application.scholarship_id, userProfile.id);
              } catch (notifError) {
                console.error('Erro ao notificar universidade sobre seleção:', notifError);
                // Não falha o processo se a notificação falhar
              }
            }
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



  const handleClearCart = () => {
    if (user?.id) {
      clearCart(user.id);
    }
  };

  // Função para notificar universidade sobre seleção do aluno
  const notifyUniversityStudentSelection = async (scholarshipId: string, studentProfileId: string) => {
    try {
      // Buscar dados da bolsa e universidade
      const { data: scholarship, error: scholarshipError } = await supabase
        .from('scholarships')
        .select(`
          title,
          universities!inner (
            name,
            contact
          )
        `)
        .eq('id', scholarshipId)
        .single();

      if (scholarshipError || !scholarship) {
        console.error('Erro ao buscar dados da bolsa:', scholarshipError);
        return;
      }

      // Buscar dados do aluno
      const { data: student, error: studentError } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', studentProfileId)
        .single();

      if (studentError || !student) {
        console.error('Erro ao buscar dados do aluno:', studentError);
        return;
      }

      // Preparar dados para notificação
      const universityName = scholarship.universities.name;
      const universityContact = scholarship.universities.contact || {};
      const universityEmail = universityContact.admissionsEmail || universityContact.email || '';

      if (!universityEmail) {
        console.warn('Email da universidade não encontrado para notificação');
        return;
      }

      // Criar payload e enviar notificação
      const payload = NotificationService.createUniversitySelectionPayload(
        student.full_name,
        student.email,
        universityName,
        universityEmail,
        scholarship.title
      );

      const result = await NotificationService.sendUniversityNotification(payload);
      
      if (result.success) {
        console.log('✅ Notificação de seleção enviada com sucesso');
      } else {
        console.error('❌ Erro ao enviar notificação de seleção:', result.error);
      }
    } catch (error) {
      console.error('Erro ao notificar seleção de universidade:', error);
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

    return (
      <div>
        <ul className="divide-y divide-slate-200 mb-8">
          {cart.map((item) => (
            <li key={item.scholarships.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4 w-full">
                <div>
                  <div className="font-bold text-slate-900">{item.scholarships.title}</div>
                  <div className="text-slate-600 text-sm">{item.scholarships.universities?.name || item.scholarships.university_name || 'Unknown University'}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleNextStep}
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 mb-4 disabled:bg-slate-300 next-step-button"
            data-testid="next-step-button"
          >
            {isProcessing ? t('studentDashboard.cartPage.processing') : t('studentDashboard.cartPage.nextStep')}
          </button>
        </div>
        <button
          onClick={handleClearCart}
          className="w-full bg-slate-100 text-slate-700 py-3 px-6 rounded-2xl font-medium text-sm hover:bg-slate-200 transition-all duration-300"
        >
          {t('studentDashboard.cartPage.clearCart')}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
        <GraduationCap className="h-7 w-7 text-[#05294E]" /> {t('studentDashboard.selectedScholarships.title')}
      </h1>
      
      {/* Description */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8 rounded-lg">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>{t('studentDashboard.selectedScholarships.welcomeMessage')}</strong> {t('studentDashboard.selectedScholarships.description')}
            </p>
          </div>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <h2 className="text-xl font-bold text-slate-700 mb-4">{t('studentDashboard.selectedScholarships.noScholarshipsSelected')}</h2>
          <p className="text-slate-600 mb-6">{t('studentDashboard.selectedScholarships.notSelectedYet')}</p>
          <button
            onClick={() => navigate('/student/dashboard/scholarships')}
            className="bg-[#05294E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#05294E]/90 transition-all"
          >
            {t('studentDashboard.selectedScholarships.browseScholarships')}
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