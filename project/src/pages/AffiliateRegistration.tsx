import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Share2, Coins, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw, ArrowRight, DollarSign, ArrowDownToLine, MessageCircle, Copy, Link2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

  if (strength <= 2) return { level: 'weak', color: 'bg-red-500', text: 'Fraca' };
  if (strength <= 3) return { level: 'medium', color: 'bg-yellow-500', text: 'Média' };
  if (strength <= 4) return { level: 'good', color: 'bg-blue-500', text: 'Boa' };
  return { level: 'strong', color: 'bg-green-500', text: 'Forte' };
};

// Tela exibida após signup quando confirmação de email é obrigatória
const EmailConfirmationScreen: React.FC<{ email: string }> = ({ email }) => {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/affiliate/dashboard`,
        },
      });
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05294E] via-[#083a6e] to-[#0a4a8a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-10 shadow-2xl text-center">
          {/* Ícone */}
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-[#05294E]" />
          </div>

          {/* Título */}
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            Confirme seu email
          </h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Enviamos um link de confirmação para{' '}
            <strong className="text-slate-800 break-all">{email}</strong>.
            <br className="hidden sm:block" />
            Clique no link para ativar sua conta e começar a indicar.
          </p>

          {/* Passos */}
          <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-3 mb-6">
            {[
              { step: '1', text: 'Abra o email que enviamos para você' },
              { step: '2', text: 'Clique no botão "Confirmar email"' },
              { step: '3', text: 'Você será direcionado para o seu dashboard' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#05294E] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                  {step}
                </div>
                <span className="text-sm text-slate-600">{text}</span>
              </div>
            ))}
          </div>

          {/* Reenviar */}
          {resent ? (
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm mb-4">
              <CheckCircle className="w-4 h-4" />
              Email reenviado com sucesso!
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 mb-4"
            >
              {resending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resending ? 'Reenviando...' : 'Reenviar email de confirmação'}
            </button>
          )}

          {/* Ir para login */}
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#05294E] text-white font-bold rounded-xl hover:bg-[#041f38] transition-colors text-sm"
          >
            Ir para o login
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-slate-400 text-xs mt-4">
            Não recebeu? Verifique a pasta de spam.
          </p>
        </div>
      </div>
    </div>
  );
};

const AffiliateRegistration: React.FC = () => {
  return (
    <div className="relative bg-white min-h-screen font-sans overflow-hidden">

      {/* Efeito de luminosidade azul no topo */}
      <div className="absolute inset-x-0 top-0 h-[900px] z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[1000px] h-[700px] bg-blue-500/20 rounded-full blur-[150px]"></div>
        <div className="absolute top-[200px] left-1/4 w-[600px] h-[500px] bg-[#05294E]/12 rounded-full blur-[130px]"></div>
        <div className="absolute top-[200px] right-1/4 w-[600px] h-[500px] bg-sky-400/20 rounded-full blur-[130px]"></div>
      </div>

      {/* Hero header — transparente */}
      <section className="relative pt-20 pb-24 lg:pt-24 lg:pb-28 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] leading-tight tracking-tight">
            Transforme suas indicações
            <span className="block text-[#05294E] mt-1">
              em descontos reais
            </span>
          </h1>
          <p className="text-lg lg:text-xl text-[#05294E]/70 mt-4 max-w-2xl mx-auto leading-relaxed font-medium">
            Compartilhe seu código, indique quem quer estudar nos EUA e acumule <strong className="text-[#05294E]">MatriculaCoins</strong> a cada indicação confirmada.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full border border-[#05294E]/20 text-[#05294E] text-sm font-semibold hover:bg-[#05294E]/5 transition-colors"
          >
            Seja um afiliado
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Showcase — prova social estilo "céu" */}
      <section className="relative z-10 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#05294E] via-[#083a6e] to-[#0a4a8a] overflow-x-clip overflow-y-visible lg:overflow-visible lg:min-h-[560px] flex flex-col lg:block">

            {/* Glows de iluminação dentro do painel */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-sky-400/25 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-0 -left-24 w-[450px] h-[450px] bg-blue-500/20 rounded-full blur-[110px]"></div>
              <div className="absolute -bottom-20 -right-24 w-[450px] h-[450px] bg-cyan-400/15 rounded-full blur-[110px]"></div>
            </div>

            {/* Cards — diferenciais */}
            <div className="relative z-10 order-4 flex flex-col items-start gap-3 sm:gap-4 px-6 pb-6 sm:px-8 sm:pb-8 lg:p-0 lg:absolute lg:left-8 lg:top-1/2 lg:-translate-y-1/2 lg:w-auto">
              {[
                'Compartilhe',
                'Receba Matrícula Coins',
                'Resgate suas recompensas',
              ].map((title, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 + i * 0.15 }}
                  style={{ ['--ml' as any]: `${i * 1.5}rem` }}
                  className="flex items-center gap-4 bg-white/10 backdrop-blur-2xl rounded-2xl px-6 py-5 sm:px-7 sm:py-6 ml-[var(--ml)] lg:ml-[calc(var(--ml)*1.66)]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <p className="font-bold text-white text-base sm:text-lg leading-snug lg:whitespace-nowrap">{title}</p>
                </motion.div>
              ))}
            </div>

            {/* Cards — estatísticas */}
            <div className="relative z-20 order-3 -mt-14 sm:-mt-[4.5rem] flex flex-col gap-3 sm:gap-4 px-6 pb-6 sm:px-8 sm:pb-8 lg:mt-0 lg:p-0 lg:absolute lg:right-8 lg:top-10 lg:w-auto lg:max-w-[260px]">
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
                className="bg-white rounded-2xl px-6 py-5 sm:px-7 sm:py-6 shadow-lg"
              >
                <p className="text-4xl sm:text-5xl font-black text-[#05294E] leading-none">100</p>
                <p className="text-slate-500 text-sm sm:text-base mt-2 leading-snug">coins por indicação confirmada</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.45 }}
                className="bg-white rounded-2xl px-6 py-5 sm:px-7 sm:py-6 shadow-lg"
              >
                <div className="flex -space-x-2 mb-3">
                  {[
                    'https://i.pravatar.cc/64?img=12',
                    'https://i.pravatar.cc/64?img=32',
                    'https://i.pravatar.cc/64?img=45',
                    'https://i.pravatar.cc/64?img=68',
                  ].map((src) => (
                    <img key={src} src={src} alt="" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white object-cover" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm sm:text-base leading-snug">
                  <strong className="text-[#05294E]">300+</strong> afiliados ativos na plataforma
                </p>
              </motion.div>
            </div>

            {/* Imagem — afiliadas (transbordando pelo topo no mobile e no desktop) */}
            <div className="relative z-[1] order-2 -mt-64 flex justify-center overflow-x-clip overflow-y-visible lg:mt-0 lg:overflow-visible lg:absolute lg:inset-x-0 lg:bottom-0 pointer-events-none">
              <motion.img
                src="/afiliado.png"
                alt="Afiliadas MatriculaUSA"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="block w-auto max-w-none h-[38rem] object-contain object-bottom lg:h-[56rem]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona — grid de cards */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] tracking-tight">
              Como funciona
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {[
              {
                title: 'Receba seu código único',
                desc: 'Após se tornar afiliado, você terá acesso ao seu código exclusivo de indicação.',
                mockup: (
                  <div className="w-full space-y-3 text-left">
                    <div className="bg-slate-50 border-2 border-dashed border-[#05294E]/20 rounded-xl px-3 py-2.5 text-center">
                      <span className="text-base font-black text-[#05294E] tracking-[0.15em]">MUSA-7K3D</span>
                    </div>
                    <button disabled className="w-full bg-[#05294E] text-white py-2 rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-default">
                      <CheckCircle className="w-3 h-3" />
                      Código copiado
                    </button>
                  </div>
                ),
              },
              {
                title: 'Compartilhe com quem quiser estudar nos EUA',
                desc: 'Envie seu código para pessoas interessadas em iniciar uma jornada acadêmica internacional.',
                mockup: (
                  <div className="w-full space-y-3 text-left">
                    {/* Campo do link com botão copiar */}
                    <div>
                      <p className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Seu link de indicação</p>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl pl-2.5 pr-1.5 py-1.5">
                        <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-[9px] font-bold text-slate-700 truncate flex-1">matriculausa.com/r/MUSA-7K3D</span>
                        <button disabled className="flex items-center gap-1 bg-[#05294E] text-white px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider cursor-default flex-shrink-0">
                          <Copy className="w-2.5 h-2.5" />
                          Copiar
                        </button>
                      </div>
                    </div>

                    {/* Botões de canal */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-50 text-green-600' },
                        { label: 'E-mail', icon: Mail, color: 'bg-blue-50 text-blue-600' },
                        { label: 'Mais', icon: Share2, color: 'bg-slate-50 text-slate-600' },
                      ].map(({ label, icon: ChannelIcon, color }) => (
                        <div key={label} className={`rounded-xl ${color} flex flex-col items-center justify-center py-2.5 gap-1`}>
                          <ChannelIcon className="w-4 h-4" />
                          <span className="text-[7px] font-black uppercase tracking-wider">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-xl px-2.5 py-2 text-center">
                        <p className="text-sm font-black text-[#05294E] leading-none">12</p>
                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-1">Convites enviados</p>
                      </div>
                      <div className="bg-emerald-50/60 rounded-xl px-2.5 py-2 text-center">
                        <p className="text-sm font-black text-emerald-600 leading-none">8</p>
                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-1">Cliques no link</p>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                title: 'Ganhe coins por indicações confirmadas',
                desc: 'Quando a indicação for validada, os coins entram automaticamente na sua conta.',
                mockup: (
                  <div className="w-full space-y-2.5 text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Atividade recente</h4>
                      <span className="bg-green-50 text-green-600 border border-green-100 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider">Confirmada</span>
                    </div>
                    {[
                      { name: 'Ana S.', status: 'Confirmada' },
                      { name: 'Lucas M.', status: 'Confirmada' },
                    ].map(({ name, status }) => (
                      <div key={name} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h5 className="text-[9px] font-black text-slate-800 leading-tight">{name}</h5>
                            <p className="text-[7px] text-emerald-600 font-bold uppercase tracking-wider">{status}</p>
                          </div>
                        </div>
                        <span className="flex items-center gap-0.5 text-[#05294E] font-black text-[11px]">
                          <Coins className="w-3 h-3 text-yellow-500" />+100
                        </span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                title: 'Resgate suas recompensas',
                desc: 'Acumule coins e troque por benefícios dentro da plataforma Matrícula USA.',
                mockup: (
                  <div className="w-full rounded-2xl overflow-hidden text-left">
                    {/* Header — saldo disponível em dólares (verde) */}
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-4 py-3.5 text-white rounded-2xl shadow-md shadow-green-500/20">
                      <div className="flex items-center justify-between">
                        <p className="text-[7px] font-bold uppercase tracking-widest text-white/80">Saldo disponível</p>
                        <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider">USD</span>
                      </div>
                      <div className="flex items-end gap-1 mt-1">
                        <DollarSign className="w-5 h-5 mb-0.5" />
                        <span className="text-3xl font-black leading-none">1,200.00</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 text-white/80">
                        <Coins className="w-3 h-3 text-yellow-300" />
                        <span className="text-[8px] font-bold">1.200 coins · 1 coin = US$ 1</span>
                      </div>
                    </div>

                    {/* Corpo — saque */}
                    <div className="pt-3 space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-black text-slate-800">Sacar para conta</span>
                        </div>
                        <span className="text-[9px] font-black text-emerald-600">$1,200.00</span>
                      </div>
                      <button disabled className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-default shadow-md shadow-green-500/20">
                        <ArrowDownToLine className="w-3 h-3" />
                        Sacar saldo
                      </button>
                    </div>
                  </div>
                ),
              },
            ].map(({ title, desc, mockup }, i) => {
              const isLarge = i === 1 || i === 2;
              return (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.12 }}
                  className={`relative h-full bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(0,0,0,0.05)] p-7 hover:shadow-[0_20px_50px_rgba(5,41,78,0.10)] hover:-translate-y-1 transition-all duration-300 ${
                    isLarge ? 'lg:col-span-3' : 'lg:col-span-2'
                  }`}
                >
                  <div className={`relative h-full flex flex-col ${isLarge ? 'lg:flex-row lg:items-center lg:gap-7' : ''}`}>
                    {/* Texto */}
                    <div className={isLarge ? 'order-2 lg:order-1 lg:flex-1' : ''}>
                      <h3 className="text-xl md:text-2xl font-bold text-[#05294E] tracking-tight leading-snug mb-2.5">
                        {title}
                      </h3>
                      <p className="text-base md:text-lg text-slate-400 leading-relaxed font-medium">
                        {desc}
                      </p>
                    </div>

                    {/* Mockup ilustrativo */}
                    <div className={`relative ${isLarge ? 'order-1 lg:order-2 mb-5 lg:mb-0 lg:w-1/2 lg:flex-shrink-0' : 'mt-8'}`}>
                      {mockup}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <AffiliateFAQ />

      {/* CTA final */}
      <section className="relative py-16 lg:py-24">
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#05294E] text-white font-black tracking-wide hover:bg-[#041f38] transition-colors shadow-lg shadow-[#05294E]/20"
          >
            Quero ser afiliado
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

const AFFILIATE_FAQS = [
  {
    question: 'Quanto custa para se tornar um afiliado?',
    answer: 'Nada. O programa de afiliados da Matrícula USA é 100% gratuito. Você cria sua conta, recebe seu código e já pode começar a indicar.',
  },
  {
    question: 'Como recebo meu código de indicação?',
    answer: 'Assim que você cria sua conta de afiliado, um código exclusivo é gerado automaticamente e fica disponível no seu painel.',
  },
  {
    question: 'Quantos coins ganho por indicação?',
    answer: 'Você acumula coins a cada indicação confirmada, sem limite de indicações. Quanto mais pessoas você indicar, mais coins ganha.',
  },
  {
    question: 'Quando uma indicação é considerada confirmada?',
    answer: 'A indicação é validada quando a pessoa que usou seu código conclui a etapa exigida na plataforma. Após a validação, os coins entram automaticamente na sua conta.',
  },
  {
    question: 'Quanto vale cada coin?',
    answer: 'Cada coin equivale a US$ 1. Você acompanha o saldo disponível diretamente no seu painel de afiliado.',
  },
  {
    question: 'Como resgato minhas recompensas?',
    answer: 'No seu painel, você pode trocar os coins acumulados por benefícios dentro da plataforma Matrícula USA ou sacar o saldo disponível.',
  },
];

const AffiliateFAQ: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const renderItem = (num: number) => {
    const faq = AFFILIATE_FAQS[num];
    if (!faq) return null;
    return (
      <div
        key={num}
        className={`group transition-all duration-300 border-b border-slate-200 ${
          openFaq === num ? 'bg-gradient-to-br from-white to-slate-50/30' : ''
        }`}
      >
        <button
          onClick={() => setOpenFaq(openFaq === num ? null : num)}
          className="w-full text-left p-4 sm:p-5 flex items-center gap-4 group focus:outline-none"
        >
          <div className="flex-1">
            <h3 className="text-sm sm:text-base font-bold leading-tight text-slate-900 transition-colors duration-500">
              {faq.question}
            </h3>
          </div>
          <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500 ${
            openFaq === num ? 'bg-slate-100 text-slate-600 rotate-180' : 'bg-slate-50 text-slate-300 group-hover:text-slate-400'
          }`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </button>
        <AnimatePresence>
          {openFaq === num && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
            >
              <div className="px-4 sm:px-5 pb-5 pt-0">
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 pt-3 pr-2 sm:pr-4">
                  {faq.answer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-8 text-center text-[#05294E]">
            Perguntas frequentes
          </h2>

          <div className="max-w-3xl mx-auto space-y-1">
            {[0, 1, 2, 3, 4, 5].map(renderItem)}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AffiliateRegistration;
