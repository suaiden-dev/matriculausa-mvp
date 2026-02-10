import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { StepProps } from '../types';
import { Search, FileText, ArrowUpRight, GraduationCap, DollarSign } from 'lucide-react';

export const WelcomeStep: React.FC<StepProps> = ({ onNext }) => {
  const { userProfile } = useAuth();

  const processSteps = [
    {
      id: 1,
      title: 'Taxa de Seleção',
      subtitle: 'Iniciando sua jornada',
      description: 'Pague a taxa para desbloquear a plataforma e começar a selecionar bolsas.',
      icon: Search,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      completed: true
    },
    {
      id: 2,
      title: 'Seleção de Bolsas',
      subtitle: 'Escolhendo oportunidades',
      description: 'Escolha as universidades e bolsas que combinam com seus objetivos.',
      icon: GraduationCap,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10',
      completed: true
    },
    {
      id: 3,
      title: 'Documentos e Aprovação',
      subtitle: 'Finalizando sua aplicação',
      description: 'Envie seus documentos e acompanhe o status de aprovação.',
      icon: FileText,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      completed: false
    },
    {
      id: 4,
      title: 'Taxas Adicionais',
      subtitle: 'Taxas de aplicação',
      description: 'Pagamento das taxas de Matrícula, Bolsa e Controle I-20.',
      fees: [
        'Taxa de Matrícula',
        'Taxa de Bolsa',
        'Taxa de Controle I-20'
      ],
      icon: DollarSign,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      completed: false
    }
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative py-8 md:py-12">
      <div className="w-full max-w-7xl mx-auto px-4 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-12 md:mb-20">
          <h1 className="text-4xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter leading-tight">
            Bem-vindo{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}!
          </h1>
          
          <p className="text-lg md:text-2xl text-white/60 max-w-3xl mx-auto font-medium">
            Comece seu processo de seleção aqui e siga os passos para completar sua candidatura às universidades americanas.
          </p>
        </div>

        {/* Process Steps Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 md:mb-24">
          {processSteps.map((step) => {
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="group relative">
                {/* Background Glow on Hover */}
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 rounded-[2.5rem] transition-all duration-500 blur-xl px-4 py-8" />
                
                <div className="relative bg-white border border-gray-100 rounded-[2rem] p-8 h-full transition-all duration-500 group-hover:translate-y-[-8px] group-hover:bg-gray-50 shadow-2xl overflow-hidden">
                  {/* Decorative Gradient Blob */}
                  <div className={`absolute -top-10 -right-10 w-32 h-32 ${step.iconBg} rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity`} />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    {/* Icon */}
                    <div className="mb-6">
                      <div className={`w-14 h-14 rounded-2xl ${step.iconBg} flex items-center justify-center border border-gray-100 shadow-inner`}>
                        <Icon className={`w-7 h-7 ${step.iconColor.replace('-400', '-500')}`} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                      {step.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                      {step.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-sm md:text-base text-gray-600 mb-6 leading-relaxed font-medium">
                      {step.description}
                    </p>

                    {/* Fees Information */}
                    {step.fees && (
                      <div className="mt-auto pt-6 border-t border-gray-100">
                        <ul className="space-y-3">
                          {step.fees.map((fee, idx) => (
                            <li key={idx} className="text-[11px] text-gray-400 flex items-center font-bold uppercase tracking-wider">
                              <span className={`w-1.5 h-1.5 rounded-full ${step.iconBg} mr-2 border border-gray-100`} />
                              <span>{fee}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action Section */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[3rem] blur-3xl" />
          
          <div className="relative bg-white border border-gray-100 rounded-[2.5rem] p-10 md:p-16 text-center shadow-2xl overflow-hidden ring-1 ring-gray-100">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-10 uppercase tracking-tighter">
              Pronto para começar sua jornada?
            </h2>
            
            <div className="flex justify-center">
              <button
                onClick={onNext}
                className="group relative bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all duration-500 shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:shadow-[0_25px_50px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95 uppercase tracking-widest"
              >
                <span>Bora Começar</span>
                <ArrowUpRight className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
