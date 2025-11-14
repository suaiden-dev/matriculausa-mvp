import React, { useState, useEffect, useMemo } from 'react';
import { useCartStore } from '../../../stores/applicationStore';
import { GraduationCap, Loader2, AlertTriangle, X, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { is3800ScholarshipBlocked, is3800Scholarship } from '../../../utils/scholarshipDeadlineValidation';
import { StepProps } from '../types';
import { formatAmount } from '../../../utils/scholarshipHelpers';
import { supabase } from '../../../lib/supabase';

export const ScholarshipReviewStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const { t } = useTranslation();
  const { cart, removeFromCart, fetchCart, isLoading } = useCartStore();
  const { user, userProfile } = useAuth();
  const [removingScholarshipId, setRemovingScholarshipId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchCart(user.id);
    }
  }, [user?.id, fetchCart]);

  // Verificar se já passou pela review (tem process type selecionado)
  useEffect(() => {
    const checkIfLocked = async () => {
      if (!userProfile?.id) return;
      
      try {
        // Verificar se há aplicações com process type (indica que já passou pela review)
        const { data: applications } = await supabase
          .from('scholarship_applications')
          .select('student_process_type')
          .eq('student_id', userProfile.id)
          .limit(1);
        
        const hasProcessType = applications && applications.length > 0 && !!applications[0].student_process_type;
        const hasProcessTypeInLocalStorage = !!window.localStorage.getItem('studentProcessType');
        
        setIsLocked(hasProcessType || hasProcessTypeInLocalStorage);
      } catch (error) {
        console.error('Error checking if locked:', error);
      }
    };
    
    checkIfLocked();
  }, [userProfile?.id]);

  // Verificar se há bolsas bloqueadas no carrinho
  const hasBlockedScholarships = useMemo(() => {
    return cart.some(item => {
      const scholarship = item.scholarships;
      // Verificar se está inativa ou se é bolsa de $3800 bloqueada
      return !scholarship.is_active || is3800ScholarshipBlocked(scholarship);
    });
  }, [cart]);

  const handleRemoveScholarship = async (scholarshipId: string) => {
    if (!user?.id || removingScholarshipId) return;
    
    setRemovingScholarshipId(scholarshipId);
    try {
      await removeFromCart(scholarshipId, user.id);
    } catch (error) {
      console.error('Error removing scholarship from cart:', error);
    } finally {
      setRemovingScholarshipId(null);
    }
  };

  const handleContinue = () => {
    // Validar se há bolsas bloqueadas antes de prosseguir
    const blockedScholarship = cart.find(item => {
      const scholarship = item.scholarships;
      return !scholarship.is_active || is3800ScholarshipBlocked(scholarship);
    });

    if (blockedScholarship) {
      // Não mostrar alert do navegador - o botão já está desabilitado e a mensagem visual já aparece
      return;
    }

    // Apenas avançar para a próxima step (process_type) - NÃO abrir modal
    onNext();
  };

  const renderCartContents = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      );
    }

    if (cart.length === 0) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <h2 className="text-xl font-bold text-slate-700 mb-4">
            {t('studentDashboard.selectedScholarships.noScholarshipsSelected') || 'No Scholarships Selected'}
          </h2>
          <p className="text-slate-600 mb-6">
            {t('studentDashboard.selectedScholarships.notSelectedYet') || 'You haven\'t selected any scholarships yet.'}
          </p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            {t('studentDashboard.selectedScholarships.browseScholarships') || 'Go Back to Select Scholarships'}
          </button>
        </div>
      );
    }

    return (
      <div>
        <ul className="divide-y divide-slate-200 mb-8">
          {cart.map((item) => {
            const scholarship = item.scholarships;
            const isBlocked = !scholarship.is_active || is3800ScholarshipBlocked(scholarship);
            const isRemoving = removingScholarshipId === scholarship.id;
            
            return (
              <li key={scholarship.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 mb-1">{scholarship.title}</div>
                        <div className="text-slate-600 text-sm mb-2">
                          {scholarship.universities?.name || scholarship.university_name || 'Unknown University'}
                        </div>
                        <div className="text-sm font-semibold text-green-700">
                          ${formatAmount(scholarship.annual_value_with_scholarship || scholarship.amount || 'N/A')}
                        </div>
                      </div>
                      {!isRemoving && !isBlocked && (
                        <button
                          onClick={() => handleRemoveScholarship(scholarship.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title={t('studentDashboard.cartPage.removeFromCart') || 'Remove from selection'}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {hasBlockedScholarships && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 mb-1">
                  {t('studentDashboard.cartPage.cannotProceed') || 'Cannot proceed'}
                </p>
                <p className="text-xs text-amber-700">
                  {t('studentDashboard.cartPage.removeBlockedScholarships') || 'Please remove expired or unavailable scholarships to continue.'}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={handleContinue}
            disabled={isLoading || hasBlockedScholarships || cart.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 mb-4 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <span>Continue</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  // Se já passou pela review, mostrar tela de etapa concluída
  if (isLocked) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-4">
          <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl p-8 sm:p-12 border-2 border-green-200 shadow-sm">
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle className="w-20 h-20 text-green-600 mx-auto" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                Etapa Concluída
              </h2>
              <p className="text-base sm:text-lg text-gray-700 mb-6">
                Você já revisou suas bolsas selecionadas e passou para a próxima etapa. Esta etapa está completa.
              </p>
              <button
                onClick={onNext}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-[#05294E]" />
          <span>{t('studentDashboard.selectedScholarships.title') || 'Review Your Selected Scholarships'}</span>
        </h1>
        
        {/* Description */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-lg">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-semibold text-amber-900 mb-1">
                Important: This is an irreversible step
              </p>
              <p className="text-sm text-amber-800">
                Please carefully review your selected scholarships below. Once you click "Continue", you will not be able to go back to select different scholarships. Make sure these are the scholarships you want to apply for.
              </p>
            </div>
          </div>
        </div>

        {/* Cart Contents */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          {renderCartContents()}
        </div>
      </div>
    </div>
  );
};

