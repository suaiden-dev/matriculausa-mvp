import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
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
      <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center md:text-left space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">Tipo de Processo</h2>
          <p className="text-lg md:text-xl text-white/60 font-medium max-w-2xl mt-2">Tipo de processo selecionado com sucesso.</p>
        </div>

        {/* Main White Container */}
        <div className="bg-white border border-emerald-500/30 ring-1 ring-emerald-500/20 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
          
          <div className="relative z-10 text-center py-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">Etapa Concluída</h3>
            <p className="text-gray-500 mb-8 font-medium">Você já selecionou seu tipo de processo e passou pela revisão. Esta etapa está completa.</p>
            <button
              onClick={onNext}
              className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 mx-auto"
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
        <h2 className="text-2xl font-bold text-white mb-2">What's your visa situation?</h2>
        <p className="text-white/70">
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
              className={`p-4 border-2 rounded-xl transition-all ${
                isLocked
                  ? 'border-white/10 bg-white/5 cursor-not-allowed opacity-40'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20 cursor-pointer transform scale-[1.02]'
                  : 'border-white/10 bg-white/10 hover:bg-white/15 hover:border-white/20 cursor-pointer'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  {isSelected ? (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 border-2 border-white/30 rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold mb-1 ${isSelected ? 'text-blue-900' : 'text-white'}`}>
                    {option.label}
                  </h3>
                  <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-white/60'}`}>
                    {option.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-white/10">
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

