import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MonitorPlay, ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';

import { useUniversities } from '../hooks/useUniversities';

const WorkshopRegistrationLanding: React.FC = () => {
  const { universities, loading: logosLoading } = useUniversities();
  
  // Filtra apenas universidades com logos transparentes (PNG/SVG) e remove as de teste, default ou especificamente rejeitadas
  const filteredUniversities = universities.filter(uni => {
    const logo = uni.logo_url?.toLowerCase() || '';
    const nameStr = uni.name.toLowerCase();
    
    const isJpg = logo.endsWith('.jpg') || logo.endsWith('.jpeg');
    const isDefault = logo.includes('default') || nameStr.includes('teste');
    const isExcluded = nameStr.includes('st francis') || nameStr.includes('st. francis') || nameStr.includes('faulkner');
    
    return !isJpg && !isDefault && !isExcluded;
  });

  const carouselLogos = [...filteredUniversities, ...filteredUniversities];
  const whatsappGroupLink = "https://wa.live/your-group-link"; // Placeholder, can be updated later

  const faqItems = [
    {
      q: "1. Esse workshop é para mim mesmo?",
      a: "Esse workshop é para quem quer estudar nos Estados Unidos com mais estratégia e quer entender qual caminho faz mais sentido para o próprio perfil. Ele serve para 3 perfis principais: quem quer começar como Initial, quem quer fazer Transfer e quem quer fazer Troca de Status."
    },
    {
      q: "2. Eu ainda estou fora dos Estados Unidos. Esse workshop serve para mim?",
      a: "Sim. Se você está fora dos EUA e quer entender como começar sua jornada em uma faculdade americana com mais clareza sobre investimento, bolsa, flexibilidade e próximos passos, esse workshop serve para você."
    },
    {
      q: "3. Eu estou em escola de inglês nos Estados Unidos. Esse workshop também serve?",
      a: "Sim. Se você sente que está pagando caro, gastando muito tempo em aula e quer entender se existe uma rota melhor para estudar em uma faculdade americana, esse workshop foi feito para você."
    },
    {
      q: "4. Eu estou nos EUA com visto de turista. Esse workshop também serve?",
      a: "Sim. O workshop também foi criado para quem entrou nos Estados Unidos com visto de turista, decidiu ficar e quer entender como continuar legalmente estudando no país."
    },
    {
      q: "5. Eu preciso já saber se meu caso é Initial, Transfer ou Troca de Status?",
      a: "Não. Você não precisa chegar com isso definido. O workshop existe justamente para ajudar você a entender qual desses caminhos faz mais sentido para o seu caso."
    },
    {
      q: "6. O workshop vai me ajudar a entender se meu foco deve ser preço, flexibilidade ou trabalho legal?",
      a: "Sim. Esse é um dos pontos centrais da aula. Você vai entender como essas prioridades mudam completamente a melhor escolha e por que não faz sentido decidir isso no escuro."
    },
    {
      q: "7. O workshop vai mostrar valores, bolsa e possibilidades reais?",
      a: "Sim. A aula foi desenhada para mostrar comparativos reais, explicar como funcionam bolsa, investimento, flexibilidade e o caminho para autorização de trabalho legal no momento certo."
    },
    {
      q: "8. O workshop é gratuito de verdade?",
      a: "Sim. A inscrição e a participação no workshop são gratuitas."
    },
    {
      q: "9. Eu vou sair do workshop sabendo qual é o próximo passo?",
      a: "Esse é exatamente o objetivo. O workshop foi criado para tirar você da confusão e mostrar qual direção faz mais sentido para o seu perfil, seu momento e sua prioridade."
    },
    {
      q: "10. Isso vai ser só conteúdo ou vocês vão mostrar uma solução prática?",
      a: "Você vai entender o cenário, os caminhos e também qual é o primeiro passo para avançar com estratégia. A ideia não é te deixar com mais informação solta. É te ajudar a enxergar a rota certa."
    },
    {
      q: "11. O workshop serve para quem quer pagar menos para estudar nos EUA?",
      a: "Sim. Se uma das suas prioridades é encontrar uma opção mais acessível, o workshop vai mostrar como comparar os caminhos certos e como isso influencia sua decisão."
    },
    {
      q: "12. O workshop serve para quem quer mais flexibilidade?",
      a: "Sim. Flexibilidade é uma das prioridades centrais desse público, e o workshop mostra como isso impacta a escolha da melhor instituição e do melhor caminho."
    },
    {
      q: "13. O workshop serve para quem quer entender possibilidade de trabalho legal?",
      a: "Sim. O workshop também aborda como funciona esse caminho no momento certo, dentro de uma estrutura mais estratégica de estudo nos Estados Unidos."
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
        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-12 lg:pt-32 lg:pb-20">
          <div className="max-w-7xl mx-auto px-4 relative z-10 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-left"
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-50 to-indigo-100">
                  Descubra o melhor caminho para estudar e trabalhar nos EUA
                </h1>
                
                <p className="text-lg md:text-xl text-blue-100/80 mb-10 leading-relaxed max-w-2xl font-light">
                  Uma masterclass focada em transição legal, bolsas exclusivas de até 90% e flexibilidade para quem já está ou deseja ir pros Estados Unidos.
                </p>
                
                <div className="grid sm:grid-cols-3 gap-4 mb-10">
                  <div className="flex flex-col gap-1 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <Calendar className="w-5 h-5 text-blue-400 mb-1" />
                    <span className="text-xs text-blue-200/60 uppercase font-bold tracking-tighter">Data</span>
                    <span className="font-bold">16/04/2026</span>
                  </div>
                  <div className="flex flex-col gap-1 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <Clock className="w-5 h-5 text-blue-400 mb-1" />
                    <span className="text-xs text-blue-200/60 uppercase font-bold tracking-tighter">Horário</span>
                    <span className="font-bold">20:00h</span>
                  </div>
                  <div className="flex flex-col gap-1 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <MonitorPlay className="w-5 h-5 text-blue-400 mb-1" />
                    <span className="text-xs text-blue-200/60 uppercase font-bold tracking-tighter">Local</span>
                    <span className="font-bold">Online</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
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
                initial={{ opacity: 0, x: 30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="relative hidden lg:block"
              >
                <div className="absolute -inset-4 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 blur-2xl rounded-3xl"></div>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-[4/5]">
                  <img 
                    src="/client-3.jpeg" 
                    alt="Aluno de sucesso" 
                    className="w-full h-full object-cover object-bottom"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                </div>
              </motion.div>
            </div>

            {/* University Logos Carousel */}
            <div className="mt-20 lg:mt-32 relative">
              <p className="text-blue-200/60 text-sm font-bold uppercase tracking-[0.3em] mb-10 text-center">
                +154 bolsas de instituições parceira
              </p>
              
              <div 
                className="relative w-full overflow-hidden h-32 flex items-center py-4"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
                }}
              >
                {!logosLoading && carouselLogos.length > 0 ? (
                  <motion.div 
                    className="flex gap-16 items-center whitespace-nowrap"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ 
                      duration: 120, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                  >
                    {carouselLogos.map((uni, i) => (
                      <div key={i} className="flex items-center justify-center shrink-0 w-44 h-24 hover:scale-105 transition-all duration-300 group">
                        <img 
                          src={uni.logo_url!} 
                          alt={uni.name} 
                          className="max-w-full max-h-full object-contain transition-all duration-300 group-hover:scale-110"
                        />
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="flex justify-center w-full">
                    <div className="h-10 w-full max-w-lg bg-white/5 animate-pulse rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Para quem é este workshop */}
        <section className="py-24 relative">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Para quem é este workshop?</h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Este workshop é para você que quer estudar e trabalhar nos EUA legalmente fazendo uma faculdade americana.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  title: 'Transfer',
                  desc: 'Está estudando em escola de inglês nos Estados Unidos e quer migrar para uma faculdade americana.'
                },
                {
                  title: 'COS',
                  desc: 'Está nos EUA com visto de turista e quer entender como continuar estudando legalmente no país.'
                },
                {
                  title: 'Initial',
                  desc: 'Quer vir para os EUA e conseguir aprovação em visto de estudante com bolsa e flexibilidade.'
                }
              ].map((item, idx) => (
                <div key={idx} className="group relative bg-slate-800/50 border border-slate-700/50 rounded-3xl p-8 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <h3 className="relative text-2xl font-extrabold text-white mb-4 group-hover:text-blue-400 transition-colors">{item.title}</h3>
                  <p className="relative text-slate-400 leading-relaxed text-lg">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-r-2xl max-w-3xl mx-auto">
              <p className="text-lg text-blue-100 font-medium">
                💡 Se você sente que está sem direção e quer clareza sobre o próximo passo para o seu perfil, <strong className="text-blue-400">este workshop foi feito para você</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: O que você vai aprender */}
        <section className="py-32 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white text-center mb-20">O que você vai descobrir nessa aula</h2>
            
            <div className="relative flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-8">
              {/* Coluna Esquerda */}
              <div className="flex-1 space-y-6 z-10 w-full">
                {[
                  "Como trabalhar e estudar nos EUA legalmente através de faculdades exclusivas",
                  "A diferença entre escola de inglês, faculdade sem bolsa e faculdade com bolsa",
                  "Como algumas faculdades americanas acreditadas podem reduzir o investimento mensal para $500",
                  "Como conseguir fazer uma faculdade, mestrado ou doutorado nos EUA"
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: idx * 0.1, duration: 0.8, ease: "easeOut" }}
                    className="flex items-start gap-4 bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 hover:border-blue-500/50 transition-all shadow-xl"
                  >
                    <div className="bg-blue-500/20 p-2 rounded-full shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-lg font-medium text-slate-200 leading-relaxed">{item}</span>
                  </motion.div>
                ))}
              </div>

              {/* Imagem Central */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative shrink-0 w-full lg:w-[450px] self-stretch min-h-[500px] rounded-[3rem] overflow-hidden border-2 border-white/10 shadow-2xl z-0 order-first lg:order-none"
              >
                <img 
                  src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/university-campus-chapel-tower-blue-sky.webp" 
                  alt="Sucesso nos EUA" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20"></div>
                <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay"></div>
              </motion.div>

              {/* Coluna Direita */}
              <div className="flex-1 space-y-6 z-10 w-full">
                {[
                  "Bolsas de estudos em universidades americanas exclusivas de até 90% de desconto",
                  "Como ter acesso a cursos híbridos, com aulas presenciais uma vez por semestre",
                  "Passo a passo para realizar o processo seletivo para conseguir essas bolsas",
                  "Como ter garantia de aprovação durante o processo"
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: idx * 0.1, duration: 0.8, ease: "easeOut" }}
                    className="flex items-start gap-4 bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50 hover:border-blue-500/50 transition-all shadow-xl"
                  >
                    <div className="bg-blue-500/20 p-2 rounded-full shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-lg font-medium text-slate-200 leading-relaxed">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Comparativo Principal */}
        <section className="py-24 relative">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Escola de inglês, faculdade sem bolsa ou faculdade com bolsa?</h2>
              <p className="text-lg text-slate-400">Em vez de olhar só para a mensalidade, você precisa comparar o cenário completo.</p>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-800 shadow-2xl">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="p-4 md:p-6 font-bold text-white border-b border-slate-700">Opção</th>
                    <th className="p-4 md:p-6 font-bold text-white border-b border-slate-700">Investimento médio</th>
                    <th className="p-4 md:p-6 font-bold text-white border-b border-slate-700">Flexibilidade</th>
                    <th className="p-4 md:p-6 font-bold text-white border-b border-slate-700">Bolsa</th>
                    <th className="p-4 md:p-6 font-bold text-white border-b border-slate-700">Diploma</th>
                    <th className="p-4 md:p-6 font-bold text-white border-b border-slate-700">Perspectiva de longo prazo</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900/50 divide-y divide-slate-800 text-slate-300">
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 md:p-6 font-semibold">Escola de inglês</td>
                    <td className="p-4 md:p-6">$600/mês</td>
                    <td className="p-4 md:p-6">Baixa</td>
                    <td className="p-4 md:p-6">Não</td>
                    <td className="p-4 md:p-6 text-red-400 font-medium">Não</td>
                    <td className="p-4 md:p-6">Limitada</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 md:p-6 font-semibold">Faculdade sem bolsa</td>
                    <td className="p-4 md:p-6">$1.000 a $2.000/mês</td>
                    <td className="p-4 md:p-6">Média a alta</td>
                    <td className="p-4 md:p-6">Não</td>
                    <td className="p-4 md:p-6 text-green-400 font-medium">Sim</td>
                    <td className="p-4 md:p-6">Alta</td>
                  </tr>
                  <tr className="relative bg-blue-900/40 hover:bg-blue-900/50 transition-colors border-2 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)] group">
                    <td className="p-4 md:p-6 font-extrabold text-blue-100 relative">
                      Faculdade com bolsa
                      <span className="absolute -top-3 -right-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-md whitespace-nowrap">O Caminho Ideal</span>
                    </td>
                    <td className="p-4 md:p-6 font-bold text-blue-300 relative">A partir de $500/mês</td>
                    <td className="p-4 md:p-6 font-bold text-blue-300 relative">Alta</td>
                    <td className="p-4 md:p-6 font-bold text-blue-300 relative">Sim, até 90%</td>
                    <td className="p-4 md:p-6 text-green-400 font-extrabold relative">Sim</td>
                    <td className="p-4 md:p-6 font-bold text-blue-300 relative">Alta</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-8 text-center text-slate-400 text-lg max-w-3xl mx-auto italic">
              Ao participar do workshop, você vai entender por que tanta gente continua presa na opção menos vantajosa sem perceber que pode existir um caminho melhor.
            </p>
          </div>
        </section>

        {/* Section 8: Prova Social */}
        <section className="py-24 relative">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-white">Veja o que outros alunos descobriram</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">Conheça estudantes que passaram a enxergar uma rota concreta para estudar em faculdade americana.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="group flex flex-col bg-slate-800/40 rounded-[2.5rem] overflow-hidden border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 hover:-translate-y-2 shadow-2xl"
                >
                  <div className="relative h-[400px] overflow-hidden">
                    <img 
                      src={item.img} 
                      alt="Aluno MatriculaUSA" 
                      className="w-full h-full object-cover" 
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                  </div>
                  <div className="p-8 lg:p-10">
                    <div className="w-10 h-1 bg-blue-500 mb-6 rounded-full opacity-60"></div>
                    <p className="text-lg lg:text-xl text-slate-200 leading-relaxed font-medium italic">
                      "{item.text}"
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 9: Chamada para Inscrição */}
        <section className="py-32 relative">
          <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Garanta sua vaga no próximo workshop</h2>
            <p className="text-xl text-slate-300 mb-6 leading-relaxed">
              A participação é gratuita, mas as vagas da sala são limitadas.
            </p>
            <p className="text-lg text-slate-400 mb-12 bg-slate-800/40 p-6 rounded-3xl backdrop-blur-sm border border-slate-700/50">
              Como cada semestre tem prazo de matrícula, quem entende o caminho certo antes consegue agir com mais clareza, mais margem e mais chance de aproveitar as melhores oportunidades.
            </p>

            <div className="inline-block bg-white/5 p-2 rounded-2xl border border-white/10 mb-10">
              <div className="flex md:flex-row flex-col gap-4 text-left">
                <div className="bg-slate-800/50 px-6 py-4 rounded-xl border border-white/5">
                  <span className="block text-blue-400 text-sm font-semibold uppercase tracking-wider mb-1">Data</span>
                  <span className="text-2xl font-bold">16/04/2026</span>
                </div>
                <div className="bg-slate-800/50 px-6 py-4 rounded-xl border border-white/5">
                  <span className="block text-blue-400 text-sm font-semibold uppercase tracking-wider mb-1">Horário</span>
                  <span className="text-2xl font-bold">20:00h</span>
                </div>
              </div>
            </div>

            <div>
              <a 
                href={whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white text-xl md:text-2xl font-bold py-6 px-12 rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(34,197,94,0.5)] w-full md:w-auto"
              >
                Quero participar do workshop
                <ArrowRight className="w-7 h-7" />
              </a>
              <p className="mt-6 text-blue-200 font-medium">
                Gratuito + online + estratégico + com oportunidade de tirar dúvidas
              </p>
            </div>
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
                <details key={index} className="group bg-slate-900 rounded-xl border border-slate-800 shadow-sm [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-6 font-bold text-white text-lg hover:text-blue-400 transition-colors">
                    {faq.q}
                    <ChevronDown className="w-6 h-6 shrink-0 transition duration-300 group-open:-rotate-180 text-blue-500" />
                  </summary>
                  <div className="px-6 pb-6 text-slate-400 text-lg leading-relaxed border-t border-slate-800 pt-4 mt-2">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WorkshopRegistrationLanding;
