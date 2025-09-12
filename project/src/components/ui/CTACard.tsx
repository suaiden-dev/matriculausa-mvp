import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface CTACardProps {
  title: string;
  description: string;
  primaryButton: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryButton?: {
    text: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export const CTACard: React.FC<CTACardProps> = ({ 
  title, 
  description, 
  primaryButton, 
  secondaryButton,
  className 
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
          stiffness: 100
        }
      }}
      className={cn(
        'bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden',
        className
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-2xl transform -translate-x-24 translate-y-24"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        <p className="text-white/90 mb-6 text-lg leading-relaxed">
          {description}
        </p>
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            onClick={primaryButton.onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-slate-900 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center group"
          >
            {primaryButton.icon && (
              <span className="mr-2 group-hover:translate-x-1 transition-transform">
                {primaryButton.icon}
              </span>
            )}
            {primaryButton.text}
          </motion.button>
          
          {secondaryButton && (
            <motion.button
              onClick={secondaryButton.onClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-slate-900 transition-colors flex items-center justify-center group"
            >
              {secondaryButton.icon && (
                <span className="mr-2 group-hover:translate-x-1 transition-transform">
                  {secondaryButton.icon}
                </span>
              )}
              {secondaryButton.text}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
