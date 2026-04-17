import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export interface InfoTooltipProps {
  text: string;
  /** 'light' para usar em fundos brancos, 'dark' para usar em cards coloridos (gradiente) */
  variant?: 'light' | 'dark';
}

/**
 * Ícone "i" circular com tooltip on-hover explicando o cálculo do elemento.
 * Posiciona automaticamente o tooltip para não sair da tela.
 */
export function InfoTooltip({ text, variant = 'light' }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left'>('top');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    // Se não houver espaço acima, abre para baixo
    if (rect.top < 120) setPosition('bottom');
    else setPosition('top');
  }, [visible]);

  const iconClass = variant === 'dark'
    ? 'text-white/50 hover:text-white/90'
    : 'text-gray-400 hover:text-blue-500';

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <div className={`w-4 h-4 rounded-full border flex items-center justify-center cursor-help transition-colors ${
        variant === 'dark'
          ? 'border-white/30 hover:border-white/70'
          : 'border-gray-300 hover:border-blue-400'
      }`}>
        <Info className={`w-2.5 h-2.5 ${iconClass}`} />
      </div>

      {visible && (
        <div className={`absolute z-50 w-64 p-3 rounded-xl shadow-2xl text-xs leading-relaxed pointer-events-none
          bg-gray-900 text-gray-100 border border-gray-700
          ${position === 'top'
            ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
            : 'top-full mt-2 left-1/2 -translate-x-1/2'
          }`}
        >
          {/* Arrow */}
          <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent ${
            position === 'top'
              ? 'top-full border-t-4 border-t-gray-900'
              : 'bottom-full border-b-4 border-b-gray-900'
          }`} />
          {text}
        </div>
      )}
    </div>
  );
}
