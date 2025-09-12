import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon, 
  title, 
  description, 
  className,
  delay = 0 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
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
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={cn(
        'group relative bg-white rounded-2xl p-8 shadow-sm border border-slate-200',
        'hover:shadow-xl hover:border-slate-300 transition-all duration-300',
        'overflow-hidden',
        className
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300">
        <div className="absolute top-4 right-4 w-32 h-32 bg-slate-200 rounded-full blur-2xl"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 bg-slate-300 rounded-full blur-xl"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-slate-700 transition-colors">
          {title}
        </h3>
        <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors">
          {description}
        </p>
      </div>
    </motion.div>
  );
};
