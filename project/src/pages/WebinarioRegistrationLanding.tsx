import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MonitorPlay, ArrowRight, ChevronDown } from 'lucide-react';


const WebinárioRegistrationLanding: React.FC = () => {
  const scholarshipsData = [
    { name: "Master of Business Administration", price: "$545/mês" },
    { name: "Master of Computer Information Systems", price: "$585/mês" },
    { name: "Bachelor of Business Administration", price: "$585/mês" },
    { name: "Master of Divinity", price: "$460/mês" },
    { name: "Doctor of Business Administration", price: "$625/mês" },
    { name: "Master of Science in IT Management", price: "$585/mês" },
    { name: "Professional Master of Business Administration", price: "$595/mês" },
    { name: "MS In Information Technology", price: "$550/mês" },
    { name: "Bachelor of Science in Psychology", price: "$515/mês" },
    { name: "Executive Master of Data Science", price: "$600/mês" }
  ];

  const carouselItems = [...scholarshipsData, ...scholarshipsData, ...scholarshipsData];
  const whatsappGroupLink = "https://wa.live/your-group-link"; // Placeholder, can be updated later

  const comparisonData = [
    {
      name: "Escola de inglês",
      investment: "$600/mês",
      flexibility: "Baixa",
      scholarship: false,
      diploma: false,
      outlook: "Limitada",
      highlight: false,
      icon: null
    },
    {
      name: "Faculdade sem bolsa",
      investment: "$1.000 a $2.000/mês",
      flexibility: "Média a alta",
      scholarship: false,
      diploma: true,
      outlook: "Alta",
      highlight: false,
      icon: null
    },
    {
      name: "Faculdade com bolsa",
      investment: "A partir de $500/mês",
      flexibility: "Alta",
      scholarship: true,
      diploma: true,
      outlook: "Alta",
      highlight: true,
      tag: "O Caminho Ideal",
      icon: null
    }
  ];

  const faqItems = [
    {
      q: "1. Esse webinário é para mim mesmo?",
      a: "Esse webinário é para quem quer estudar nos Estados Unidos com mais estratégia e quer entender qual caminho faz mais sentido para o próprio perfil. Ele serve para 3 perfis principais: quem quer começar como Initial, quem quer fazer Transfer e quem quer fazer Troca de Status."
    },
    {
      q: "2. Eu ainda estou fora dos Estados Unidos. Esse webinário serve para mim?",
      a: "Sim. Se você está fora dos EUA e quer entender como começar sua jornada em uma faculdade americana com mais clareza sobre investimento, bolsa, flexibilidade e próximos passos, esse webinário serve para você."
    },
    {
      q: "3. Eu estou em escola de inglês nos Estados Unidos. Esse webinário também serve?",
      a: "Sim. Se você sente que está pagando caro, gastando muito tempo em aula e quer entender se existe uma rota melhor para estudar em uma faculdade americana, esse webinário foi feito para você."
    },
    {
      q: "4. Eu estou nos EUA com visto de turista. Esse webinário também serve?",
      a: "Sim. O webinário também foi criado para quem entrou nos Estados Unidos com visto de turista, decidiu ficar e quer entender como continuar legalmente estudando no país."
    },
    {
      q: "5. Eu preciso já saber se meu caso é Initial, Transfer ou Troca de Status?",
      a: "Não. Você não precisa chegar com isso definido. O webinário existe justamente para ajudar você a entender qual desses caminhos faz mais sentido para o seu caso."
    },
    {
      q: "6. O webinário vai me ajudar a entender se meu foco deve ser preço, flexibilidade ou trabalho legal?",
      a: "Sim. Esse é um dos pontos centrais da aula. Você vai entender como essas prioridades mudam completamente a melhor escolha e por que não faz sentido decidir isso no escuro."
    },
    {
      q: "7. O webinário vai mostrar valores, bolsa e possibilidades reais?",
      a: "Sim. A aula foi desenhada para mostrar comparativos reais, explicar como funcionam bolsa, investimento, flexibilidade e o caminho para autorização de trabalho legal no momento certo."
    },
    {
      q: "8. O webinário é gratuito de verdade?",
      a: "Sim. A inscrição e a participação no webinário são gratuitas."
    },
    {
      q: "9. Eu vou sair do webinário sabendo qual é o próximo passo?",
      a: "Esse é exatamente o objetivo. O webinário foi criado para tirar você da confusão e mostrar qual direção faz mais sentido para o seu perfil, seu momento e sua prioridade."
    },
    {
      q: "10. Isso vai ser só conteúdo ou vocês vão mostrar uma solução prática?",
      a: "Você vai entender o cenário, os caminhos e também qual é o primeiro passo para avançar com estratégia. A ideia não é te deixar com mais informação solta. É te ajudar a enxergar a rota certa."
    },
    {
      q: "11. O webinário serve para quem quer pagar menos para estudar nos EUA?",
      a: "Sim. Se uma das suas prioridades é encontrar uma opção mais acessível, o webinário vai mostrar como comparar os caminhos certos e como isso influencia sua decisão."
    },
    {
      q: "12. O webinário serve para quem quer mais flexibilidade?",
      a: "Sim. Flexibilidade é uma das prioridades centrais desse público, e o webinário mostra como isso impacta a escolha da melhor instituição e do melhor caminho."
    },
    {
      q: "13. O webinário serve para quem quer entender possibilidade de trabalho legal?",
      a: "Sim. O webinário também aborda como funciona esse caminho no momento certo, dentro de uma estrutura mais estratégica de estudo nos Estados Unidos."
    },
    {
      q: "14. Por que vale a pena participar ao vivo?",
      a: "Porque ao vivo você entende a lógica completa, acompanha a explicação na ordem certa e chega no final com muito mais clareza sobre o que faz sentido para o seu caso."
    }
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-blue-500/30">
      {/* Fundo Global Profissional */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-slate-950">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-[20%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]"></div>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[50px]"></div>
      </div>

      <div className="relative z-10 w-full">
        {/* Simplified Header for Landing Page */}
        <header className="py-10 flex justify-center w-full">
          <img 
            src="/logo.png.png" 
            alt="Matrícula USA" 
            className="h-20 md:h-24 w-auto opacity-90 hover:opacity-100 transition-opacity"
          />
        </header>

        {/* Hero Section */}
        <section className="relative min-h-[80vh] flex flex-col justify-center pb-12 lg:pb-20">
          <div className="max-w-7xl mx-auto px-4 relative z-10 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center lg:text-left"
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-50 to-indigo-100">
                  Descubra o melhor caminho para estudar e trabalhar nos EUA
                </h1>
                
                <p className="text-lg md:text-xl text-blue-100/80 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-light">
                  Uma masterclass focada em transição legal, bolsas exclusivas de até 90% e flexibilidade para quem já está ou deseja ir pros Estados Unidos.
                </p>
                
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10 max-w-2xl mx-auto lg:mx-0">
                  <div className="flex flex-col items-center lg:items-start gap-0.5 bg-white/5 backdrop-blur-md p-2.5 sm:p-4 rounded-2xl border border-white/10">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mb-1" />
                    <span className="text-[11px] sm:text-xs text-blue-200/60 uppercase font-bold tracking-tighter text-center lg:text-left">Data</span>
                    <span className="text-sm sm:text-lg font-black text-center lg:text-left whitespace-nowrap">16/04/26</span>
                  </div>
                  <div className="flex flex-col items-center lg:items-start gap-0.5 bg-white/5 backdrop-blur-md p-2.5 sm:p-4 rounded-2xl border border-white/10">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mb-1" />
                    <span className="text-[11px] sm:text-xs text-blue-200/60 uppercase font-bold tracking-tighter text-center lg:text-left">Hora</span>
                    <span className="text-sm sm:text-lg font-black text-center lg:text-left whitespace-nowrap">20:00h</span>
                  </div>
                  <div className="flex flex-col items-center lg:items-start gap-0.5 bg-white/5 backdrop-blur-md p-2.5 sm:p-4 rounded-2xl border border-white/10">
                    <MonitorPlay className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mb-1" />
                    <span className="text-[11px] sm:text-xs text-blue-200/60 uppercase font-bold tracking-tighter text-center lg:text-left">Local</span>
                    <span className="text-sm sm:text-lg font-black text-center lg:text-left whitespace-nowrap">Online</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-6">
                  <a 
                    href={whatsappGroupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold py-5 px-8 rounded-2xl transition-all duration-300 hover:scale-105 shadow-[0_20px_50px_rgba(37,99,235,0.3)] group"
                  >
                    Fazer inscrição gratuita
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="relative order-first lg:order-last mb-10 lg:mb-0"
              >
                <div className="absolute -inset-4 bg-gradient-to-br from-blue-600/15 to-indigo-600/15 blur-2xl rounded-[3rem]"></div>
                <div className="relative rounded-[2.5rem] lg:rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-square sm:aspect-video lg:aspect-[4/5] max-w-md mx-auto lg:max-w-none">
                  <img 
                    src="/client-3.jpeg" 
                    alt="Aluno de sucesso" 
                    className="w-full h-full object-cover object-top lg:object-bottom"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:from-slate-900/40"></div>
                </div>
              </motion.div>
            </div>

            {/* Scholarships Carousel */}
            <div className="mt-20 lg:mt-32 relative">
              <p className="text-blue-200/60 text-sm font-bold uppercase tracking-[0.3em] mb-10 text-center">
                Oportunidades com bolsas exclusivas
              </p>
              
              <div 
                className="relative w-full overflow-hidden h-40 flex items-center py-4"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
                }}
              >
                <div className="flex w-full">
                  <motion.div 
                    className="flex gap-8 items-center whitespace-nowrap"
                    animate={{ x: ["0%", "-33.33%"] }}
                    transition={{ 
                      duration: 50, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                  >
                    {carouselItems.map((item, i) => (
                      <div 
                        key={i} 
                        className="flex flex-col items-center justify-center text-center bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl min-w-[320px] hover:border-emerald-500/30 transition-all duration-300 group shadow-xl"
                      >
                        <span className="text-slate-200 text-sm font-bold mb-2 truncate max-w-full group-hover:text-white transition-colors">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 text-3xl font-black tracking-tighter">
                            {item.price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
              
              <p className="text-slate-400 text-sm mt-8 text-center italic opacity-70">
                * Valores mensais aproximados baseados em bolsas parciais. Consulte condições específicas no webinário.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Para quem é este webinário Premium */}
        <section className="py-24 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 relative z-10">
            <div className="text-center mb-16 lg:mb-20">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                Para quem é este <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">webinário?</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Este evento foi desenhado especificamente para quem busca o caminho estratégico para a faculdade americana.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
              {[
                {
                  title: 'Transfer',
                  subtitle: 'Mudança de Instituição',
                  desc: 'Para quem já está em escola de inglês nos EUA e quer migrar para uma faculdade com mais flexibilidade e diploma.',
                },
                {
                  title: 'COS',
                  subtitle: 'Troca de Status',
                  desc: 'Para quem entrou como turista e deseja continuar no país legalmente através do visto de estudante em uma faculdade.',
                },
                {
                  title: 'Initial',
                  subtitle: 'Novo Estudante',
                  desc: 'Para quem está no Brasil (ou fora dos EUA) e quer iniciar sua jornada direto em uma faculdade de alta qualidade.',
                }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                  className="relative bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-10"
                >
                  <span className="text-blue-400/60 text-xs font-bold uppercase tracking-widest mb-3 block">{item.subtitle}</span>
                  <h3 className="text-3xl font-black text-white mb-5">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-lg font-medium">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16"
            >
              <div className="flex flex-row items-center justify-center gap-4 max-w-3xl mx-auto px-4">
                <span className="text-2xl shrink-0">💡</span>
                <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed italic text-left">
                  Se você sente que está sem direção e quer clareza sobre o próximo passo para o seu perfil, <span className="text-blue-400">este webinário foi feito para você</span>.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 3: O que você vai aprender Premium */}
        <section className="py-32 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center mb-20 lg:mb-24">
              <h2 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">
                O que você vai <br className="md:hidden" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">descobrir nessa aula</span>
              </h2>
            </div>
            
            <div className="relative flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-10">
              {/* Coluna Esquerda */}
              <div className="flex-1 space-y-5 z-10 w-full">
                {[
                  "Como trabalhar e estudar nos EUA legalmente através de faculdades exclusivas",
                  "A diferença entre escola de inglês, faculdade sem bolsa e faculdade com bolsa",
                  "Como algumas faculdades americanas acreditadas podem reduzir o investimento mensal para $500",
                  "Como ter garantia de aprovação durante o processo"
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: idx * 0.1, duration: 0.8, ease: "easeOut" }}
                    className="bg-slate-900/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-2xl text-center"
                  >
                    <span className="text-lg font-medium text-slate-200 leading-relaxed">{item}</span>
                  </motion.div>
                ))}
              </div>

              {/* Imagem Central Premium */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative shrink-0 w-full lg:w-[480px] self-stretch min-h-[550px] rounded-[3.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(37,99,235,0.15)] z-20 order-first lg:order-none"
              >
                <img 
                  src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/university-campus-chapel-tower-blue-sky.webp" 
                  alt="Sucesso nos EUA" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
              </motion.div>

              {/* Coluna Direita */}
              <div className="flex-1 space-y-5 z-10 w-full">
                {[
                  "Bolsas de estudos em universidades americanas exclusivas de até 90% de desconto",
                  "Como ter acesso a cursos híbridos, com aulas presenciais uma vez por semestre",
                  "Passo a passo para realizar o processo seletivo para conseguir essas bolsas",
                  "Como conseguir fazer uma faculdade, mestrado ou doutorado nos EUA"
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: idx * 0.1, duration: 0.8, ease: "easeOut" }}
                    className="bg-slate-900/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 shadow-2xl text-center"
                  >
                    <span className="text-lg font-medium text-slate-200 leading-relaxed">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Comparativo Principal */}
        <section className="py-24 relative">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                Escola de inglês, faculdade sem bolsa <br className="hidden md:block" /> ou <span className="text-blue-500">faculdade com bolsa?</span>
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Em vez de olhar só para a mensalidade, você precisa comparar o cenário completo e o impacto no seu futuro.
              </p>
            </div>

            <div className="relative group">
              {/* Brilho de fundo */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-70 transition duration-1000"></div>
              
              {/* Desktop Vertical Table View */}
              <div className="relative hidden lg:block overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                <table className="w-full text-center border-collapse">
                  <tbody className="divide-y divide-white/5">
                    {/* Header Row: Options */}
                    <tr className="bg-white/[0.03]">
                      <th className="p-8 font-bold text-slate-400 uppercase text-xs tracking-widest bg-white/[0.02] border-r border-white/5 w-1/4">Escopo</th>
                      {comparisonData.map((row, idx) => (
                        <th 
                          key={idx} 
                          className={`p-8 font-black text-xl uppercase tracking-tight ${
                            row.highlight ? 'text-blue-400 bg-blue-600/[0.05]' : 'text-slate-200'
                          } ${idx < comparisonData.length - 1 ? 'border-r border-white/5' : ''}`}
                        >
                          <div>{row.name}</div>
                          {row.tag && (
                            <span className="inline-block bg-blue-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-2 shadow-lg shadow-blue-500/20">
                              {row.tag}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>

                    {/* Investment Row */}
                    <tr>
                      <td className="p-8 font-bold text-slate-400 uppercase text-xs tracking-widest bg-white/[0.01] border-r border-white/5 text-center">Investimento</td>
                      {comparisonData.map((row, idx) => (
                        <td 
                          key={idx} 
                          className={`p-8 font-bold text-lg ${
                            row.highlight ? 'text-blue-300 bg-blue-600/[0.03]' : 'text-slate-300'
                          } ${idx < comparisonData.length - 1 ? 'border-r border-white/5' : ''}`}
                        >
                          {row.investment}
                        </td>
                      ))}
                    </tr>

                    {/* Flexibility Row */}
                    <tr>
                      <td className="p-8 font-bold text-slate-400 uppercase text-xs tracking-widest bg-white/[0.01] border-r border-white/5 text-center">Flexibilidade</td>
                      {comparisonData.map((row, idx) => (
                        <td 
                          key={idx} 
                          className={`p-8 ${
                            row.highlight ? 'bg-blue-600/[0.03]' : ''
                          } ${idx < comparisonData.length - 1 ? 'border-r border-white/5' : ''}`}
                        >
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                            row.flexibility === 'Alta' 
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                              : row.flexibility === 'Média a alta'
                              ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {row.flexibility}
                          </span>
                        </td>
                      ))}
                    </tr>

                    {/* Scholarship Row */}
                    <tr>
                      <td className="p-8 font-bold text-slate-400 uppercase text-xs tracking-widest bg-white/[0.01] border-r border-white/5 text-center">Bolsa</td>
                      {comparisonData.map((row, idx) => (
                        <td 
                          key={idx} 
                          className={`p-8 font-bold text-lg ${
                            row.scholarship ? 'text-emerald-400' : 'text-rose-500'
                          } ${row.highlight ? 'bg-blue-600/[0.03]' : ''} ${idx < comparisonData.length - 1 ? 'border-r border-white/5' : ''}`}
                        >
                          {row.scholarship ? 'Sim, até 90%' : 'Não'}
                        </td>
                      ))}
                    </tr>

                    {/* Diploma Row */}
                    <tr>
                      <td className="p-8 font-bold text-slate-400 uppercase text-xs tracking-widest bg-white/[0.01] border-r border-white/5 text-center">Diploma</td>
                      {comparisonData.map((row, idx) => (
                        <td 
                          key={idx} 
                          className={`p-8 font-bold text-lg ${
                            row.diploma ? 'text-emerald-400' : 'text-rose-500/70'
                          } ${row.highlight ? 'bg-blue-600/[0.03]' : ''} ${idx < comparisonData.length - 1 ? 'border-r border-white/5' : ''}`}
                        >
                          {row.diploma ? 'Sim' : 'Não'}
                        </td>
                      ))}
                    </tr>

                    {/* Outlook Row */}
                    <tr>
                      <td className="p-8 font-bold text-slate-400 uppercase text-xs tracking-widest bg-white/[0.01] border-r border-white/5 text-center">Longo Prazo</td>
                      {comparisonData.map((row, idx) => (
                        <td 
                          key={idx} 
                          className={`p-8 font-bold text-lg ${
                            row.highlight ? 'text-blue-300 bg-blue-600/[0.03]' : 'text-slate-300'
                          } ${idx < comparisonData.length - 1 ? 'border-r border-white/5' : ''}`}
                        >
                          {row.outlook}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {comparisonData.map((row, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className={`relative p-6 rounded-3xl border ${
                      row.highlight 
                        ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                        : 'bg-slate-900/60 border-white/5'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center mb-6">
                      <h3 className={`text-xl font-black ${row.highlight ? 'text-white' : 'text-slate-200'}`}>
                        {row.name}
                      </h3>
                      {row.tag && (
                        <span className="inline-block bg-blue-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-1">
                          {row.tag}
                        </span>
                      )}
                      <div className={`mt-3 font-bold text-lg ${row.highlight ? 'text-blue-400' : 'text-slate-400'}`}>
                        {row.investment}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm text-center">
                      <div className="text-slate-500 font-medium">Flexibilidade</div>
                      <div className={`font-bold ${row.flexibility === 'Alta' ? 'text-blue-400' : 'text-slate-300'}`}>{row.flexibility}</div>
                      
                      <div className="text-slate-500 font-medium">Bolsa</div>
                      <div className={`font-bold ${
                        row.scholarship 
                          ? 'text-emerald-400' 
                          : 'text-rose-500'
                      }`}>{row.scholarship ? 'Sim, 90%' : 'Não'}</div>
                      
                      <div className="text-slate-500 font-medium">Diploma</div>
                      <div className={`font-bold ${row.diploma ? 'text-emerald-400' : 'text-rose-500'}`}>{row.diploma ? 'Sim' : 'Não'}</div>
                      
                      <div className="text-slate-500 font-medium">Longo Prazo</div>
                      <div className={`font-bold ${row.highlight ? 'text-blue-300' : 'text-slate-300'}`}>{row.outlook}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-16">
                <div className="flex flex-row items-center justify-center gap-4 max-w-3xl mx-auto px-4">
                  <span className="text-2xl shrink-0">💡</span>
                  <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed italic text-left">
                    Ao participar do webinário, você vai entender por que tanta gente continua presa na opção menos vantajosa sem perceber que pode existir um caminho melhor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Prova Social Premium */}
        <section className="py-24 lg:py-32 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center mb-16 lg:mb-24">
              <h2 className="text-3xl md:text-5xl font-black mb-6 text-white leading-tight tracking-tight">
                Veja o que outros <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">alunos descobriram</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Conheça estudantes que pararam de perder tempo e encontraram uma rota concreta para a faculdade americana.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
              {[
                { 
                  img: "/client-1.jpeg", 
                  text: "Eles perceberam que estavam pagando caro em escola de inglês sem diploma e sem avanço real, encontrando aqui o caminho para a faculdade americana." 
                },
                { 
                  img: "/client-2.jpeg", 
                  text: "Descobriram caminhos muito mais acessíveis e flexíveis para os estudos nos EUA, garantindo a permanência legal e estratégica." 
                },
                { 
                  img: "/client-5.jpeg", 
                  text: "Encontraram opções com bolsa, estrutura híbrida e uma direção clara para o próximo passo na carreira internacional." 
                },
                { 
                  img: "/client-8.jpeg", 
                  text: "Passaram a enxergar uma rota concreta para estudar em faculdade americana e construir um futuro sólido no país." 
                }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  className="group flex flex-col bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-500 shadow-2xl"
                >
                  <div className="relative h-[400px] lg:h-[450px] overflow-hidden">
                    <img 
                      src={item.img} 
                      alt="Aluno MatriculaUSA" 
                      className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
                    
                    {/* Quote Icon Overlay */}
                    <div className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg flex items-center justify-center border border-white/10">
                      <span className="text-blue-400 text-2xl font-black italic">"</span>
                    </div>
                  </div>
                  
                  <div className="p-8 lg:p-12 relative">
                    <p className="text-lg lg:text-xl text-slate-200 leading-relaxed font-medium italic">
                      {item.text}
                    </p>
                    <div className="mt-6 w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-60"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 9: Chamada para Inscrição Premium */}
        <section className="py-32 relative overflow-hidden">
          {/* Background Glows decorativos */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -z-10"></div>
          
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-8 md:p-16 rounded-[3rem] shadow-2xl relative"
            >
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tight">
                Garanta sua vaga no <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">próximo webinário</span>
              </h2>
              
              <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
                A participação é gratuita, mas a sala tem limite de participantes para garantirmos a qualidade da experiência.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-12">
                <div className="bg-white/[0.03] backdrop-blur-md px-6 py-5 rounded-3xl border border-white/5 shadow-inner">
                  <span className="block text-blue-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-70">Data</span>
                  <span className="text-xl sm:text-3xl font-black text-white whitespace-nowrap">16/04/26</span>
                </div>
                <div className="bg-white/[0.03] backdrop-blur-md px-6 py-5 rounded-3xl border border-white/5 shadow-inner">
                  <span className="block text-blue-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-70">Horário</span>
                  <span className="text-xl sm:text-3xl font-black text-white whitespace-nowrap">20:00h</span>
                </div>
              </div>

              <div className="space-y-6">
                <a 
                  href={whatsappGroupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center justify-center gap-3 bg-white text-slate-950 text-xl md:text-2xl font-black py-6 px-12 rounded-full transition-all hover:scale-105 shadow-[0_20px_50px_rgba(255,255,255,0.15)] w-full md:w-auto overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    QUERO ME INSCREVER AGORA
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 relative">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Perguntas Frequentes (FAQ)</h2>
              <p className="text-lg text-slate-400">Tire suas dúvidas e garanta seu lugar com tranquilidade.</p>
            </div>

            <div className="space-y-4">
              {faqItems.map((faq, index) => (
                <details key={index} className="group bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl [&_summary::-webkit-details-marker]:hidden transition-all duration-300">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-6 font-bold text-white text-lg hover:text-blue-400 transition-colors">
                    {faq.q}
                    <ChevronDown className="w-6 h-6 shrink-0 transition duration-300 group-open:-rotate-180 text-blue-400" />
                  </summary>
                  <div className="px-6 pb-6 text-slate-400 text-lg leading-relaxed border-t border-white/5 pt-4 mt-2">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Footer Minimalista */}
        <footer className="py-12 text-center relative z-10">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Matrícula USA. Todos os direitos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default WebinárioRegistrationLanding;
