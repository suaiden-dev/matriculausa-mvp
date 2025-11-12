"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { LucideIcon } from "lucide-react";

interface Tab {
  title: string;
  icon: LucideIcon;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
  defaultSelected?: number | null;
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".375rem" : 0,
    paddingLeft: isSelected ? ".75rem" : ".5rem",
    paddingRight: isSelected ? ".75rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: "spring" as const, bounce: 0, duration: 0.6 };

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-blue-600",
  onChange,
  defaultSelected = null,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(defaultSelected);

  // Sincronizar com defaultSelected quando mudar externamente
  React.useEffect(() => {
    if (defaultSelected !== null && defaultSelected !== selected) {
      setSelected(defaultSelected);
    } else if (defaultSelected === null && selected !== null) {
      // Permitir resetar para null apenas se não houver controle externo
      // Neste caso, vamos manter a última seleção
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSelected]);

  const handleSelect = (index: number) => {
    // Se já está selecionado, não fazer nada (manter selecionado)
    if (selected === index) return;
    setSelected(index);
    onChange?.(index);
  };

  const Separator = () => (
    <div className="mx-1 h-[24px] w-[1.2px] bg-slate-300" aria-hidden="true" />
  );

  return (
    <div
      className={cn(
        "flex flex-nowrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit",
        className
      )}
    >
      {tabs.map((tab, originalIndex) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${originalIndex}`} />;
        }

        // Calcular índice real (sem contar separadores)
        const realIndex = tabs.slice(0, originalIndex).filter(t => t.type !== 'separator').length;
        const Icon = tab.icon;
        const isSelected = selected === realIndex;
        return (
          <motion.button
            key={tab.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            onClick={() => handleSelect(realIndex)}
            transition={transition}
            className={cn(
              "relative flex items-center rounded-xl py-2 text-xs font-medium transition-colors duration-300 flex-shrink-0",
              isSelected
                ? cn("bg-blue-50", activeColor)
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon size={16} className="flex-shrink-0" />
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden whitespace-nowrap ml-1 text-xs"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

