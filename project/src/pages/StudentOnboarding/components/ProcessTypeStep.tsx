import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { StepProps, ProcessType } from '../types';

export const ProcessTypeStep: React.FC<StepProps> = ({ onNext }) => {
  const { user, userProfile } = useAuth();
  const [selectedType, setSelectedType] = useState<ProcessType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // Carregar tipo salvo do localStorage ou do banco
    const savedType = window.localStorage.getItem('studentProcessType') as ProcessType | null;
    if (savedType && ['initial', 'transfer', 'change_of_status'].includes(savedType)) {
      setSelectedType(savedType);
    }
  }, []);

  // Verificar se já passou pela review (tem documentos enviados)
  useEffect(() => {
    const checkIfLocked = async () => {
      if (!userProfile?.id) return;
      
      try {
        // Se já tem documentos enviados, significa que já passou pela review
        const documentsUploaded = userProfile.documents_uploaded || false;
        setIsLocked(documentsUploaded);
      } catch (error) {
        console.error('Error checking if locked:', error);
      }
    };
    
    checkIfLocked();
  }, [userProfile?.id, userProfile?.documents_uploaded]);

  const handleSelect = (type: ProcessType) => {
    if (isLocked) {
      setError('Você já passou pela revisão. Não é possível alterar o tipo de processo.');
      return;
    }
    setSelectedType(type);
    setError(null);
  };

  const handleContinue = async () => {
    if (!selectedType) {
      setError('Please select a process type');
      return;
    }

    if (!user?.id || !userProfile?.id) {
      setError('User not authenticated');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Salvar no localStorage
      window.localStorage.setItem('studentProcessType', selectedType);

      // Atualizar aplicações existentes
      const { data: applications } = await supabase
        .from('scholarship_applications')
        .select('id')
        .eq('student_id', userProfile.id);

      if (applications && applications.length > 0) {
        const { error: updateError } = await supabase
          .from('scholarship_applications')
          .update({ student_process_type: selectedType })
          .eq('student_id', userProfile.id);

        if (updateError) {
          console.error('Error updating process type:', updateError);
          // Não falhar se houver erro - continuar mesmo assim
        }
      }

      onNext();
    } catch (err: any) {
      console.error('Error saving process type:', err);
      setError('Error saving selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const options: { value: ProcessType; label: string; description: string }[] = [
    {
      value: 'initial',
      label: "I've never had an F-1 visa (Initial)",
      description: 'This is your first time applying for an F-1 student visa'
    },
    {
      value: 'transfer',
      label: 'I currently have an F-1 visa (Transfer)',
      description: 'You are transferring from another U.S. school'
    },
    {
      value: 'change_of_status',
      label: 'I have a different visa type (Change of Status)',
      description: 'You are changing from another visa type (B-2, H-1B, etc.) to F-1'
    }
  ];

  // Se já passou pela review, mostrar tela de etapa concluída
  if (isLocked) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl p-8 sm:p-12 border-2 border-green-200 shadow-sm">
          <div className="text-center">
            <div className="mb-6">
              <CheckCircle className="w-20 h-20 text-green-600 mx-auto" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Etapa Concluída
            </h2>
            <p className="text-base sm:text-lg text-gray-700 mb-6">
              Você já selecionou seu tipo de processo e passou pela revisão. Esta etapa está completa.
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your visa situation?</h2>
        <p className="text-gray-600">
          Select the option that best describes your current status
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedType === option.value;

          return (
            <div
              key={option.value}
              onClick={() => !isLocked && handleSelect(option.value)}
              className={`p-4 border-2 rounded-lg transition-all ${
                isLocked
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : isSelected
                  ? 'border-blue-600 bg-blue-50 cursor-pointer'
                  : 'border-gray-200 hover:border-gray-300 cursor-pointer'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  {isSelected ? (
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  ) : (
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{option.label}</h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t">
        <button
          onClick={handleContinue}
          disabled={!selectedType || saving}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Continue</span>
          )}
        </button>
      </div>
    </div>
  );
};

