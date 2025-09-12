import * as React from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '../../lib/cn';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({ 
  children, 
  className,
  delay = 0,
  direction = 'up'
}) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { 
    once: true, 
    threshold: 0.1,
    margin: "-50px"
  });

  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: 50, opacity: 0 };
      case 'down': return { y: -50, opacity: 0 };
      case 'left': return { x: 50, opacity: 0 };
      case 'right': return { x: -50, opacity: 0 };
      default: return { y: 50, opacity: 0 };
    }
  };

  const getAnimatePosition = () => {
    switch (direction) {
      case 'up': return { y: 0, opacity: 1 };
      case 'down': return { y: 0, opacity: 1 };
      case 'left': return { x: 0, opacity: 1 };
      case 'right': return { x: 0, opacity: 1 };
      default: return { y: 0, opacity: 1 };
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={getInitialPosition()}
      animate={isInView ? {
        ...getAnimatePosition(),
        transition: {
          type: "spring",
          damping: 20,
          stiffness: 100,
          delay
        }
      } : getInitialPosition()}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
};
