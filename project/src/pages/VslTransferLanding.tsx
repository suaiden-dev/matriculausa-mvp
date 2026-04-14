import React from 'react';
import { motion } from 'framer-motion';
import QuickRegistration from './QuickRegistration';

const VslTransferLanding: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-blue-500/30 overflow-hidden">
      {/* Fundo Global Profissional (Hero Somente) */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden bg-slate-950 h-screen">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[50px]"></div>
      </div>

      {/* Header Simplificado */}
      <header className="py-8 flex justify-center w-full relative z-10">
        <img 
          src="/logo.png.png" 
          alt="Matrícula USA" 
          className="h-16 md:h-20 w-auto opacity-90 transition-opacity"
        />
      </header>

      {/* Hero Content (Transfer) */}
      <section className="relative pt-6 pb-16 px-4 z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="text-blue-400 font-bold uppercase tracking-[0.2em] text-sm md:text-md mb-4 block">
              ESTUDANTES TRANSFER
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-50 to-indigo-100">
              Cansado da escola de inglês? <br className="hidden md:block" /> Avance para a Faculdade Americana.
            </h1>
            <p className="text-lg md:text-xl text-blue-100/80 mb-12. max-w-3xl mx-auto font-light leading-relaxed">
              Assista a masterclass gratuita abaixo e descubra como realizar a sua transferência com bolsas de estudo de até 90% e aulas híbridas super flexíveis.
            </p>
          </motion.div>

          {/* VSL Video Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-12 relative w-full aspect-video mx-auto max-w-4xl rounded-2xl md:rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.2)] border border-white/10 bg-slate-900 group"
          >
            {/* Placeholder de vídeo simulando o player VSL */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-blue-600/30 group-hover:bg-blue-600/50 transition-colors rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_30px_rgba(37,99,235,0.3)] mb-4">
                <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent translate-x-1" />
              </div>
              <span className="text-slate-400 font-medium">Seu VSL aparecerá aqui no futuro</span>
            </div>
            {/* Imagem de poster caso quisesse ilustrar algo: 
            <img src="/client-1.jpeg" className="w-full h-full object-cover opacity-20" /> 
            */}
          </motion.div>
        </div>
      </section>

      {/* Checkout Embutido (Delay Zero para protótipo) */}
      <section id="checkout-section" className="relative z-20 w-full bg-slate-950 mt-10">
        <div className="text-center pb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Garanta sua Vaga Agora</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto"></div>
        </div>
        {/* Renderiza o fluxo de captura completo sem precisar alterar a rota */}
        <QuickRegistration />
      </section>

    </div>
  );
};

export default VslTransferLanding;
