import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { is3800Scholarship, get3800ScholarshipTimeRemaining, is3800ScholarshipExpired } from '../utils/scholarshipDeadlineValidation';
import type { Scholarship } from '../types';

interface ScholarshipCountdownTimerProps {
  scholarship: Scholarship;
  className?: string;
}

/**
 * Componente de timer regressivo para bolsas de $3800
 * Mostra horas e minutos restantes até o deadline
 * Quando expira, mostra badge de "Expirado"
 */
export const ScholarshipCountdownTimer: React.FC<ScholarshipCountdownTimerProps> = ({
  scholarship,
  className = ''
}) => {
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Verificar se é bolsa de $3800
    if (!is3800Scholarship(scholarship)) {
      return;
    }

    // Atualizar timer imediatamente
    const updateTimer = () => {
      const expired = is3800ScholarshipExpired(scholarship);
      setIsExpired(expired);
      
      if (expired) {
        setTimeRemaining(null);
        return;
      }

      const remaining = get3800ScholarshipTimeRemaining(scholarship);
      setTimeRemaining(remaining);
      
      // Se não há mais tempo restante, marcar como expirado
      if (!remaining) {
        setIsExpired(true);
      }
    };

    updateTimer();

    // Atualizar a cada segundo
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [scholarship]);

  // Não renderizar se não for bolsa de $3800
  if (!is3800Scholarship(scholarship)) {
    return null;
  }

  // Se expirou, não mostrar nada (retornar null)
  // O badge vermelho foi removido conforme solicitado
  if (isExpired || !timeRemaining) {
    return null;
  }

  const { hours, minutes } = timeRemaining;

  // Calcular dias a partir das horas
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  // Formatar o texto do timer
  let timerText = '';
  if (days > 0) {
    timerText = `${days}d ${remainingHours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
  } else {
    timerText = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm border border-white/20 bg-gradient-to-r from-orange-500 to-orange-600 text-white ${className}`}
    >
      <Clock className="h-3 w-3" />
      <span>{timerText}</span>
    </div>
  );
};

