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

  useEffect(() => {
    // Carregar tipo salvo do localStorage ou do banco
    const savedType = window.localStorage.getItem('studentProcessType') as ProcessType | null;
    if (savedType && ['initial', 'transfer', 'change_of_status'].includes(savedType)) {
      setSelectedType(savedType);
    }
  }, []);

  const handleSelect = (type: ProcessType) => {
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your visa situation?</h2>
        <p className="text-gray-600">Select the option that best describes your current status</p>
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
              onClick={() => handleSelect(option.value)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
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

