import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, CheckCircle2, FileText, GraduationCap, Send, Star, Shield, MessageCircle, Rocket } from 'lucide-react';
import { useLeadCapture } from '../hooks/useLeadCapture';
import NotificationService from '../services/NotificationService';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PreQualificationLead {
  name: string;
  email: string;
  phone: string;
}

type QuestionId = 'lead' | 'usa' | 'english' | 'priority' | 'flexibility' | 'flexibility_interest' | 'investment' | 'investment_interest' | 'graduation' | 'work_start_grad' | 'work_start_no_grad' | 'work_interest' | 'visa_type' | 'family' | 'time_in_usa' | 'offer' | 'how_it_works_final';

interface Question {
  id: QuestionId;
  title: string;
  options?: { value: string; label: string; icon?: string }[];
  type?: 'lead_capture' | 'options' | 'loading' | 'offer' | 'how_it_works';
}

const preQualificationQuestions: Record<QuestionId, Question> = {
  lead: {
    id: 'lead',
    title: 'Comece sua Pré-Qualificação',
    type: 'lead_capture'
  },
  usa: {
    id: 'usa',
    title: 'Você já está nos Estados Unidos? 🇺🇸',
    type: 'options',
    options: [
      { value: 'sim', label: 'Sim, já estou nos EUA', icon: '✅' },
      { value: 'nao', label: 'Não, estou fora dos EUA', icon: '🌎' }
    ]
  },
  visa_type: {
    id: 'visa_type',
    title: 'Sobre seu visto:',
    type: 'options',
    options: [
      { value: 'ja_tenho', label: 'Já tenho visto de estudante', icon: '🎓' },
      { value: 'trocar', label: 'Quero trocar meu status', icon: '🔄' }
    ]
  },
  time_in_usa: {
    id: 'time_in_usa',
    title: 'Você está aqui há quanto tempo? 😊',
    type: 'options',
    options: [
      { value: '<1', label: 'Menos de 1 ano' },
      { value: '1_3', label: '1 a 3 anos' },
      { value: '3_5', label: '3 a 5 anos' },
      { value: '>5', label: 'Mais de 5 anos' }
    ]
  },
  family: {
    id: 'family',
    title: 'Você veio com a família ou está sozinho por aqui?',
    type: 'options',
    options: [
      { value: 'sozinho', label: 'Estou sozinho(a)', icon: '🙋' },
      { value: 'familia', label: 'Estou com família', icon: '👨‍👩‍👧' }
    ]
  },
  english: {
    id: 'english',
    title: 'Você já fala inglês? 🗣️',
    type: 'options',
    options: [
      { value: 'basico', label: 'Básico', icon: 'Entendo pouca coisa' },
      { value: 'intermediario', label: 'Intermediário', icon: 'Consigo me virar' },
      { value: 'avancado', label: 'Avançado', icon: 'Falo bem' },
      { value: 'fluente', label: 'Fluente', icon: 'Sem dificuldades' }
    ]
  },
  priority: {
    id: 'priority',
    title: 'Sobre a bolsa de estudos, qual sua prioridade? 🎯',
    type: 'options',
    options: [
      { value: 'preco', label: 'Quero o melhor custo-benefício', icon: '💰 Preço' },
      { value: 'flexibilidade', label: 'Preciso de horários flexíveis', icon: '📅 Flexibilidade' },
      { value: 'trabalho', label: 'Quero poder trabalhar legalmente', icon: '💼 Autorização de trabalho' }
    ]
  },
  flexibility: {
    id: 'flexibility',
    title: 'Sobre a flexibilidade, você prefere aulas: 📅',
    type: 'options',
    options: [
      { value: '1_semana', label: 'Uma vez por semana', icon: '1️⃣' },
      { value: '1_mes', label: 'Uma vez por mês', icon: '📆' },
      { value: 'minimal', label: 'Quanto menos presencial melhor', icon: '💻' }
    ]
  },
  flexibility_interest: {
    id: 'flexibility_interest',
    title: 'Se encontrarmos uma opção com esse nível de flexibilidade, você teria interesse em seguir com o processo?',
    type: 'options',
    options: [
      { value: 'sim', label: 'Sim, tenho interesse', icon: '✅' },
      { value: 'mais_info', label: 'Preciso de mais informações', icon: '🤔' }
    ]
  },
  investment: {
    id: 'investment',
    title: 'As universidades parceiras variam entre $500 e $2.000 por mês. Qual faixa de investimento é mais adequada para você? 💰',
    type: 'options',
    options: [
      { value: '500_800', label: '$500 - $800/mês' },
      { value: '800_1200', label: '$800 - $1.200/mês' },
      { value: '1200_1600', label: '$1.200 - $1.600/mês' },
      { value: '1600_2000', label: '$1.600 - $2.000/mês' }
    ]
  },
  investment_interest: {
    id: 'investment_interest',
    title: 'Se encontrarmos uma bolsa dentro dessa faixa, você teria interesse em seguir com o processo seletivo?',
    type: 'options',
    options: [
      { value: 'sim', label: 'Sim, tenho interesse', icon: '✅' },
      { value: 'mais_info', label: 'Preciso de mais informações', icon: '🤔' }
    ]
  },
  graduation: {
    id: 'graduation',
    title: 'Sobre a autorização de trabalho, você já é formado(a)? 🎓',
    type: 'options',
    options: [
      { value: 'sim', label: 'Sim, já sou formado(a)', icon: '✅' },
      { value: 'nao', label: 'Não, ainda não', icon: '📚' }
    ]
  },
  work_start_grad: {
    id: 'work_start_grad',
    title: 'Perfeito 👀 você gostaria de começar a trabalhar a partir do primeiro dia de aula ou depois de 9 meses?',
    type: 'options',
    options: [
      { value: 'dia_1', label: 'A partir do primeiro dia', icon: '🚀' },
      { value: '9_meses', label: 'Depois de 9 meses', icon: '📆' }
    ]
  },
  work_start_no_grad: {
    id: 'work_start_no_grad',
    title: 'Boa 👍 você gostaria de começar a trabalhar em 9 meses ou em 1 ano?',
    type: 'options',
    options: [
      { value: '9_meses', label: 'Em 9 meses', icon: '📆' },
      { value: '1_ano', label: 'Em 1 ano', icon: '🗓️' }
    ]
  },
  work_interest: {
    id: 'work_interest',
    title: 'Se identificarmos uma universidade com autorização de trabalho no prazo escolhido, você teria interesse em seguir?',
    type: 'options',
    options: [
      { value: 'sim', label: 'Sim, tenho interesse', icon: '✅' },
      { value: 'mais_info', label: 'Preciso de mais informações', icon: '🤔' }
    ]
  },
  offer: {
    id: 'offer',
    title: 'Montando sua oferta...',
    type: 'offer'
  },
  how_it_works_final: {
    id: 'how_it_works_final',
    title: 'Como funciona o Processo Seletivo',
    type: 'how_it_works'
  }
};

const PreQualificationLanding: React.FC = () => {
  const navigate = useNavigate();
  const { captureLead } = useLeadCapture();
  
  const [currentStep, setCurrentStep] = useState<QuestionId>('lead');
  const [history, setHistory] = useState<QuestionId[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({
    usa: '',
    english: '',
    priority: '',
    flexibility: '',
    flexibility_interest: '',
    investment: '',
    investment_interest: '',
    graduation: '',
    work_start_grad: '',
    work_start_no_grad: '',
    work_interest: '',
    visa_type: '',
    family: '',
    time_in_usa: ''
  });
  const [lead, setLead] = useState<PreQualificationLead>({ name: '', email: '', phone: '' });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [offerReady, setOfferReady] = useState(false);
  const [formErrors, setFormErrors] = useState<{name?: string, email?: string, phone?: string}>({});
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);

  useEffect(() => {
    if (currentStep === 'how_it_works_final') {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentStep]);

  const formatTimeParts = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor((seconds % 60));
    return {
      h: h.toString().padStart(2, '0'),
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0')
    };
  };
  const [ipCountry, setIpCountry] = useState<string>('US');

  // Detecção de país por IP
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_code && data.country_code.length === 2) {
          setIpCountry(data.country_code);
        }
      })
      .catch(() => setIpCountry('US'));
  }, []);

  // Sync lead and answers with database seamlessly
  useEffect(() => {
    if (lead.name && (lead.email || lead.phone)) {
      captureLead({
        full_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source_page: 'pre_qualification_landing',
        pre_qualification_answers: answers,
        status: currentStep === 'how_it_works_final' ? 'completed' : 'pending'
      });
    }
  }, [lead, answers, captureLead, currentStep]);

  // Effect to simulate analysis progress
  useEffect(() => {
    if (currentStep === 'offer' && !offerReady) {
      setIsAnalyzing(true);
      setLoadingStep(0);
      const timer1 = setTimeout(() => setLoadingStep(1), 2500);
      const timer2 = setTimeout(() => setLoadingStep(2), 5500);
      const timer3 = setTimeout(() => setLoadingStep(3), 8500);
      const timer4 = setTimeout(() => {
        setIsAnalyzing(false);
        setOfferReady(true);
      }, 12000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [currentStep, offerReady]);

  // Autoscroll to top on any step transition (compatible with mobile browsers)
  useEffect(() => {
    const scrollToTop = () => {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };
    // Delay para garantir que o novo conteúdo já foi renderizado antes de rolar
    const timer = setTimeout(scrollToTop, 50);
    return () => clearTimeout(timer);
  }, [currentStep, offerReady]);

  const validateLeadForm = () => {
    const errors: {name?: string, email?: string, phone?: string} = {};
    
    if (!lead.name.trim() || lead.name.trim().length < 2) {
      errors.name = 'Por favor, insira seu nome.';
    }

    if (!lead.email.trim() || !lead.email.includes('@') || !lead.email.includes('.')) {
      errors.email = 'Por favor, insira um e-mail válido.';
    }

    const phoneDigits = lead.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.phone = 'Insira um telefone válido com DDD (mínimo 10 dígitos).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = (answer?: string) => {
    if (answer && currentStep !== 'lead') {
      setAnswers(prev => ({ ...prev, [currentStep]: answer }));
    }

    const next = (step: QuestionId) => {
      setHistory(prev => [...prev, currentStep]);
      setCurrentStep(step);
    };

    switch (currentStep) {
      case 'lead':
        if (validateLeadForm()) {
          // Envia evento inicial para o n8n
          NotificationService.sendLeadEvent({
            event_type: 'pre_qualification',
            source: 'quiz_landing',
            email: lead.email,
            full_name: lead.name,
            phone: lead.phone,
            status: 'pending',
            answers: {} // Inicia vazio
          });

          next('usa');
        }
        break;
      
      case 'usa':
        if (answer === 'sim') {
          next('visa_type');
        } else {
          next('english');
        }
        break;

      case 'visa_type':
        if (answer === 'trocar') {
          next('time_in_usa');
        } else {
          next('family');
        }
        break;

      case 'time_in_usa':
        next('family');
        break;

      case 'family':
        next('english');
        break;

      case 'english':
        next('priority');
        break;

      case 'priority':
        if (answer === 'preco') {
          next('investment');
        } else if (answer === 'flexibilidade') {
          next('flexibility');
        } else {
          next('graduation');
        }
        break;

      case 'investment':
        next('investment_interest');
        break;

      case 'flexibility':
        next('flexibility_interest');
        break;

      case 'graduation':
        if (answer === 'sim') {
          next('work_start_grad');
        } else {
          next('work_start_no_grad');
        }
        break;

      case 'work_start_grad':
      case 'work_start_no_grad':
        next('work_interest');
        break;

      case 'investment_interest':
        if (answers.priority === 'preco') {
          next('graduation');
        } else if (answers.priority === 'flexibilidade') {
          startAnalysis();
        } else if (answers.priority === 'trabalho') {
          next('flexibility');
        }
        break;

      case 'flexibility_interest':
        if (answers.priority === 'flexibilidade') {
          next('graduation');
        } else if (answers.priority === 'preco') {
          startAnalysis();
        } else if (answers.priority === 'trabalho') {
          startAnalysis();
        }
        break;

      case 'work_interest':
        if (answers.priority === 'trabalho') {
          next('investment');
        } else if (answers.priority === 'preco') {
          next('flexibility');
        } else if (answers.priority === 'flexibilidade') {
          next('investment');
        }
        break;

      default:
        break;
    }
  };



  const startAnalysis = () => {
    setCurrentStep('offer');
    setIsAnalyzing(true);
    setOfferReady(false);
  };

  const calculateProgress = () => {
    if (currentStep === 'offer') return 99.5;
    if (currentStep === 'how_it_works_final') return 100;
    
    const stepsTaken = history.length;
    const progressMap: Record<number, number> = {
      0: 5,   // lead
      1: 25,  
      2: 40,  
      3: 55,  
      4: 68,  
      5: 78,  
      6: 85,  
      7: 90,  
      8: 94,  
      9: 96,  
      10: 97.5,
      11: 98.5,
      12: 99
    };
    
    return progressMap[stepsTaken] || 99;
  };

  const currentQ = preQualificationQuestions[currentStep];

  const workTimeText = 
    answers.work_start_grad === 'dia_1' ? 'a partir do primeiro dia de aula' :
    (answers.work_start_grad === '9_meses' || answers.work_start_no_grad === '9_meses') ? 'em 9 meses' :
    answers.work_start_no_grad === '1_ano' ? 'em 1 ano' : 'no prazo escolhido';
  const flexVal = answers.flexibility === '1_semana' ? '1x na semana' : 
                  answers.flexibility === '1_mes' ? '1x no mês' : 'minimamente presenciais';
  const investVal = answers.investment === '500_800' ? '$500 a $800' :
                    answers.investment === '800_1200' ? '$800 a $1.200' : 
                    answers.investment === '1200_1600' ? '$1.200 a $1.600' : '$1.600 a $2.000';

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-500/30">
      <div className="flex justify-center pt-8 md:pt-12 pb-2">
        <img src="/logo.png.png" alt="Matricula USA" className="h-10 md:h-12 object-contain" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-start md:justify-center px-4 pb-12 pt-4">
        <div className="w-full max-w-2xl relative">
          
          {currentStep !== 'how_it_works_final' && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full mb-10 overflow-hidden">
              <motion.div 
                className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                initial={{ width: 0 }}
                animate={{ width: `${calculateProgress()}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          )}



          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white p-8 md:p-10 rounded-[2rem]"
            >
              
              {currentQ.type === 'lead_capture' && (
                <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-6">
                  <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] mb-3 tracking-tight">{currentQ.title}</h1>
                    <p className="text-slate-500 text-base md:text-lg">Veja quais bolsas de estudo são compatíveis com o seu perfil</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 ml-1 mb-1.5 block">Seu Nome Completo *</label>
                      <input 
                        required
                        type="text" 
                        maxLength={80}
                        value={lead.name}
                        onChange={e => {
                          setLead(l => ({...l, name: e.target.value}));
                          if (formErrors.name) setFormErrors(prev => ({...prev, name: undefined}));
                        }}
                        className={`w-full bg-slate-50/50 hover:bg-slate-50 border ${formErrors.name ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/20'} rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-300 font-medium`}
                        placeholder="Nome e Sobrenome"
                      />
                      {formErrors.name && <p className="text-red-500 text-sm mt-1.5 ml-1 font-medium">{formErrors.name}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 ml-1 mb-1.5 block">Seu Melhor E-mail *</label>
                      <input 
                        required
                        type="email" 
                        value={lead.email}
                        onChange={e => {
                          setLead(l => ({...l, email: e.target.value}));
                          if (formErrors.email) setFormErrors(prev => ({...prev, email: undefined}));
                        }}
                        className={`w-full bg-slate-50/50 hover:bg-slate-50 border ${formErrors.email ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/20'} rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-300 font-medium`}
                        placeholder="exemplo@email.com"
                      />
                      {formErrors.email && <p className="text-red-500 text-sm mt-1.5 ml-1 font-medium">{formErrors.email}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 ml-1 mb-1.5 block">WhatsApp com DDD *</label>
                      <PhoneInput
                        international
                        defaultCountry={ipCountry as any}
                        addInternationalOption={false}
                        limitMaxLength={true}
                        maxLength={20}
                        value={lead.phone}
                        onChange={(value) => {
                          setLead(l => ({ ...l, phone: value || '' }));
                          if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: undefined }));
                        }}
                        className={`quick-registration-phone w-full bg-slate-50/50 hover:bg-slate-50 border ${formErrors.phone ? 'border-red-500 ring-4 ring-red-500/20' : 'border-slate-200 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/20'} rounded-2xl px-5 py-4 text-slate-900 transition-all duration-300 font-medium`}
                        placeholder="Ex: 11 99999-9999"
                      />
                      {formErrors.phone && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{formErrors.phone}</p>}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-[2.5rem] text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/30 active:scale-[0.98] mt-8"
                  >
                    Começar <ArrowRight className="w-6 h-6" />
                  </button>
                </form>
              )}

              {currentQ.type === 'options' && (
                <div className="space-y-8 min-h-[450px] md:min-h-[500px] flex flex-col justify-start">
                  <div className="min-h-[80px] md:min-h-[96px] flex items-center justify-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-center text-[#1a1a1a] leading-tight tracking-tight">
                      {currentQ.title}
                    </h2>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {currentQ.options?.map((opt, idx) => {
                      const isEmoji = opt.icon && opt.icon.length <= 12 && !opt.icon.includes(' '); 
                      const hasBigIcon = ['💰 Preço', '📅 Flexibilidade', '💼 Autorização de trabalho'].includes(opt.icon || '');
                      const bigIcon = hasBigIcon ? opt.icon?.split(' ')[0] : null;
                      const subTitle = hasBigIcon ? opt.label : (isEmoji ? null : opt.icon);

                      return (
                        <button
                          key={idx}
                          onClick={() => handleNextStep(opt.value)}
                          className="w-full bg-white hover:bg-blue-50/50 border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-5 md:p-6 text-left transition-all duration-300 active:scale-[0.98] group flex items-center gap-4 hover:shadow-lg shadow-sm"
                        >
                          {hasBigIcon ? (
                            <div className="flex items-center gap-4 w-full">
                              <div className="text-4xl">{bigIcon}</div>
                              <div>
                                <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{opt.icon?.replace(bigIcon || '', '').trim()}</h3>
                                <p className="text-slate-500 text-sm">{opt.label}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 w-full">
                              {isEmoji && <div className="text-3xl">{opt.icon}</div>}
                              <div className="flex-1">
                                <span className="font-bold text-[#1a1a1a] md:text-lg group-hover:text-blue-700 transition-colors">{opt.label}</span>
                                {subTitle && <p className="text-slate-500 text-sm mt-0.5">{subTitle}</p>}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentQ.type === 'offer' && (
                <div className="text-center py-6">
                  {isAnalyzing ? (
                    <motion.div 
                      className="flex flex-col items-center justify-center space-y-8 py-8 w-full max-w-md mx-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="relative flex items-center justify-center w-32 h-32 mb-4">
                        <svg className="w-full h-full transform -rotate-90">
                           <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-slate-100"
                          />
                          <motion.circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray="364.4"
                            initial={{ strokeDashoffset: 364.4 }}
                            animate={{ strokeDashoffset: 364.4 - (364.4 * (loadingStep + 1) / 4) }}
                            transition={{ duration: 1.2, ease: "easeInOut" }}
                            className="text-blue-600"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <GraduationCap className="w-12 h-12 text-blue-600" />
                        </div>
                      </div>

                      <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Analisando oportunidades...</h2>
                        <p className="text-slate-500 font-medium">Estamos buscando as melhores bolsas para o seu perfil</p>
                      </div>

                      <div className="w-full space-y-3 pt-6">
                        {[
                          { text: 'Analisando seu perfil', icon: <Shield className="w-5 h-5" /> },
                          { text: 'Analisando +154 bolsas no sistema', icon: <GraduationCap className="w-5 h-5" /> },
                          { text: 'Encontrando bolsas compatíveis com seu perfil', icon: <Star className="w-5 h-5" /> },
                          { text: 'Sua seleção personalizada está a caminho!', icon: <Rocket className="w-5 h-5" /> }
                        ].map((item, idx) => {
                          const isDone = loadingStep > idx;
                          const isCurrent = loadingStep === idx;
                          
                          return (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${
                                isDone 
                                  ? 'bg-blue-50/50 border-blue-100 text-blue-700' 
                                  : isCurrent 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                    : 'bg-white border-transparent text-slate-400 opacity-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 text-left">
                                {item.icon}
                                <span className="font-bold text-sm md:text-base">{item.text}</span>
                              </div>
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                              ) : isCurrent ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : null}
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : offerReady ? (
                    <motion.div 
                      className="space-y-8 text-left"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >

                      <div className="inline-flex items-center gap-2 bg-green-50/80 text-green-600 px-4 py-2 rounded-full font-bold text-sm mb-2 border border-green-200">
                        <CheckCircle2 className="w-5 h-5" />
                        Perfil analisado com sucesso
                      </div>
                      
                      <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] tracking-tight leading-tight">
                        Parabéns! Você tem bolsas esperando por você.
                      </h2>
                      
                      <p className="text-slate-500 text-lg leading-relaxed">
                        Com base nas suas respostas, identificamos que você se qualifica para bolsas de estudo exclusivas em universidades parceiras nos Estados Unidos.
                      </p>

                      <ul className="space-y-4 bg-slate-50/50 p-6 md:p-8 rounded-[1.5rem] border border-slate-100">
                          <li className="flex items-start gap-4">
                            <div className="bg-green-100 text-green-600 rounded-full p-1 mt-0.5">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-slate-700 md:text-lg">Você poderá começar a trabalhar <strong className="text-blue-700 font-extrabold">{workTimeText}</strong></span>
                          </li>
                        
                        {answers.flexibility && (
                          <li className="flex items-start gap-4">
                            <div className="bg-green-100 text-green-600 rounded-full p-1 mt-0.5">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-slate-700 md:text-lg">Bolsas com aulas <strong className="text-blue-700 font-extrabold">{flexVal}</strong></span>
                          </li>
                        )}
                        
                        {answers.investment && (
                          <li className="flex items-start gap-4">
                            <div className="bg-green-100 text-green-600 rounded-full p-1 mt-0.5">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <span className="text-slate-700 md:text-lg">Opções com investimento de <strong className="text-blue-700 font-extrabold">{investVal}</strong>/mês</span>
                          </li>
                        )}
                        
                        <li className="flex items-start gap-4">
                          <div className="bg-green-100 text-green-600 rounded-full p-1 mt-0.5">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className="text-slate-700 md:text-lg">Suporte completo com imigração e visto F-1</span>
                        </li>
                      </ul>

                      <div className="pt-6 border-t border-slate-200">
                        <p className="text-xl md:text-2xl font-black text-center text-slate-900 mb-6 leading-tight">
                          Deseja realizar o processo seletivo e garantir sua bolsa?
                        </p>
                        <button 
                          onClick={() => {
                            // Marca como completado no banco
                            captureLead({
                                full_name: lead.name,
                                email: lead.email,
                                phone: lead.phone,
                                source_page: 'pre_qualification_landing',
                                pre_qualification_answers: answers,
                                status: 'completed'
                            });
                            setHistory(prev => [...prev, currentStep]);
                            setCurrentStep('how_it_works_final');
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-[2.5rem] text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/30 active:scale-[0.98]"
                        >
                          Quero realizar o processo seletivo <ArrowRight className="w-6 h-6" />
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </div>
              )}

              {currentQ.type === 'how_it_works' && (
                <div className="space-y-10">
                  <div className="text-center space-y-3">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a1a1a] tracking-tight">{currentQ.title}</h2>
                    <p className="text-slate-500 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
                      Um processo simples, transparente e sem risco para você garantir sua bolsa de estudos nos EUA.
                    </p>
                  </div>

                  <div className="relative pl-12 md:pl-16 space-y-16 py-2">
                    {[
                      { t: 'Inscrição rápida', d: 'Preencha um formulário simples com seus dados acadêmicos. Leva menos de 5 minutos.', i: <FileText className="w-5 h-5 text-blue-600" /> },
                      { t: 'Seleção de universidades', d: 'Selecione até 4 universidades com bolsas compatíveis com seu perfil', i: <GraduationCap className="w-5 h-5 text-blue-600" /> },
                      { t: 'Candidatura enviada', d: 'Enviamos sua candidatura diretamente para as universidades parceiras.', i: <Send className="w-5 h-5 text-blue-600" /> },
                      { t: 'Escolha bolsas aprovadas', d: 'Escolha a bolsa aprovada para você e dê o passo final para garantir sua vaga.', i: <Star className="w-5 h-5 text-blue-600" /> }
                    ].map((step, idx, array) => (
                      <div key={idx} className="relative flex items-start group">
                        {idx !== array.length - 1 && (
                          <div 
                            className="absolute left-[-28px] md:left-[-42px] border-l-2 border-dashed border-slate-200 -z-0"
                            style={{ 
                              top: '22px', 
                              height: 'calc(100% + 64px)' 
                            }}
                          ></div>
                        )}
                        <div className="absolute -left-12 md:-left-16 flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full border-2 border-blue-600 bg-white shadow-sm z-10 transition-all group-hover:bg-blue-50">
                           {step.i}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-[#1a1a1a] text-lg md:text-xl mb-1 leading-tight">{step.t}</h4>
                          <p className="text-slate-500 text-sm md:text-base leading-relaxed">{step.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50/50 border-2 border-blue-100 p-8 md:p-10 rounded-[2.5rem] flex flex-col md:flex-row gap-6 md:gap-8 items-center text-center transition-all hover:bg-blue-50 shadow-sm">
                    <div>
                      <h4 className="font-black text-[#1a1a1a] text-xl md:text-2xl mb-2 tracking-tight">Garantia de Reembolso</h4>
                      <p className="text-slate-600 text-base md:text-lg leading-relaxed">
                        Se nenhuma bolsa de estudos for aprovada para o seu perfil, <span className="text-blue-700 font-extrabold underline decoration-blue-200">devolvemos o Processo Seletivo</span>.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-b from-slate-50 to-white p-8 md:p-10 rounded-[2.5rem] text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
                    <div className="bg-amber-400 p-4 rounded-2xl mb-8 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 shadow-md border border-amber-300">
                        <span className="text-amber-900 font-bold text-sm md:text-base uppercase tracking-tight">Oferta expira em:</span>
                      <div className="flex items-center gap-1.5 font-mono font-black text-2xl md:text-3xl">
                        {(() => {
                          const time = formatTimeParts(timeLeft);
                          return (
                            <>
                              <div className="bg-white/30 backdrop-blur-sm px-2 rounded-lg text-amber-900 shadow-inner flex items-center justify-center min-w-[3rem] h-12">
                                {time.h}
                              </div>
                              <span className="text-amber-900 drop-shadow-sm">:</span>
                              <div className="bg-white/30 backdrop-blur-sm px-2 rounded-lg text-amber-900 shadow-inner flex items-center justify-center min-w-[3rem] h-12">
                                {time.m}
                              </div>
                              <span className="text-amber-900 drop-shadow-sm">:</span>
                              <div className="bg-white/30 backdrop-blur-sm px-2 rounded-lg text-amber-900 shadow-inner flex items-center justify-center min-w-[3rem] h-12">
                                {time.s}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <p className="text-blue-700 font-bold text-sm md:text-base mb-6 uppercase tracking-widest">Processo seletivo</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-2xl md:text-3xl text-slate-500 line-through decoration-red-500/30 font-bold italic opacity-80">DE US$ 400</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 md:gap-3 leading-none tracking-tight">
                        <span className="text-xl md:text-2xl font-bold text-slate-400">POR</span>
                        <span className="text-5xl md:text-6xl font-black text-blue-600">US$ 350</span>
                      </div>
                      <p className="text-green-600 font-bold text-sm mt-4 inline-block bg-green-50 px-4 py-1 rounded-full">
                        Você economiza US$ 50 hoje
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-4">
                    <button 
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (lead.name) params.append('name', lead.name);
                        if (lead.email) params.append('email', lead.email);
                        if (lead.phone) params.append('phone', lead.phone);
                        params.append('coupon', 'TFOE');
                        navigate(`/selection-fee-registration?${params.toString()}`);
                      }}
                      className="flex-[1.5] bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-[2.5rem] text-lg md:text-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/30 active:scale-[0.98]"
                    >
                      Iniciar Processo Seletivo <ArrowRight className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => {
                        const parts: string[] = [];
                        parts.push(`Olá! Acabei de fazer a pré-qualificação e quero saber mais sobre o processo seletivo.`);
                        if (lead.name) parts.push(`\n\n*Meu perfil:*`);
                        if (lead.name) parts.push(`• Nome: ${lead.name}`);
                        if (answers.usa === 'sim') parts.push(`• Já estou nos EUA`);
                        if (answers.visa_type) parts.push(`• Visto: ${answers.visa_type === 'ja_tenho' ? 'Já tenho visto de estudante' : 'Quero trocar meu status'}`);
                        if (answers.english) parts.push(`• Inglês: ${answers.english.charAt(0).toUpperCase() + answers.english.slice(1)}`);
                        if (answers.priority === 'preco' && answers.investment) parts.push(`• Investimento: ${investVal}/mês`);
                        if (answers.flexibility) parts.push(`• Flexibilidade: Aulas ${flexVal}`);
                        if (answers.work_start_grad || answers.work_start_no_grad) parts.push(`• Autorização de trabalho: ${workTimeText}`);
                        parts.push(`\n\n*Oferta vista:* Processo Seletivo por US$ 350 (com desconto de US$ 50)`);

                        const message = encodeURIComponent(parts.join('\n'));
                        window.open(`https://api.whatsapp.com/send/?phone=15202553813&text=${message}`, '_blank');
                      }}
                      className="flex-1 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-5 rounded-[2.5rem] text-lg md:text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                      <MessageCircle className="w-6 h-6" /> Falar com alguém
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
          
        </div>
      </main>

    </div>
  );
};

export default PreQualificationLanding;
