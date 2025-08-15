import React, { useState } from 'react';
import { Building2, Users, Coins } from 'lucide-react';
import UniversityProgramOptInModal from './UniversityProgramOptInModal';

const UniversityProgramOptInDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [universityChoice, setUniversityChoice] = useState<string>('');

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAccept = () => {
    setUniversityChoice('SIM - Universidade aceitou participar');
    setIsModalOpen(false);
    // Aqui você pode redirecionar para o processo de inscrição
    console.log('Universidade aceitou participar do programa');
  };

  const handleDecline = () => {
    setUniversityChoice('NÃO - Universidade não quer participar');
    setIsModalOpen(false);
    // Aqui você pode mostrar uma mensagem ou redirecionar
    console.log('Universidade não quer participar do programa');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-gradient-to-r from-[#05294E] to-[#D0151C] p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Demonstração do Programa Matricula Rewards
          </h1>
          <p className="text-xl text-slate-600">
            Veja como funciona o processo de opt-in para universidades
          </p>
        </div>

        {/* Demo Section */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            🎯 Simule a Experiência da Universidade
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-blue-900 mb-2">1. Universidade Visita</h3>
              <p className="text-sm text-blue-700">Universidade acessa a plataforma</p>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
              <Coins className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-green-900 mb-2">2. Lê Sobre o Programa</h3>
              <p className="text-sm text-green-700">Modal explica como funciona</p>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
              <Building2 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-purple-900 mb-2">3. Decide Participar</h3>
              <p className="text-sm text-purple-700">Aceita ou não os termos</p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleOpenModal}
              className="bg-gradient-to-r from-[#05294E] to-[#D0151C] text-white py-4 px-8 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-lg"
            >
              🚀 Simular "Join Program"
            </button>
          </div>
        </div>

        {/* Result Section */}
        {universityChoice && (
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
              📋 Resultado da Escolha
            </h2>
            
            <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-4">Decisão da Universidade:</h3>
              <p className="text-lg text-slate-700 font-medium">{universityChoice}</p>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setUniversityChoice('')}
                className="bg-slate-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
              >
                🔄 Resetar Demo
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            📖 Como Usar Este Componente
          </h2>
          
          <div className="space-y-4 text-slate-700">
            <div className="flex items-start space-x-3">
              <div className="bg-[#05294E] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <p>Clique no botão "Simular Join Program" para abrir o modal</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-[#05294E] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <p>Leia a explicação do programa Matricula Rewards</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-[#05294E] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <p>Escolha "SIM" para aceitar ou "NÃO" para recusar</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-[#05294E] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                4
              </div>
              <p>Veja o resultado da escolha e como integrar no seu fluxo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <UniversityProgramOptInModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
};

export default UniversityProgramOptInDemo;
