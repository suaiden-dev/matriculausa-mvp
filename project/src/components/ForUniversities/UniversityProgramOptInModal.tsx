import React, { useState } from 'react';
import { X, Coins, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UniversityProgramOptInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  universityId?: string; // ID da universidade para salvar a escolha
}

const UniversityProgramOptInModal: React.FC<UniversityProgramOptInModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  universityId
}) => {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (universityId) {
      try {
        // Salvar que a universidade aceitou participar
        const { error } = await supabase
          .from('universities')
          .update({ 
            participates_in_matricula_rewards: true,
            matricula_rewards_opted_in_at: new Date().toISOString()
          })
          .eq('id', universityId);

        if (error) {
          console.error('Erro ao salvar aceitação:', error);
        }
      } catch (error) {
        console.error('Erro ao salvar aceitação:', error);
      }
    }
    
    setHasAccepted(true);
    onAccept();
    // Recarregar a página automaticamente
    window.location.reload();
  };

  const handleDecline = async () => {
    if (universityId) {
      try {
        // Salvar que a universidade não aceitou participar
        const { error } = await supabase
          .from('universities')
          .update({ 
            participates_in_matricula_rewards: false,
            matricula_rewards_opted_in_at: new Date().toISOString()
          })
          .eq('id', universityId);

        if (error) {
          console.error('Erro ao salvar recusa:', error);
        }
      } catch (error) {
        console.error('Erro ao salvar recusa:', error);
      }
    }
    
    setHasAccepted(false);
    onDecline();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#05294E] to-[#0B4A8F] text-white p-8 rounded-t-2xl text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Close modal"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coins className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Matricula Rewards Program</h2>
          <p className="text-blue-100">
            Accept to participate and transform your university
          </p>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Does your university want to participate in the Matricula Rewards program?
          </h3>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            By accepting, your university will appear to students who want to redeem tuition discounts. 
            You will receive direct payment for each discount applied.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
            <p className="text-blue-800 text-sm">
              <strong>Student requests discount</strong> → University applies discount to tuition → 
              <strong>MatriculaUSA pays the university</strong>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 p-8 rounded-b-2xl">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleAccept}
              className="flex items-center justify-center space-x-3 px-8 py-4 bg-[#05294E] text-white font-semibold rounded-xl hover:bg-[#05294E]/90 transition-colors"
            >
              <CheckCircle className="h-5 w-5" />
              <span>YES, I ACCEPT TO PARTICIPATE</span>
            </button>
            <button
              onClick={handleDecline}
              className="flex items-center justify-center space-x-3 px-8 py-4 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 transition-colors"
            >
              <XCircle className="h-5 w-5" />
              <span>NO, I DO NOT ACCEPT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversityProgramOptInModal;
