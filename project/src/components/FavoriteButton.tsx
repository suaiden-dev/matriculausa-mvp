import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => Promise<boolean>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onToggle,
  size = 'md',
  className = ''
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const buttonSizes = {
    sm: 'p-2',
    md: 'p-2.5',
    lg: 'p-3'
  };

  const handleClick = async () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setShowSparkles(true);

    try {
      const result = await onToggle();
      
      if (result && !isFavorite) {
        // Mostrar sparkles apenas quando favoritar
        setTimeout(() => {
          setShowSparkles(false);
        }, 1000);
      }
    } catch (error) {
      console.error('❌ [FavoriteButton] Erro ao alternar favorito:', error);
    } finally {
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Botão Principal */}
      <motion.button
        onClick={handleClick}
        disabled={isAnimating}
        className={`
          ${buttonSizes[size]} 
          relative bg-white rounded-full shadow-lg hover:shadow-xl 
          transition-all duration-300 ease-out focus:outline-none
          border-2 border-gray-100 hover:border-yellow-200
          ${isAnimating ? 'pointer-events-none' : ''}
        `}
        whileHover={{ 
          scale: 1.1,
          y: -2
        }}
        whileTap={{ 
          scale: 0.95,
          y: 0
        }}
        style={{
          filter: isFavorite 
            ? 'drop-shadow(0 4px 12px rgba(239, 68, 68, 0.3))' 
            : 'none'
        }}
      >
        {/* Container do coração SVG */}
        <div className={`${sizeClasses[size]} flex items-center justify-center`}>
          <svg
            viewBox="0 0 24 24"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Estrela de fundo (sempre visível) */}
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              className="transition-all duration-300"
              fill={isFavorite ? "#fbbf24" : "#e5e7eb"}
              stroke={isFavorite ? "#d97706" : "#d1d5db"}
              strokeWidth="1.5"
            />
            
            {/* Estrela preenchida (aparece quando favorito) */}
            <AnimatePresence>
              {isFavorite && (
                <motion.path
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 20,
                    duration: 0.3
                  }}
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill="#fbbf24"
                  className="drop-shadow-sm"
                />
              )}
            </AnimatePresence>
          </svg>
        </div>

        {/* Efeito de brilho quando favorito */}
        <AnimatePresence>
          {isFavorite && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-400/20 pointer-events-none"
              style={{
                filter: 'blur(8px)',
                zIndex: -1
              }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Sparkles Animados */}
      <AnimatePresence>
        {showSparkles && (
          <>
            {/* Sparkle 1 - Superior */}
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0, 
                x: 0, 
                y: 0 
              }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: [-15, -25, -35],
                y: [-20, -30, -40]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-0 left-1/2 pointer-events-none"
            >
              <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-lg" />
            </motion.div>

            {/* Sparkle 2 - Direito */}
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0, 
                x: 0, 
                y: 0 
              }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: [15, 25, 35],
                y: [-15, -25, -35]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="absolute top-1/2 right-0 pointer-events-none"
            >
              <div className="w-2 h-2 bg-amber-400 rounded-full shadow-lg" />
            </motion.div>

            {/* Sparkle 3 - Esquerdo */}
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0, 
                x: 0, 
                y: 0 
              }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: [-15, -25, -35],
                y: [15, 25, 35]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="absolute bottom-1/2 left-0 pointer-events-none"
            >
              <div className="w-2 h-2 bg-orange-400 rounded-full shadow-lg" />
            </motion.div>

            {/* Sparkle 4 - Inferior */}
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0, 
                x: 0, 
                y: 0 
              }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: [10, 20, 30],
                y: [20, 30, 40]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="absolute bottom-0 right-1/2 pointer-events-none"
            >
              <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-lg" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Efeito de pulso quando favorito */}
      <AnimatePresence>
        {isFavorite && (
          <motion.div
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.6, 0, 0.6]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-yellow-400 pointer-events-none"
            style={{ zIndex: -2 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FavoriteButton;
