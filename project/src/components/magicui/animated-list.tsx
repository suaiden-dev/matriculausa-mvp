"use client";

import { cn } from "@/lib/cn";
import { AnimatePresence, motion } from "framer-motion";
import React, {
  ComponentPropsWithoutRef,
  useEffect,
  useMemo,
  useState,
} from "react";

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring" as const, stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedList = React.memo(
  ({ children, className, delay = 2000, ...props }: AnimatedListProps) => {
    const [visibleItems, setVisibleItems] = useState<number[]>([]);
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children],
    );

    useEffect(() => {
      // Reset visible items when children change
      setVisibleItems([]);
      console.log('AnimatedList: Starting animation with', childrenArray.length, 'items, delay:', delay);
      
      // Show items one by one with delay
      childrenArray.forEach((_, index) => {
        setTimeout(() => {
          console.log('AnimatedList: Showing item', index);
          setVisibleItems(prev => [...prev, index]);
        }, index * delay);
      });
    }, [childrenArray, delay]);

    return (
      <div
        className={cn(`flex flex-col items-center gap-4`, className)}
        {...props}
      >
        <AnimatePresence>
          {childrenArray.map((item, index) => {
            const isVisible = visibleItems.includes(index);
            return isVisible ? (
              <AnimatedListItem key={index}>
                {item}
              </AnimatedListItem>
            ) : null;
          })}
        </AnimatePresence>
      </div>
    );
  },
);

AnimatedList.displayName = "AnimatedList";
