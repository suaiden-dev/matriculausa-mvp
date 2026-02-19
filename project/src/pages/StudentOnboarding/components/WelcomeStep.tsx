import React, { useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { StepProps } from '../types';
import { 
  Search, 
  FileText, 
  ArrowUpRight, 
  GraduationCap, 
  CheckCircle2, 
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useFeeConfig } from '../../../hooks/useFeeConfig';

export const WelcomeStep: React.FC<StepProps> = ({ onNext }) => {
  const { userProfile } = useAuth();
  const { getFeeAmount, formatFeeAmount } = useFeeConfig(userProfile?.id);

  const selectionFee = getFeeAmount('selection_process');
  const applicationFee = getFeeAmount('application_fee');
  const scholarshipFee = getFeeAmount('scholarship_fee');
  const i20Fee = getFeeAmount('i20_control_fee');

  const processSteps = useMemo(() => [
    {
      id: 1,
      title: 'Taxa de Seleção',
      description: 'Pague a taxa para desbloquear a plataforma e começar a selecionar suas bolsas exclusivas.',
      amount: formatFeeAmount(selectionFee),
      icon: Search,
      iconColor: 'bg-blue-500',
      iconLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      delay: 0.1
    },
    {
      id: 2,
      title: 'Draft & Seleção',
      description: 'Escolha as universidades e bolsas que combinam com seu perfil acadêmico e financeiro.',
      icon: GraduationCap,
      iconColor: 'bg-indigo-500',
      iconLight: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      delay: 0.2
    },
    {
      id: 3,
      title: 'Documentação',
      description: 'Envie seus documentos (Passaporte, Histórico, Diploma) para análise e aprovação.',
      icon: FileText,
      iconColor: 'bg-emerald-500',
      iconLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      delay: 0.3
    },
    {
      id: 4,
      title: 'Taxas de Processo',
      description: 'Pagamento das taxas necessárias para finalização do processo e emissão da sua carta de aceite',
      fees: [
        { name: 'Taxa de Matrícula', value: formatFeeAmount(applicationFee) },
        { name: 'Taxa de Bolsa', value: formatFeeAmount(scholarshipFee) },
        { name: 'Controle I-20', value: formatFeeAmount(i20Fee) }
      ],
      icon: CreditCard,
      iconColor: 'bg-amber-500',
      iconLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      delay: 0.4
    }
  ], [selectionFee, applicationFee, scholarshipFee, i20Fee, formatFeeAmount]);

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
        className="text-center mb-16 md:mb-24 space-y-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Processo de Admissão Oficial</span>
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black text-white leading-none uppercase tracking-tighter">
          Bem-vindo{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}!
        </h1>
        
        <p className="text-lg md:text-2xl text-white/50 max-w-4xl mx-auto font-medium leading-relaxed">
          Sua trajetória acadêmica internacional começa agora com a <span className="text-white">Matrícula USA</span>. Somos especialistas em transformar o sonho de estudar na América em realidade, conectando você às melhores bolsas de estudo através de um processo simplificado, transparente e 100% seguro.
        </p>
      </motion.div>

      {/* Grid de Passos Principal */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
      >
        {processSteps.map((step) => {
          const Icon = step.icon;
          return (
            <motion.div 
              key={step.id} 
              variants={itemVariants}
              className="group relative h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative h-full bg-white border border-gray-100 rounded-[2.5rem] p-8 md:p-10 shadow-2xl transition-all duration-500 hover:translate-y-[-10px] flex flex-col">
                {/* Header do Card */}
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-16 h-16 rounded-2xl ${step.iconLight} flex items-center justify-center border border-gray-50 transform group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-8 h-8 ${step.textColor}`} />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight leading-none italic">{step.title}</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8 flex-1">
                  {step.description}
                </p>

                {/* Info de Taxas */}
                <div className="mt-auto space-y-4">
                  {step.amount && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Investimento</span>
                      <span className={`text-xl font-black ${step.textColor}`}>{step.amount}</span>
                    </div>
                  )}

                  {step.fees && (
                    <div className="space-y-2">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Custos Inclusos</span>
                       {step.fees.map((fee, i) => (
                         <div key={i} className="flex items-center justify-between text-[11px] font-bold text-gray-600 uppercase tracking-tight">
                            <span>{fee.name}</span>
                            <span className="text-gray-900">{fee.value}</span>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
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
          
          <p className="text-gray-500 mb-12 max-w-lg mx-auto font-medium text-lg">
            A <strong>Matrícula USA</strong> é o seu passaporte para o sucesso. Dê o primeiro passo agora, desbloqueie a plataforma e descubra as oportunidades que esperam por você.
          </p>
          
          <button
            onClick={onNext}
            className="group relative bg-[#05294E] hover:bg-blue-600 text-white px-16 py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-4 mx-auto transition-all duration-500 shadow-2xl hover:scale-105 active:scale-95 uppercase tracking-[0.2em]"
          >
            <span>Iniciar Jornada</span>
            <ArrowUpRight className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </motion.div>

    </div>
  );
};

