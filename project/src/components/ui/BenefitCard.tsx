import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  delay?: number;
}

export const BenefitCard: React.FC<BenefitCardProps> = ({ 
  icon, 
  title, 
  description, 
  className,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
          type: "spring",
          damping: 20,
          stiffness: 100,
          delay
        }
      }}
      whileHover={{ 
        y: -4,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={cn(
        'group relative p-6 bg-slate-900 rounded-xl text-white',
        'hover:bg-slate-800 transition-all duration-300',
        'overflow-hidden',
        className
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
        <div className="absolute top-2 right-2 w-16 h-16 bg-white rounded-full blur-xl"></div>
        <div className="absolute bottom-2 left-2 w-12 h-12 bg-white rounded-full blur-lg"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="font-semibold text-white mb-3 flex items-center group-hover:text-white/90 transition-colors">
          <span className="mr-2 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </span>
          {title}
        </div>
        <div className="text-white text-sm group-hover:text-white/90 transition-colors">
          {description}
        </div>
      </div>
    </motion.div>
  );
};
