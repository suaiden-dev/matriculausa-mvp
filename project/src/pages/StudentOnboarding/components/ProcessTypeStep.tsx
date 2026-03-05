import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Plane, ArrowRightLeft, FileSpreadsheet } from 'lucide-react';
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
    if (!userProfile?.id) return;
    
    // Carregar tipo salvo do localStorage ou do banco
    const userKey = `studentProcessType_${userProfile.id}`;
    const savedType = (window.localStorage.getItem(userKey) || window.localStorage.getItem('studentProcessType')) as ProcessType | null;
    
    if (savedType && ['initial', 'transfer', 'change_of_status'].includes(savedType)) {
      setSelectedType(savedType);
    }
  }, [userProfile?.id]);

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
      // Salvar no localStorage (escopado e global para compatibilidade)
      const userKey = `studentProcessType_${userProfile.id}`;
      window.localStorage.setItem(userKey, selectedType);
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



  // Se já passou pela review, mostrar tela de etapa concluída
  if (isLocked) {
    return (
      <div className="space-y-10 pb-12 max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-left space-y-4">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Tipo de Processo</h2>
          <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mt-2">Tipo de processo selecionado com sucesso.</p>
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
    <div className="space-y-10 pb-12 max-w-5xl mx-auto px-4">
      {/* Header */}
      <div className="text-left space-y-4">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
          Situação do Visto
        </h2>
        <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl leading-relaxed">
          Selecione a opção que melhor descreve sua situação atual em relação ao visto americano.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-200">
           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
           <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Main White Container */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative p-6 md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10 space-y-8">
          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-6">
            {[
              {
                value: 'initial',
                label: "Primeiro Visto F-1 (Inicial)",
                description: 'Você nunca teve um visto de estudante F-1 ou está aplicando pela primeira vez.',
                icon: Plane
              },
              {
                value: 'transfer',
                label: "Transferência de Visto F-1",
                description: 'Você já possui um visto F-1 ativo e deseja se transferir de outra escola nos EUA.',
                icon: ArrowRightLeft
              },
              {
                value: 'change_of_status',
                label: "Mudança de Status (Change of Status)",
                description: 'Você possui outro tipo de visto (B-2, H-1B, etc.) e deseja alterar para F-1.',
                icon: FileSpreadsheet
              }
            ].map((option) => {
              const isSelected = selectedType === option.value;
              const OptionIcon = option.icon;

              return (
                <div
                  key={option.value}
                  onClick={() => !isLocked && handleSelect(option.value as ProcessType)}
                  className={`group relative p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-300 cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-500/30 scale-[1.02]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-blue-200 hover:scale-[1.01]'
                  } ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                  {/* Background Glow for Selected */}
                  {isSelected && (
                     <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                  )}

                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-8">
                    {/* Icon Box */}
                    <div className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      isSelected 
                        ? 'bg-white text-blue-600 shadow-xl rotate-3' 
                        : 'bg-white text-slate-400 shadow-sm border border-slate-100 group-hover:text-blue-600 group-hover:scale-110'
                    }`}>
                      <OptionIcon className={`w-7 h-7 md:w-10 md:h-10 ${isSelected ? 'scale-110' : ''} transition-transform duration-300`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <h3 className={`text-base md:text-xl font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {option.label}
                      </h3>
                      <p className={`text-sm md:text-base font-medium leading-relaxed ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {option.description}
                      </p>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="pt-8 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!selectedType || saving || isLocked}
              className="group relative w-full sm:w-auto px-10 py-4 md:py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
            <div className="flex items-center justify-center gap-3 relative z-10">
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span>Continuar</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

