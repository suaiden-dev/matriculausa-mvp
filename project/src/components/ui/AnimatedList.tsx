import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface AnimatedListProps {
  items: Array<React.ReactNode>;
  stagger?: number;
  className?: string;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({ items, stagger = 0.2, className }) => {
  return (
    <div className={className}>
      <AnimatePresence>
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6, delay: idx * stagger }}
            className="mb-6"
          >
            {item}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedList;
