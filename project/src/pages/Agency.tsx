import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Share2, CheckCircle, ArrowRight, DollarSign, Link2, ChevronDown, GraduationCap,
  Briefcase, Users, ShieldCheck, FileText, Headphones,
  LayoutDashboard, TrendingUp, Rocket, Building2, MessageCircle, MousePointerClick,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ───────────────────────── Mockups ilustrativos ─────────────────────────
   Pequenas interfaces "fake" do sistema, no estilo dos mockups da landing
   de afiliados. Apenas ilustrativas — sem interatividade real. */

// Bolsas exclusivas
const MockupScholarships: React.FC = () => (
  <div className="space-y-2 text-left">
    {[
      { name: 'MBA · Florida Univ.', tag: 'Exclusiva', value: '70% OFF' },
      { name: 'CS · Texas College', tag: 'Parceiros', value: '60% OFF' },
    ].map(({ name, tag, value }) => (
      <div key={name} className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-2.5 py-2 shadow-sm">
        <div className="w-7 h-7 rounded-lg bg-[#05294E]/8 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-3.5 h-3.5 text-[#05294E]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black text-slate-800 truncate leading-tight">{name}</p>
          <span className="text-[7px] font-bold uppercase tracking-wider text-amber-600">{tag}</span>
        </div>
        <span className="text-[10px] font-black text-emerald-600 flex-shrink-0">{value}</span>
      </div>
    ))}
  </div>
);

// Plataforma de gestão
const MockupDashboard: React.FC = () => (
  <div className="space-y-2 text-left">
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-white rounded-xl border border-slate-100 px-2.5 py-2 shadow-sm">
        <div className="flex items-center gap-1 text-slate-400 mb-0.5">
          <Users className="w-2.5 h-2.5" />
          <span className="text-[7px] font-bold uppercase tracking-wider">Leads</span>
        </div>
        <p className="text-base font-black text-[#05294E] leading-none">48</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 px-2.5 py-2 shadow-sm">
        <div className="flex items-center gap-1 text-slate-400 mb-0.5">
          <TrendingUp className="w-2.5 h-2.5" />
          <span className="text-[7px] font-bold uppercase tracking-wider">Convers.</span>
        </div>
        <p className="text-base font-black text-emerald-600 leading-none">31%</p>
      </div>
    </div>
    <div className="bg-white rounded-xl border border-slate-100 px-2.5 py-2 shadow-sm">
      <div className="flex items-end gap-1 h-8">
        {[40, 65, 50, 80, 70, 95].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-[#05294E]/70" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  </div>
);

// Vendedores associados
const MockupSellers: React.FC = () => (
  <div className="space-y-1.5 text-left">
    {[
      { name: 'João Lima', src: 'https://i.pravatar.cc/40?img=12' },
      { name: 'Maria Souza', src: 'https://i.pravatar.cc/40?img=32' },
      { name: 'Pedro Alves', src: 'https://i.pravatar.cc/40?img=45' },
    ].map(({ name, src }) => (
      <div key={name} className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-2.5 py-1.5 shadow-sm">
        <img src={src} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
        <span className="text-[9px] font-black text-slate-800 truncate flex-1">{name}</span>
        <span className="flex items-center gap-0.5 text-[7px] font-bold uppercase tracking-wider text-emerald-600 flex-shrink-0">
          <CheckCircle className="w-2.5 h-2.5" /> Link
        </span>
      </div>
    ))}
  </div>
);

// Acompanhamento dos processos
const MockupTracking: React.FC = () => {
  const steps = ['Cadastro', 'Documentos', 'Análise', 'Pagamento', 'Matrícula'];
  const done = 3;
  return (
    <div className="space-y-2 text-left">
      <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-2.5 py-1.5 shadow-sm">
        <img src="https://i.pravatar.cc/40?img=68" alt="" className="w-6 h-6 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="text-[9px] font-black text-slate-800 leading-tight truncate">Ana Ribeiro</p>
          <p className="text-[7px] font-bold uppercase tracking-wider text-[#05294E]">Em análise</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${
              i < done ? 'bg-emerald-500 text-white' : i === done ? 'bg-[#05294E] text-white' : 'bg-slate-200 text-slate-400'
            }`}>
              {i < done ? <CheckCircle className="w-2.5 h-2.5" /> : <span className="text-[6px] font-black">{i + 1}</span>}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 rounded-full ${i < done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Checkout com sua marca
const MockupCheckout: React.FC = () => (
  <div className="text-left bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-slate-100">
      <div className="w-4 h-4 rounded bg-gradient-to-br from-[#05294E] to-[#0a4a8a] flex items-center justify-center">
        <span className="text-white text-[6px] font-black">A</span>
      </div>
      <span className="text-[8px] font-black text-slate-700">Sua Agência</span>
      <span className="ml-auto text-[6px] font-bold uppercase tracking-wider text-slate-300">Checkout</span>
    </div>
    <div className="px-2.5 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-slate-500 font-medium">Selection Fee</span>
        <span className="text-[9px] font-black text-slate-800">$ 350</span>
      </div>
      <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
        <DollarSign className="w-2.5 h-2.5 text-slate-400" />
        <span className="text-[7px] text-slate-400 font-bold">•••• •••• •••• 4242</span>
      </div>
      <button disabled className="w-full bg-[#05294E] text-white py-1.5 rounded-lg text-[7px] font-black uppercase tracking-wider cursor-default">
        Pagar com segurança
      </button>
    </div>
  </div>
);

// Links rastreáveis
const MockupLinks: React.FC = () => (
  <div className="space-y-2 text-left">
    <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-100 px-2 py-1.5 shadow-sm">
      <Link2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
      <span className="text-[8px] font-bold text-slate-600 truncate flex-1">matriculausa.com/r/AGN-7K3D</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-white rounded-xl border border-slate-100 px-2 py-1.5 shadow-sm">
        <div className="flex items-center gap-1 text-slate-400 mb-0.5">
          <MousePointerClick className="w-2.5 h-2.5" />
          <span className="text-[7px] font-bold uppercase tracking-wider">Cliques</span>
        </div>
        <p className="text-sm font-black text-[#05294E] leading-none">214</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 px-2 py-1.5 shadow-sm">
        <div className="flex items-center gap-1 text-slate-400 mb-0.5">
          <CheckCircle className="w-2.5 h-2.5" />
          <span className="text-[7px] font-bold uppercase tracking-wider">Convers.</span>
        </div>
        <p className="text-sm font-black text-emerald-600 leading-none">37</p>
      </div>
    </div>
  </div>
);

// Materiais comerciais
const MockupMaterials: React.FC = () => (
  <div className="grid grid-cols-3 gap-2 text-left">
    {[
      { label: 'Bolsas', color: 'from-[#05294E] to-[#0a4a8a]' },
      { label: 'Pitch', color: 'from-emerald-500 to-green-600' },
      { label: 'FAQ', color: 'from-sky-500 to-blue-600' },
    ].map(({ label, color }) => (
      <div key={label} className="bg-white rounded-xl border border-slate-100 p-1.5 shadow-sm">
        <div className={`h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-1`}>
          <FileText className="w-3.5 h-3.5 text-white/90" />
        </div>
        <p className="text-[7px] font-black text-slate-600 text-center uppercase tracking-wider">{label}</p>
      </div>
    ))}
  </div>
);

// Suporte Matrícula USA
const MockupSupport: React.FC = () => (
  <div className="space-y-1.5 text-left">
    <div className="flex items-start gap-1.5">
      <div className="w-5 h-5 rounded-full bg-[#05294E] flex items-center justify-center flex-shrink-0">
        <Headphones className="w-2.5 h-2.5 text-white" />
      </div>
      <div className="bg-white rounded-xl rounded-tl-sm border border-slate-100 px-2 py-1.5 shadow-sm">
        <p className="text-[8px] font-medium text-slate-600 leading-snug">Oi! Posso ajudar com a aplicação da Ana?</p>
      </div>
    </div>
    <div className="flex items-start gap-1.5 flex-row-reverse">
      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <MessageCircle className="w-2.5 h-2.5 text-white" />
      </div>
      <div className="bg-emerald-50 rounded-xl rounded-tr-sm border border-emerald-100 px-2 py-1.5">
        <p className="text-[8px] font-medium text-emerald-700 leading-snug">Sim, obrigado! 🙌</p>
      </div>
    </div>
  </div>
);

const Agency: React.FC = () => {
  return (
    <div className="relative bg-white min-h-screen font-sans overflow-hidden">

      {/* Efeito de luminosidade azul no topo */}
      <div className="absolute inset-x-0 top-0 h-[900px] z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[1000px] h-[700px] bg-blue-500/20 rounded-full blur-[150px]"></div>
        <div className="absolute top-[200px] left-1/4 w-[600px] h-[500px] bg-[#05294E]/12 rounded-full blur-[130px]"></div>
        <div className="absolute top-[200px] right-1/4 w-[600px] h-[500px] bg-sky-400/20 rounded-full blur-[130px]"></div>
      </div>

      {/* 1. Hero */}
      <section className="relative pt-20 pb-24 lg:pt-24 lg:pb-28 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] leading-tight tracking-tight max-w-4xl mx-auto">
            Venda bolsas de estudo nos EUA com uma estrutura pronta para sua agência
          </h1>
          <p className="text-lg lg:text-xl text-[#05294E]/70 mt-5 max-w-3xl mx-auto leading-relaxed font-medium">
            Sua agência pode oferecer oportunidades em universidades americanas, acessar bolsas exclusivas para parceiros e ganhar por cada aluno matriculado pelo <strong className="text-[#05294E]">Matrícula USA</strong>.
          </p>
          <p className="text-base lg:text-lg text-[#05294E]/60 mt-4 max-w-2xl mx-auto leading-relaxed font-medium">
            Nós fornecemos a plataforma, o processo e o suporte. Você indica os alunos e acompanha tudo em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              to="/register?tab=agency"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#05294E] text-white text-sm font-black tracking-wide hover:bg-[#041f38] transition-colors shadow-lg shadow-[#05294E]/20"
            >
              Quero ser uma agência parceira
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#contato"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#05294E]/20 text-[#05294E] text-sm font-semibold hover:bg-[#05294E]/5 transition-colors"
            >
              Falar com o time comercial
            </a>
          </div>
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
                'Nova fonte de receita',
                'Bolsas exclusivas para parceiros',
                'Plataforma pronta para vender',
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
                <p className="text-4xl sm:text-5xl font-black text-[#05294E] leading-none">100+</p>
                <p className="text-slate-500 text-sm sm:text-base mt-2 leading-snug">universidades parceiras nos EUA</p>
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
                  <strong className="text-[#05294E]">Agências</strong> que confiam no Matrícula USA
                </p>
              </motion.div>
            </div>

            {/* Imagem — agências (transbordando pelo topo no mobile e no desktop) */}
            <div className="relative z-[1] order-2 -mt-64 flex justify-center overflow-x-clip overflow-y-visible lg:mt-0 lg:overflow-visible lg:absolute lg:inset-x-0 lg:bottom-0 pointer-events-none">
              <motion.img
                src="/afiliado.png"
                alt="Agências parceiras MatriculaUSA"
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

      {/* 3a. A estrutura que sua agência recebe */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-slate-50/60">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Texto */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="lg:pr-4"
            >
              <span className="inline-block text-xs font-black uppercase tracking-widest text-[#05294E]/50 mb-3">
                A estrutura que sua agência recebe
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] tracking-tight leading-tight">
                Tudo para vender oportunidades nos EUA
              </h2>
              <p className="text-lg text-slate-500 mt-5 leading-relaxed font-medium">
                Ao entrar no programa de agências parceiras, sua empresa ganha acesso a uma operação completa para vender, acompanhar e escalar indicações de alunos.
              </p>
            </motion.div>

            {/* Cards (2x2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { mockup: <MockupScholarships />, title: 'Bolsas exclusivas para parceiros', desc: 'Acesse oportunidades de bolsas disponíveis apenas para agências cadastradas no Matrícula USA.' },
                { mockup: <MockupDashboard />, title: 'Plataforma de gestão', desc: 'Gerencie leads, clientes, vendedores, links e processos em um ambiente organizado.' },
                { mockup: <MockupSellers />, title: 'Vendedores associados', desc: 'Cadastre membros da sua equipe e gere links individuais para cada vendedor.' },
                { mockup: <MockupTracking />, title: 'Acompanhamento dos processos', desc: 'Veja em qual etapa cada cliente está: cadastro, documentos, análise, pagamento, matrícula e próximos passos.' },
              ].map(({ mockup, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.08 }}
                  className="h-full bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(0,0,0,0.04)] p-6 hover:shadow-[0_20px_50px_rgba(5,41,78,0.10)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="mb-5 rounded-2xl bg-slate-50/80 border border-slate-100 p-3.5 overflow-hidden">
                    {mockup}
                  </div>
                  <h3 className="text-base font-bold text-[#05294E] leading-snug mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3b. Estrutura — ferramentas comerciais */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Cards (2x2) — à esquerda no desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 order-2 lg:order-1">
              {[
                { mockup: <MockupCheckout />, title: 'Checkout com sua marca', desc: 'Ofereça uma experiência mais profissional com checkout personalizado com a logo da sua agência.' },
                { mockup: <MockupLinks />, title: 'Links rastreáveis', desc: 'Acompanhe indicações, conversões e desempenho por agência ou vendedor.' },
                { mockup: <MockupMaterials />, title: 'Materiais comerciais', desc: 'Receba materiais para apresentar as bolsas e explicar as oportunidades aos seus clientes.' },
                { mockup: <MockupSupport />, title: 'Suporte Matrícula USA', desc: 'Nossa equipe auxilia sua agência e os alunos indicados durante a jornada.' },
              ].map(({ mockup, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.08 }}
                  className="h-full bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(0,0,0,0.04)] p-6 hover:shadow-[0_20px_50px_rgba(5,41,78,0.10)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="mb-5 rounded-2xl bg-slate-50/80 border border-slate-100 p-3.5 overflow-hidden">
                    {mockup}
                  </div>
                  <h3 className="text-base font-bold text-[#05294E] leading-snug mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">{desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Texto — à direita no desktop */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="order-1 lg:order-2 lg:pl-4"
            >
              <span className="inline-block text-xs font-black uppercase tracking-widest text-[#05294E]/50 mb-3">
                Ferramentas comerciais
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] tracking-tight leading-tight">
                Venda com mais profissionalismo e controle
              </h2>
              <p className="text-lg text-slate-500 mt-5 leading-relaxed font-medium">
                Recursos pensados para sua agência apresentar as oportunidades, rastrear cada indicação e contar com o suporte do Matrícula USA em toda a jornada.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. Como funciona */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] tracking-tight">
              Como funciona a parceria
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            {[
              { icon: Building2, title: 'Sua agência se cadastra', desc: 'Você solicita acesso ao programa B2B do Matrícula USA.' },
              { icon: Rocket, title: 'Liberamos sua estrutura', desc: 'Sua agência recebe acesso à plataforma, bolsas, links e materiais comerciais.' },
              { icon: Share2, title: 'Você indica seus clientes', desc: 'Cada vendedor pode divulgar seu próprio link e cadastrar alunos interessados.' },
              { icon: GraduationCap, title: 'Nós conduzimos o processo', desc: 'O Matrícula USA orienta o aluno nas etapas de candidatura, documentos e matrícula.' },
              { icon: DollarSign, title: 'Sua agência acompanha e ganha', desc: 'Você acompanha o status dos clientes e recebe pelas conversões realizadas.' },
            ].map(({ icon: Icon, title, desc }, i, arr) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.1 }}
                className="relative flex gap-5 sm:gap-6"
              >
                {/* Trilha vertical + número */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="relative w-12 h-12 rounded-2xl bg-[#05294E] flex items-center justify-center text-white shadow-lg shadow-[#05294E]/20">
                    <Icon className="w-5 h-5" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                      {i + 1}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-[#05294E]/20 to-transparent my-2 min-h-[2rem]"></div>
                  )}
                </div>

                {/* Texto */}
                <div className="pb-10">
                  <h3 className="text-xl md:text-2xl font-bold text-[#05294E] tracking-tight leading-snug mb-1.5">{title}</h3>
                  <p className="text-base md:text-lg text-slate-400 leading-relaxed font-medium">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Diferencial — painel escuro */}
      <section className="relative py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#05294E] via-[#083a6e] to-[#0a4a8a] overflow-hidden px-8 py-14 sm:px-12 sm:py-16 lg:px-20 lg:py-20">
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute -top-20 right-0 w-[600px] h-[400px] bg-sky-400/20 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-0 -left-24 w-[450px] h-[450px] bg-blue-500/20 rounded-full blur-[110px]"></div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 max-w-3xl"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Mais do que indicação. Uma operação B2B completa.
              </h2>
              <p className="text-lg md:text-xl text-white/70 mt-6 leading-relaxed font-medium">
                O Matrícula USA não entrega apenas uma lista de universidades. Entregamos uma estrutura para sua agência vender com mais profissionalismo, acompanhar os processos com transparência e oferecer uma experiência melhor para o cliente.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-4">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-white/90 text-sm sm:text-base font-medium leading-snug">Sua agência mantém o relacionamento comercial.</p>
                </div>
                <div className="flex items-start gap-3 bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-4">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-white/90 text-sm sm:text-base font-medium leading-snug">O Matrícula USA cuida da estrutura educacional e operacional.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. Benefícios */}
      <section className="relative py-20 md:py-28 bg-slate-50/60">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#05294E] tracking-tight">
              Por que agências escolhem o Matrícula USA?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Briefcase, title: 'Mais produtos para vender', desc: 'Inclua bolsas de estudo nos EUA no portfólio da sua agência.' },
              { icon: LayoutDashboard, title: 'Mais controle da operação', desc: 'Acompanhe seus clientes, vendedores e conversões pela plataforma.' },
              { icon: ShieldCheck, title: 'Mais confiança para o cliente', desc: 'Ofereça uma jornada mais organizada, com checkout personalizado e acompanhamento claro.' },
              { icon: TrendingUp, title: 'Mais escala comercial', desc: 'Cadastre vendedores, distribua links e acompanhe a performance de cada um.' },
              { icon: CheckCircle, title: 'Menos complexidade', desc: 'Você não precisa criar relacionamento com universidades, sistema, checkout ou fluxo operacional.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: (i % 3) * 0.1 }}
                className="h-full bg-white rounded-3xl border border-slate-200/70 shadow-[0_10px_40px_rgba(0,0,0,0.04)] p-7 hover:shadow-[0_20px_50px_rgba(5,41,78,0.10)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#05294E]/8 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#05294E]" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#05294E] leading-snug mb-2">{title}</h3>
                <p className="text-base text-slate-400 leading-relaxed font-medium">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <AgencyFAQ />

      {/* 8. CTA final */}
      <section id="contato" className="relative py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#05294E] via-[#083a6e] to-[#0a4a8a] overflow-hidden px-8 py-14 sm:px-12 sm:py-16 text-center">
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-sky-400/20 rounded-full blur-[120px]"></div>
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto">
                Pronto para oferecer bolsas nos EUA aos seus clientes?
              </h2>
              <p className="text-lg text-white/70 mt-5 max-w-2xl mx-auto leading-relaxed font-medium">
                Torne sua agência parceira do Matrícula USA e tenha acesso a uma estrutura completa para vender oportunidades educacionais americanas com mais organização, controle e potencial de receita.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                <Link
                  to="/register?tab=agency"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-[#05294E] font-black tracking-wide hover:bg-slate-100 transition-colors shadow-lg"
                >
                  Quero ser uma agência parceira
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="mailto:contato@matriculausa.com"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  Agendar uma conversa
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const AGENCY_FAQS = [
  {
    question: 'Quanto custa para minha agência fazer parte?',
    answer: 'O cadastro no programa de agências parceiras é gratuito. Você solicita acesso ao programa B2B, recebe sua estrutura — plataforma, bolsas, links e materiais — e começa a indicar alunos.',
  },
  {
    question: 'Como funciona a remuneração da agência?',
    answer: 'A cada aluno indicado pela sua agência que se converte em matrícula, você recebe pela conversão realizada. Todo o desempenho e as conversões ficam visíveis no painel da sua agência.',
  },
  {
    question: 'A agência precisa cuidar do processo do aluno?',
    answer: 'Não. Você indica o aluno e o Matrícula USA conduz o processo: orientação nas etapas de candidatura, documentos e matrícula. Sua agência mantém o relacionamento comercial e nós cuidamos da estrutura educacional e operacional.',
  },
  {
    question: 'Posso cadastrar vendedores da minha equipe?',
    answer: 'Sim. Você cadastra membros da sua equipe como vendedores associados e gera links individuais para cada um, acompanhando indicações, conversões e desempenho por vendedor.',
  },
  {
    question: 'Quais oportunidades os alunos têm acesso?',
    answer: 'Os alunos têm acesso a universidades americanas, bolsas exclusivas para parceiros e cursos com formatos flexíveis, incluindo opções que podem permitir estudar e trabalhar legalmente nos Estados Unidos.',
  },
  {
    question: 'O Matrícula USA garante aprovação, bolsa ou visto?',
    answer: 'Não. Cada aluno passa por análise conforme os critérios das universidades e as etapas do processo. Nossa função é oferecer acesso a oportunidades educacionais, suporte estruturado e acompanhamento durante a jornada.',
  },
];

const AgencyFAQ: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const renderItem = (num: number) => {
    const faq = AGENCY_FAQS[num];
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

export default Agency;
