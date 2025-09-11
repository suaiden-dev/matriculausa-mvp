import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SellerI20DeadlineTimerProps {
  deadline: Date | null;
  hasPaid: boolean;
  studentName?: string;
}

const SellerI20DeadlineTimer: React.FC<SellerI20DeadlineTimerProps> = ({
  deadline,
  hasPaid,
  studentName
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline || hasPaid) {
      setTimeLeft(null);
      setIsExpired(false);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = deadline.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setIsExpired(false);
    };

    // Calcular imediatamente
    calculateTimeLeft();

    // Atualizar a cada segundo
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [deadline, hasPaid]);

  if (hasPaid) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-xs font-medium text-green-700">Paid</span>
        <CheckCircle2 className="h-3 w-3 text-green-500" />
      </div>
    );
  }

  if (!deadline) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-xs text-slate-400">Not applicable</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span className="text-xs font-medium text-red-700">Expired</span>
        <AlertTriangle className="h-3 w-3 text-red-500" />
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
        <span className="text-xs font-medium text-orange-700">Calculating...</span>
        <Clock className="h-3 w-3 text-orange-500" />
      </div>
    );
  }

  const formatTime = () => {
    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
    if (timeLeft.hours > 0) parts.push(`${timeLeft.hours}h`);
    if (timeLeft.minutes > 0) parts.push(`${timeLeft.minutes}m`);
    if (timeLeft.seconds > 0) parts.push(`${timeLeft.seconds}s`);
    
    return parts.join(' ') || '0s';
  };

  const getUrgencyColor = () => {
    if (timeLeft.days === 0 && timeLeft.hours < 24) {
      return 'text-red-700'; // Menos de 24 horas
    } else if (timeLeft.days < 3) {
      return 'text-orange-700'; // Menos de 3 dias
    } else {
      return 'text-blue-700'; // Mais de 3 dias
    }
  };

  const getUrgencyBgColor = () => {
    if (timeLeft.days === 0 && timeLeft.hours < 24) {
      return 'bg-red-50'; // Menos de 24 horas
    } else if (timeLeft.days < 3) {
      return 'bg-orange-50'; // Menos de 3 dias
    } else {
      return 'bg-blue-50'; // Mais de 3 dias
    }
  };

  const getUrgencyDotColor = () => {
    if (timeLeft.days === 0 && timeLeft.hours < 24) {
      return 'bg-red-500'; // Menos de 24 horas
    } else if (timeLeft.days < 3) {
      return 'bg-orange-500'; // Menos de 3 dias
    } else {
      return 'bg-blue-500'; // Mais de 3 dias
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 ${getUrgencyDotColor()} rounded-full ${timeLeft.days < 3 ? 'animate-pulse' : ''}`}></div>
      <span className={`text-xs font-medium ${getUrgencyColor()}`}>
        {formatTime()}
      </span>
      <Clock className={`h-3 w-3 ${timeLeft.days < 3 ? 'animate-pulse' : ''} ${getUrgencyColor()}`} />
    </div>
  );
};

export default SellerI20DeadlineTimer;
