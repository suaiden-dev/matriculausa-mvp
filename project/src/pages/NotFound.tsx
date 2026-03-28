import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Home, GraduationCap } from 'lucide-react';

const NotFound: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden bg-white">
      {/* Elementos de background estilizados */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-red-50 rounded-full blur-3xl opacity-50"></div>
      
      <div className="max-w-5xl w-full text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Container do 404 com o Chapéu de Graduação - Ajustado para o tamanho giga */}
          <div className="relative inline-block mb-12">
            <h1 className="text-9xl sm:text-[12rem] font-black text-slate-900 tracking-tighter select-none leading-none">
              {t('notFound.title')}
            </h1>
            
            {/* Chapéu de Graduação flutuando exatamente no canto INFERIOR direito do numeral */}
            <motion.div 
              animate={{ 
                rotate: [-8, 8, -8],
                y: [0, 5, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 6, 
                ease: "easeInOut" 
              }}
              className="absolute bottom-1 -right-2 sm:-right-10 w-12 h-12 sm:w-14 sm:h-14 bg-[#D0151C] rounded-xl flex items-center justify-center shadow-lg z-20"
            >
              <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </motion.div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 font-primary">
            {t('notFound.heading')}
          </h2>
          
          <p className="text-lg text-slate-600 mb-32 max-w-2xl mx-auto leading-relaxed">
            {t('notFound.description')}
          </p>

          {/* Botão de Ação Único */}
          <div className="flex justify-center">
            <Link
              to="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#D0151C] hover:bg-[#B01218] text-white px-10 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              <Home className="h-5 w-5" />
              {t('notFound.backToHome')}
            </Link>
          </div>
          
          {/* Link de Suporte */}
          <div className="mt-12">
            <Link to="/contact" className="text-sm text-slate-600 hover:text-[#05294E] underline underline-offset-4 transition-colors">
              {t('notFound.helpLink')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
