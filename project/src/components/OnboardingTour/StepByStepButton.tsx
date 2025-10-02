import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, HelpCircle, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StepByStepGuide from './StepByStepGuide';
import { useStepByStepGuide } from '../../hooks/useStepByStepGuide';

const StepByStepButton: React.FC = () => {
  const { t } = useTranslation();
  const { isGuideOpen, openGuide, closeGuide } = useStepByStepGuide();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Botão compacto para card */}
      <motion.button
        onClick={openGuide}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-xl shadow-lg border-2 border-white/20 flex items-center justify-center hover:from-blue-700 hover:to-purple-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        title={t('stepByStepGuide.title')}
        type="button"
      >
        <Route className="w-5 h-5 mr-1" />
        <span className="text-xs font-semibold hidden sm:inline">{t('stepByStepGuide.subtitle')}</span>
      </motion.button>
      <StepByStepGuide isOpen={isGuideOpen} onClose={closeGuide} />
    </>
  );
};

export default StepByStepButton; 