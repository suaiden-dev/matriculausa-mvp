import React, { useState } from 'react';
import { X, Users, Coins, DollarSign, CheckCircle, XCircle } from 'lucide-react';

interface UniversityProgramOptInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

const UniversityProgramOptInModal: React.FC<UniversityProgramOptInModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline
}) => {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleAccept = () => {
    setHasAccepted(true);
    onAccept();
  };

  const handleDecline = () => {
    setHasAccepted(false);
    onDecline();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-[#05294E] to-[#D0151C] p-3 rounded-xl">
              <Coins className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Como Funciona o Matricula Rewards</h2>
              <p className="text-slate-600">Programa de referência estudantil com benefícios para sua universidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            title="Fechar modal"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* How It Works Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center">
              <Users className="h-5 w-5 mr-2 text-[#05294E]" />
              Como Funciona o Programa
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Student Referral Process */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">📱 Processo de Referência</h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• Estudantes convidam outros estudantes para se registrar</li>
                  <li>• Cada convite usa um código de referência único</li>
                  <li>• Estudantes que convidam ganham <strong>Matricula Coins</strong></li>
                </ul>
              </div>

              {/* Coin System */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">🪙 Sistema de Coins</h4>
                <ul className="text-sm text-green-800 space-y-2">
                  <li>• <strong>1 Matricula Coin = $1 USD</strong></li>
                  <li>• Coins podem ser resgatados como desconto na tuition</li>
                  <li>• Estudante escolhe sua universidade para resgate</li>
                </ul>
              </div>
            </div>
          </div>

          {/* University Benefits Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-[#05294E]" />
              Como Funciona para Sua Universidade
            </h3>

            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="text-center">
                  <div className="bg-[#05294E] text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                    1
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">Estudante Solicita</h4>
                  <p className="text-sm text-slate-600">Estudante solicita desconto através da plataforma</p>
                </div>

                {/* Step 2 */}
                <div className="text-center">
                  <div className="bg-[#05294E] text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                    2
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">Universidade Aplica</h4>
                  <p className="text-sm text-slate-600">Universidade aplica o desconto na tuition</p>
                </div>

                {/* Step 3 */}
                <div className="text-center">
                  <div className="bg-[#05294E] text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                    3
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-2">MatriculaUSA Paga</h4>
                  <p className="text-sm text-slate-600">MatriculaUSA paga o valor para a universidade</p>
                </div>
              </div>

              {/* Example */}
              <div className="mt-6 bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-2">💡 Exemplo Prático</h4>
                <p className="text-sm text-slate-600">
                  <strong>Estudante solicita $50 de desconto</strong> → Universidade aplica $50 na tuition → 
                  <strong>MatriculaUSA paga $50 para a universidade</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-slate-800">✅ Benefícios para Sua Universidade</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-slate-800">Recebimento Direto</h4>
                  <p className="text-sm text-slate-600">Recebe pagamento por cada desconto aplicado</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-slate-800">Aumenta Atratividade</h4>
                  <p className="text-sm text-slate-600">Descontos disponíveis atraem mais estudantes</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-slate-800">Dashboard Dedicado</h4>
                  <p className="text-sm text-slate-600">Gerencie saldo e solicite pagamentos</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-slate-800">Processo Automatizado</h4>
                  <p className="text-sm text-slate-600">Tudo funciona de forma transparente</p>
                </div>
              </div>
            </div>
          </div>

          {/* Participation Question */}
          <div className="bg-gradient-to-r from-[#05294E] to-[#D0151C] rounded-xl p-6 text-white">
            <h3 className="text-xl font-semibold mb-4 text-center">🎯 Aceita participar do programa Matricula Rewards?</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={handleAccept}
                className="bg-white text-[#05294E] py-3 px-6 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="h-5 w-5" />
                <span>SIM, quero participar</span>
              </button>
              
              <button
                onClick={handleDecline}
                className="bg-transparent border-2 border-white text-white py-3 px-6 rounded-xl font-semibold hover:bg-white hover:text-[#05294E] transition-colors flex items-center justify-center space-x-2"
              >
                <XCircle className="h-5 w-5" />
                <span>NÃO, não quero participar</span>
              </button>
            </div>

            <p className="text-sm text-center mt-4 opacity-90">
              <strong>Importante:</strong> Se escolher "NÃO", sua universidade não aparecerá no programa e não receberá pagamentos.
              <br />
              Participação é totalmente opcional e pode ser alterada a qualquer momento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversityProgramOptInModal;
