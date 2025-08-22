import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface FavoritesFilterProps {
  showOnlyFavorites: boolean;
  onToggle: () => void;
  favoritesCount: number;
  className?: string;
}

const FavoritesFilter: React.FC<FavoritesFilterProps> = ({
  showOnlyFavorites,
  onToggle,
  favoritesCount,
  className = ''
}) => {
  const { t } = useTranslation();
  return (
    <motion.button
      onClick={onToggle}
      className={`
        w-full max-w-md px-4 py-3 rounded-xl font-semibold 
        transition-all duration-200 flex items-center justify-center gap-3
        shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95
        text-sm sm:text-base
        ${showOnlyFavorites 
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600' 
            : 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 hover:from-slate-200 hover:to-gray-200 border border-slate-200'
          }
        ${className}
      `}
      whileHover={{ 
        scale: 1.02,
        y: -1
      }}
      whileTap={{ 
        scale: 0.98
      }}
    >
      {/* Ícone de estrela */}
      <div className="w-5 h-5 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            className="transition-all duration-200"
            fill={showOnlyFavorites ? "currentColor" : "#9ca3af"}
            stroke={showOnlyFavorites ? "currentColor" : "#6b7280"}
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Texto */}
      <span className="font-medium">
        {showOnlyFavorites ? t('studentDashboard.favorites.showingFavorites') : t('studentDashboard.favorites.showFavoritesOnly')}
      </span>

      {/* Contador */}
      {favoritesCount > 0 && (
        <span className={`
          px-2 py-1 rounded-full text-xs font-bold transition-all duration-200
          ${showOnlyFavorites 
            ? 'bg-white/20 text-white' 
            : 'bg-slate-200 text-slate-700'
          }
        `}>
          {favoritesCount}
        </span>
      )}
    </motion.button>
  );
};

export default FavoritesFilter;
