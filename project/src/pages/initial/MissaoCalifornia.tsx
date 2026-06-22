import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  ArrowRight,
  ChevronDown,
  Award,
  Globe,
  FileCheck,
  ShieldCheck,
  Plane,
  Briefcase,
  MapPin,
} from 'lucide-react';
import Carousel from '../../components/ui/Carousel';

const CTA_LINK = '/selection-fee-registration';

const packageIncludes = [
  '1 ano de tuition incluso',
  'Suporte com documentação, I-20 e visto',
  'Networking com igrejas na Califórnia',
  'OPT — trabalho legal nos EUA pós-formatura',
];


// Galeria — pontos turísticos de Los Angeles (Unsplash, licença livre)
const losAngelesSlides = [
  { title: 'Hollywood Sign', src: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Santa Monica Pier', src: 'https://images.unsplash.com/photo-1505887579242-c7bc04062e98?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Griffith Observatory', src: 'https://images.unsplash.com/photo-1546624356-62f238e38e2a?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Ruas de palmeiras', src: 'https://images.unsplash.com/photo-1580655653885-65763b2597d0?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Downtown Los Angeles', src: 'https://images.unsplash.com/photo-1544413660-299165566b1d?auto=format&fit=crop&w=1200&q=80' },
  { title: 'Los Angeles à noite', src: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80' },
];


const transferBreakdown = [
  { label: 'Tuition com Bolsa', value: '$3.800' },
  { label: 'Placement Fee', value: '$1.800' },
];

const initialBreakdown = [
  { label: 'Tuition com Bolsa', value: '$3.800' },
  { label: 'Placement Fee', value: '$1.800' },
  { label: 'Controle de I-20', value: '$1.800' },
];

const faqs = [
  {
    question: 'O que significa ser um estudante "Initial"?',
    answer:
      'Você é classificado como Initial quando vem do exterior para iniciar seus estudos nos Estados Unidos com um novo I-20. Por isso o pacote inclui o Controle de I-20, garantindo todo o suporte na emissão e acompanhamento do seu documento de estudante.',
  },
  {
    question: 'O que está incluído no investimento de $7.400?',
    answer:
      'O valor final cobre 1 ano de tuition com a bolsa exclusiva já aplicada ($3.800), a Placement Fee da MatrículaUSA ($1.800) e o Controle de I-20 ($1.800). Sem a bolsa, o valor total seria de $16.800 — você economiza $11.200.',
  },
  {
    question: 'Como funciona a bolsa de estudos exclusiva?',
    answer:
      'A bolsa exclusiva MatrículaUSA garante um desconto de $11.200 sobre o tuition oficial da Caroline University, reduzindo o valor anual de $15.000 para $3.800. Ela é aplicada automaticamente ao seu pacote.',
  },
  {
    question: 'O pacote Missão Califórnia é só para quem quer ser missionário?',
    answer:
      'Ele é pensado para futuros missionários, líderes cristãos e jovens que desejam servir a Deus com uma formação internacional. Além do programa acadêmico, você recebe desenvolvimento de liderança cristã, mentoria ministerial e participa de projetos missionários na Califórnia.',
  },
  {
    question: 'Recebo suporte durante todo o processo?',
    answer:
      'Sim. Você conta com planejamento acadêmico e profissional, orientação completa para documentação e matrícula, e suporte da equipe MatrículaUSA do início ao embarque, além de acesso à comunidade internacional de networking.',
  },
];

const MissaoCalifornia: React.FC = () => {
  return (
    <div className="relative bg-white min-h-screen font-sans overflow-hidden">
      {/* Hero com imagem de Los Angeles */}
      <section className="relative min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] flex items-center justify-center overflow-hidden">
        <img
          src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/los_angeles_view.webp"
          alt="Vista de Los Angeles, Califórnia"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05294E]/70 via-[#05294E]/50 to-[#05294E]/80" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center py-20 lg:py-24">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
            Sua nova vida nos Estados Unidos
            <span className="block mt-1">começa aqui</span>
          </h1>
        </div>
      </section>

      {/* Por que Los Angeles */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-white">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Título da seção */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Por que Los Angeles, Califórnia?
            </h2>
            <p className="text-lg text-slate-400 mt-4 max-w-2xl mx-auto font-medium">
              Mais que um diploma — uma experiência que transforma sua carreira, seu inglês e sua visão de mundo.
            </p>
          </div>

          {/* Bloco 1 — texto + imagem lado a lado */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center mb-16"
          >
            <div className="text-center lg:text-left">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug mb-5">
                Estudar nos EUA muda a trajetória da sua vida
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed mb-4">
                Um diploma americano abre portas no mundo inteiro. Ter os Estados Unidos no currículo
                coloca você à frente no mercado de trabalho — no Brasil e no exterior.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                E o inglês? Você não estuda: você vive. Fluência de verdade, amizades internacionais
                e um networking que acompanha toda a sua carreira.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[3/2]">
              <img
                src="https://images.unsplash.com/photo-1515896769750-31548aa180ed?auto=format&fit=crop&w=800&q=80"
                alt="Venice Beach, Los Angeles"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </motion.div>

          {/* Bloco 2 — imagem + texto (invertido) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center mb-16"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[3/2] order-2 lg:order-1">
              <img
                src="https://images.unsplash.com/photo-1460881680858-30d872d5b530?auto=format&fit=crop&w=800&q=80"
                alt="Pôr do sol em Los Angeles"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug mb-5">
                Los Angeles: sol, oportunidades e diversidade o ano inteiro
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed mb-4">
                Sol o ano inteiro, praias do Pacífico, Hollywood e um dos maiores polos de inovação
                do planeta — tudo isso com uma forte comunidade brasileira para você se sentir em casa.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed">
                Aqui você não apenas estuda: você vive. A independência, as amizades e a bagagem
                cultural que Los Angeles oferece são coisas que nenhuma sala de aula sozinha consegue dar.
              </p>
            </div>
          </motion.div>

          {/* Carrossel — pontos turísticos de Los Angeles */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mt-20 pt-20"
          >
            <Carousel slides={losAngelesSlides} />
          </motion.div>

        </div>
      </section>

      {/* Caroline University */}
      <section className="relative py-16 md:py-20 overflow-hidden bg-slate-50/60">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Caroline University
            </h2>
            <p className="text-lg text-slate-400 mt-4 max-w-2xl mx-auto font-medium">
              Uma instituição cristã dedicada à formação de líderes, com programas voltados ao desenvolvimento
              acadêmico, ministerial e profissional — em um ambiente acolhedor para estudantes internacionais.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative max-w-6xl mx-auto rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(5,41,78,0.15)] mb-6"
          >
            <img
              src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_la.webp"
              alt="Caroline University — Los Angeles, Califórnia"
              className="w-full h-[280px] sm:h-[360px] md:h-[420px] object-cover"
              loading="lazy"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative max-w-6xl mx-auto rounded-3xl bg-white p-8 md:p-10 overflow-hidden mb-6"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10 mb-8">
              <div className="flex-1 text-center md:text-left">
                <p className="text-slate-600 text-base md:text-lg leading-relaxed">
                  Fundada em 2015, a Caroline University é uma instituição privada de ensino superior cristão
                  localizada na Wilshire Boulevard, no coração de Los Angeles. Sua missão é formar líderes globais
                  com base em valores bíblicos, excelência acadêmica e compromisso com a comunidade — oferecendo
                  programas de graduação e pós-graduação para estudantes americanos e internacionais.
                </p>
              </div>
              <div className="md:w-64 md:flex-shrink-0">
                <div className="flex items-start gap-3 bg-slate-50 rounded-2xl px-5 py-4">
                  <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Localização</p>
                    <p className="text-sm font-bold leading-snug mt-0.5 text-slate-900">3660 Wilshire Blvd, Suite 320<br />Los Angeles, CA 90010</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: ShieldCheck, title: 'Acreditação TRACS', desc: 'Reconhecida pelo USDOE e CHEA' },
                { icon: FileCheck, title: 'Emissão de I-20', desc: 'Visto de estudante F-1' },
                { icon: Globe, title: 'Campus multicultural', desc: 'Koreatown, Los Angeles' },
                { icon: Briefcase, title: 'OPT pós-formatura', desc: 'Trabalho legal nos EUA' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-slate-900">{title}</span>
                    <span className="text-slate-400 text-sm ml-1.5">— {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Marquee duplo — fotos da universidade */}
          <div className="relative mt-6 overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-slate-50/60 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-slate-50/60 to-transparent z-10 pointer-events-none" />

            {[
              {
                images: [
                  { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_classroom1.webp', alt: 'Sala de aula' },
                  { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_students.webp', alt: 'Estudantes' },
                  { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_graduation.webp', alt: 'Formatura' },
                ],
                direction: 'normal' as const,
              },
              {
                images: [
                  { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_reception.webp', alt: 'Recepção' },
                  { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_claslroom2.webp', alt: 'Aula em andamento' },
                  { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_reception.webp', alt: 'Recepção 2' },
                ],
                direction: 'reverse' as const,
              },
            ].map((row, rowIdx) => (
              <div key={rowIdx} className={`flex ${rowIdx > 0 ? 'mt-4' : ''}`}>
                <motion.div
                  className="flex gap-4 flex-shrink-0"
                  animate={{ x: row.direction === 'normal' ? ['0%', '-50%'] : ['-50%', '0%'] }}
                  transition={{ duration: 25, ease: 'linear', repeat: Infinity }}
                >
                  {[...row.images, ...row.images].map(({ src, alt }, i) => (
                    <div
                      key={`${alt}-${i}`}
                      className="group relative flex-shrink-0 w-[280px] sm:w-[340px] lg:w-[400px] h-44 sm:h-56 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
                    >
                      <img
                        src={src}
                        alt={alt}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/60 via-transparent to-transparent" />
                    </div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>

          {/* Grid alternado — fotos da universidade */}
          <div className="mt-10 flex flex-col gap-4 max-w-6xl mx-auto">
            {[
              {
                left: { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_classroom1.webp', alt: 'Sala de aula' },
                right: { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_students.webp', alt: 'Estudantes' },
              },
              {
                left: { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_graduation.webp', alt: 'Formatura' },
                right: { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_reception.webp', alt: 'Recepção' },
              },
              {
                left: { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_claslroom2.webp', alt: 'Aula em andamento' },
                right: { src: 'https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/caroline_university_students.webp', alt: 'Estudantes' },
              },
            ].map((row, rowIdx) => {
              const rightLarger = rowIdx % 2 === 0;

              return (
                <motion.div
                  key={rowIdx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: rowIdx * 0.1 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 auto-rows-[1fr]"
                >
                  <div
                    className={`group relative rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)] ${
                      rightLarger ? 'sm:col-span-1 min-h-[200px] sm:min-h-0' : 'sm:col-span-2 aspect-[3/2]'
                    }`}
                  >
                    <img
                      src={row.left.src}
                      alt={row.left.alt}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/60 via-transparent to-transparent" />
                  </div>
                  <div
                    className={`group relative rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)] ${
                      rightLarger ? 'sm:col-span-2 aspect-[3/2]' : 'sm:col-span-1 min-h-[200px] sm:min-h-0'
                    }`}
                  >
                    <img
                      src={row.right.src}
                      alt={row.right.alt}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#05294E]/60 via-transparent to-transparent" />
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Pacote Missão Califórnia */}
      <section className="relative py-16 md:py-20 overflow-hidden bg-slate-50/60">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative z-10 text-center mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Missão Califórnia
            </h2>
            <p className="text-lg text-slate-400 mt-4 max-w-2xl mx-auto font-medium">
              Bacharelado em Teologia na Caroline University para futuros missionários, líderes cristãos e jovens
              que desejam servir a Deus com uma formação internacional.
            </p>
          </div>

          {/* Showcase — prova social */}
          <div
            className="relative rounded-3xl bg-gradient-to-br from-[#05294E] via-[#083a6e] to-[#0a4a8a] overflow-visible lg:min-h-[560px] flex flex-col lg:block max-w-6xl mx-auto mb-10 mt-20 lg:mt-[250px]"
          >
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-sky-400/25 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-0 -left-24 w-[450px] h-[450px] bg-blue-500/20 rounded-full blur-[110px]"></div>
              <div className="absolute -bottom-20 -right-24 w-[450px] h-[450px] bg-cyan-400/15 rounded-full blur-[110px]"></div>
            </div>

            <div className="relative z-10 order-4 flex flex-col items-start gap-2.5 sm:gap-3 px-6 pb-6 sm:px-8 sm:pb-8 lg:p-0 lg:absolute lg:left-8 lg:top-1/2 lg:-translate-y-1/2 lg:w-auto">
              {packageIncludes.map((title, i) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, x: -40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 + i * 0.08 }}
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-2xl rounded-xl px-5 py-3 sm:px-6 sm:py-3.5"
                  >
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <p className="font-bold text-white text-sm sm:text-base leading-snug lg:whitespace-nowrap">{title}</p>
                  </motion.div>
                )
              )}
            </div>

            <div className="relative z-20 order-3 -mt-14 sm:-mt-[4.5rem] flex flex-col gap-3 sm:gap-4 px-6 pb-6 sm:px-8 sm:pb-8 lg:mt-0 lg:p-0 lg:absolute lg:right-8 lg:top-10 lg:w-auto lg:max-w-[260px]">
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
                className="bg-white rounded-2xl px-6 py-5 sm:px-7 sm:py-6 shadow-lg"
              >
                <p className="text-4xl sm:text-5xl font-black text-[#05294E] leading-none">$11.200</p>
                <p className="text-slate-500 text-sm sm:text-base mt-2 leading-snug">de desconto na sua bolsa exclusiva</p>
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
                  <strong className="text-[#05294E]">300+</strong> alunos já nos Estados Unidos
                </p>
              </motion.div>
            </div>

            {/* Imagem — estudante */}
            <div
              className="relative z-[1] order-2 -mt-10 flex justify-center overflow-visible lg:absolute lg:inset-x-0 lg:bottom-0 pointer-events-none -top-10 lg:-top-[128px]"
            >
              <motion.img
                src="https://fitpynguasqqutuhzifx.supabase.co/storage/v1/object/public/images/student_with_bible2.webp"
                alt="Estudante com bíblia"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="block w-auto max-w-none h-[18rem] sm:h-[22rem] lg:h-full object-contain object-bottom"
                loading="lazy"
              />
            </div>
          </div>

          {/* Investimento + o que está incluído */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-4xl mx-auto"
          >
            <div className="relative bg-gradient-to-br from-[#05294E] via-[#083a6e] to-[#0a4a8a] rounded-3xl shadow-[0_20px_60px_rgba(5,41,78,0.25)] p-8 md:p-10 text-white overflow-hidden">
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-sky-400/20 rounded-full blur-[90px] pointer-events-none" />

              <div className="relative z-10">
                {/* Valor oficial */}
                <p className="text-sm font-black text-white/40 tracking-widest uppercase mb-4">Valor oficial Caroline University</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-base">Tuition Anual</span>
                    <span className="font-bold text-white text-base tabular-nums">$15.000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-base">Placement Fee MatrículaUSA</span>
                    <span className="font-bold text-white text-base tabular-nums">$1.800</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/15 pt-3 mt-1">
                    <span className="text-white font-black text-base">Valor Total Sem Bolsa</span>
                    <span className="font-black text-white text-lg tabular-nums">$16.800</span>
                  </div>
                </div>

                {/* Bolsa */}
                <div className="mt-8 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 bg-green-500 text-white text-sm font-black px-4 py-2 rounded-full">
                    <Award className="w-4 h-4" />
                    Bolsa de Estudos Exclusiva
                  </span>
                  <span className="text-green-400 font-black text-xl tabular-nums">-$11.200</span>
                </div>

                {/* Modalidades */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Transfer Student */}
                  <div className="bg-white/10 rounded-2xl p-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-black uppercase tracking-wider">
                      <Briefcase className="w-4 h-4" />
                      Transfer Student
                    </span>
                    <div className="mt-4 space-y-2.5">
                      {transferBreakdown.map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-white/70 text-base">{label}</span>
                          <span className="font-bold text-white text-base tabular-nums">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-white/20 pt-3 mt-3">
                      <span className="text-white font-black text-lg">Total</span>
                      <span className="font-black text-white text-2xl tabular-nums">$5.600</span>
                    </div>
                  </div>

                  {/* Initial / Change of Status */}
                  <div className="bg-white/10 rounded-2xl p-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-black uppercase tracking-wider">
                      <Plane className="w-4 h-4" />
                      Initial / COS
                    </span>
                    <div className="mt-4 space-y-2.5">
                      {initialBreakdown.map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-white/70 text-base">{label}</span>
                          <span className="font-bold text-white text-base tabular-nums">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-white/20 pt-3 mt-3">
                      <span className="text-white font-black text-lg">Total</span>
                      <span className="font-black text-white text-2xl tabular-nums">$7.400</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={CTA_LINK}
                  className="mt-8 w-full inline-flex items-center justify-center gap-2 bg-white text-[#05294E] py-4 rounded-2xl font-black text-lg tracking-wide hover:bg-slate-100 transition-colors"
                >
                  Garantir minha vaga
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <MissaoCaliforniaFAQ />

    </div>
  );
};

const MissaoCaliforniaFAQ: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-8 text-center text-slate-900">Perguntas frequentes</h2>

          <div className="max-w-3xl mx-auto space-y-1">
            {faqs.map((faq, num) => (
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
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500 ${
                      openFaq === num ? 'bg-slate-100 text-slate-600 rotate-180' : 'bg-slate-50 text-slate-300 group-hover:text-slate-400'
                    }`}
                  >
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
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MissaoCalifornia;
