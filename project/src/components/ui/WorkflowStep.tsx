import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface WorkflowStepProps {
  step: number;
  title: string;
  description: string;
  className?: string;
  delay?: number;
  isLast?: boolean;
}

export const WorkflowStep: React.FC<WorkflowStepProps> = ({ 
  step, 
  title, 
  description, 
  className,
  delay = 0,
  isLast = false
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
      className={cn(
        'relative text-center group',
        className
      )}
    >
      {/* Step Circle */}
      <motion.div 
        className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", damping: 15, stiffness: 300 }}
      >
        <span className="text-3xl font-bold text-white">{step}</span>
        
        {/* Hover Effect */}
        <div className="absolute inset-0 rounded-full bg-slate-700 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
      </motion.div>
      
      {/* Content */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
          {title}
        </h3>
        <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors">
          {description}
        </p>
      </div>
      
      {/* Connection Line */}
      {!isLast && (
        <div className="hidden md:block absolute top-10 left-full w-8 h-0.5 bg-slate-300 transform translate-x-0 group-hover:bg-slate-400 transition-colors duration-300"></div>
      )}
    </motion.div>
  );
};
