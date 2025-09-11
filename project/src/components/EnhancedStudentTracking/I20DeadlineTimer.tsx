import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface I20DeadlineTimerProps {
  deadline: Date | null;
  hasPaid: boolean;
}

const I20DeadlineTimer: React.FC<I20DeadlineTimerProps> = ({ deadline, hasPaid }) => {
  const [countdown, setCountdown] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline || hasPaid) {
      setCountdown(null);
      setIsExpired(false);
      return;
    }

    function updateCountdown() {
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown('Expired');
        setIsExpired(true);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      
      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      setIsExpired(false);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [deadline, hasPaid]);

  if (!deadline || hasPaid) {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
      isExpired 
        ? 'bg-red-50 border-red-200' 
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center space-x-3">
        {isExpired ? (
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
        ) : (
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${
              isExpired ? 'text-red-800' : 'text-blue-800'
            }`}>
              I-20 Control Fee Deadline
            </span>
            {isExpired && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                EXPIRED
              </span>
            )}
          </div>
          <div className="mt-1">
            {isExpired ? (
              <span className="text-red-600 font-bold text-lg">
                Payment deadline has passed
              </span>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 text-sm">Time remaining:</span>
                <span className="font-mono text-lg font-bold text-blue-800 tracking-wider">
                  {countdown}
                </span>
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Deadline: {deadline.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default I20DeadlineTimer;
