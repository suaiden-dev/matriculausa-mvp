import React from 'react';
import { motion } from 'framer-motion';
import { Play, TestTube } from 'lucide-react';
import { useStepByStepGuide } from '../../hooks/useStepByStepGuide';

const GuideTestButton: React.FC = () => {
  const { openGuide, resetGuide } = useStepByStepGuide();

  const handleTestGuide = () => {
    resetGuide(); // Reset para simular um novo usuário
    setTimeout(() => {
      openGuide(); // Abre o guia após um pequeno delay
    }, 100);
  };

  // Só mostra em desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <motion.button
      onClick={handleTestGuide}
      className="fixed top-4 left-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 z-50 flex items-center gap-2 hover:from-purple-700 hover:to-pink-700"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Testar Guia Passo a Passo"
    >
      <TestTube className="h-4 w-4" />
      <span className="hidden sm:inline">Testar Guia</span>
    </motion.button>
  );
};

export default GuideTestButton; 