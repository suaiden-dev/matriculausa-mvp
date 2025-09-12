import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface AnimatedListProps {
  items: Array<React.ReactNode>;
  stagger?: number;
  className?: string;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({ items, stagger = 0.2, className }) => {
  const [inViewport, setInViewport] = React.useState(false);
  const listRef = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInViewport(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (listRef.current) {
      observer.observe(listRef.current);
    }

    return () => {
      if (listRef.current) {
        observer.unobserve(listRef.current);
      }
    };
  }, []);

  return (
    <div ref={listRef} className={className}>
      <AnimatePresence>
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={inViewport ? {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                type: "spring",
                damping: 20,
                stiffness: 100,
                delay: idx * stagger
              }
            } : {}}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mb-6 will-change-transform"
          >
            {item}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedList;
