import React, { useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { StepProps } from '../types';
import { 
  FileText, 
  ArrowUpRight, 
  GraduationCap, 
  CheckCircle2, 
  ShieldCheck,
  CreditCard,
  BookOpen,
  Lock,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFeeConfig } from '../../../hooks/useFeeConfig';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const WelcomeStep: React.FC<StepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(userProfile?.id);

  const selectionFee = getFeeAmount('selection_process');
  const scholarshipFee = getFeeAmount('scholarship_fee');
  const i20Fee = getFeeAmount('i20_control_fee');

  const processSteps = useMemo(() => [
    {
      id: 1,
      title: t('howItWorks.steps.selectionFee.title', { selectionProcessFee: formatFeeAmount(selectionFee) }),
      description: t('howItWorks.faq.q2.answer', { selectionProcessFee: formatFeeAmount(selectionFee) }),
      amount: formatFeeAmount(selectionFee),
      icon: CreditCard,
      iconColor: 'bg-emerald-500',
      iconLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      delay: 0.1
    },
    {
      id: 2,
      title: t('howItWorks.steps.documents.title'),
      description: "O sucesso da sua aceitação depende de uma documentação impecável. Nesta fase, nossos especialistas realizam uma revisão técnica e acadêmica rigorosa em cada documento enviado, garantindo que tudo esteja conforme as exigências das universidades americanas. Esse cuidado elimina riscos de rejeição por erros burocráticos e acelera sua aprovação.",
      icon: FileText,
      iconColor: 'bg-blue-500',
      iconLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      delay: 0.2
    },
    {
      id: 3,
      title: t('howItWorks.steps.applicationFee.title'),
      description: t('howItWorks.faq.q4.answer'),
      amount: 'Varia por Instituição',
      icon: GraduationCap,
      iconColor: 'bg-amber-500',
      iconLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      delay: 0.3
    },
    {
      id: 4,
      title: t('howItWorks.steps.scholarshipFee.title', { scholarshipFee: formatFeeAmount(scholarshipFee) }),
      description: t('howItWorks.faq.q3.answer', { scholarshipFee: formatFeeAmount(scholarshipFee) }),
      amount: formatFeeAmount(scholarshipFee),
      icon: BookOpen,
      iconColor: 'bg-purple-500',
      iconLight: 'bg-purple-50',
      textColor: 'text-purple-600',
      delay: 0.4
    },
    {
      id: 5,
      title: t('howItWorks.steps.i20Fee.title', { i20ControlFee: formatFeeAmount(i20Fee) }),
      description: t('howItWorks.faq.q5.answer', { i20ControlFee: formatFeeAmount(i20Fee) }),
      amount: formatFeeAmount(i20Fee),
      icon: Lock,
      iconColor: 'bg-rose-500',
      iconLight: 'bg-rose-50',
      textColor: 'text-rose-600',
      delay: 0.5
    }
  ], [selectionFee, scholarshipFee, i20Fee, formatFeeAmount, t]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-16 relative overflow-visible">
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 md:mb-16 space-y-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Processo de Admissão Oficial</span>
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black text-white leading-none uppercase tracking-tighter">
          Bem-vindo{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}!
        </h1>
        
        <p className="text-lg md:text-2xl text-white/50 max-w-4xl mx-auto font-medium leading-relaxed text-justify">
          Sua trajetória acadêmica internacional começa agora com a <span className="text-white">Matrícula USA</span>. Somos especialistas em transformar o sonho de estudar na América em realidade, conectando você às melhores bolsas de estudo através de um processo simplificado, transparente e 100% seguro.
        </p>
      </motion.div>

      {/* Grid de Passos Principal */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24"
      >
        {processSteps.map((step: any) => {
          const Icon = step.icon;
          return (
            <motion.div 
              key={step.id} 
              variants={itemVariants}
              className="group relative h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative h-full bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-10 shadow-2xl transition-all duration-500 hover:translate-y-[-10px] flex flex-col overflow-hidden">
                {/* Number Indicator */}
                <div className="absolute top-8 right-8 w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-sm font-black text-gray-300 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all duration-500 border border-gray-100 group-hover:border-blue-100 italic">
                  {step.id}
                </div>

                {/* Header do Card */}
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl ${step.iconLight} flex items-center justify-center border border-gray-50 transform group-hover:scale-110 transition-transform relative`}>
                    <Icon className={`w-7 h-7 ${step.textColor}`} />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight leading-none italic">{step.title}</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8 flex-1">
                  {step.description}
                </p>

                {/* Info de Taxas */}
                <div className="mt-auto">
                  {step.amount && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex-shrink-0">Investimento</span>
                      <span className={`text-lg font-black ${step.textColor} text-right ml-2`}>{step.amount}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Seção de Suporte e Mais Informações */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto mb-20 px-6 py-8 bg-blue-500/5 backdrop-blur-sm border border-blue-500/10 rounded-3xl text-center"
      >
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
          <div className="flex-1 text-left space-y-2">
            <h4 className="text-white font-bold text-lg uppercase tracking-tight italic">Precisa de mais detalhes?</h4>
            <p className="text-white/60 text-sm leading-relaxed">
              Para uma explicação completa de cada etapa, prazos e políticas, visite nossa página oficial de ajuda. Caso tenha dúvidas que não foram respondidas aqui, nossa equipe de suporte está pronta para ajudar você.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
            <a 
              href="https://matriculausa.com/how-it-works" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all border border-white/10"
            >
              <span>Como Funciona</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => navigate('/student/dashboard/chat')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
            >
              <MessageCircle className="w-3.5 h-3.5 text-blue-200" />
              <span>Contatar Suporte</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* CTA Section Final */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative max-w-4xl mx-auto"
      >
        <div className="absolute inset-0 bg-blue-600/20 blur-[120px] rounded-full" />
        
        <div className="relative bg-white border border-gray-100 rounded-[3.5rem] p-12 md:p-20 text-center shadow-3xl">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce transition-all duration-1000">
            <CheckCircle2 className="w-10 h-10 text-blue-600" />
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 uppercase tracking-tighter italic">
            Vamos começar?
          </h2>
          
          <p className="text-gray-500 mb-12 max-w-lg mx-auto font-medium text-lg leading-relaxed">
            A <strong>Matrícula USA</strong> é o seu passaporte para o sucesso. Dê o primeiro passo agora, desbloqueie a plataforma e descubra as oportunidades que esperam por você.
          </p>
          
          <button
            onClick={onNext}
            className="group relative bg-[#05294E] hover:bg-blue-600 text-white px-16 py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-4 mx-auto transition-all duration-500 shadow-2xl hover:scale-105 active:scale-95 uppercase tracking-[0.2em]"
          >
            <span>Iniciar Processo</span>
            <ArrowUpRight className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </motion.div>

    </div>
  );
};
