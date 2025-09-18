import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface I20DeadlineTimerProps {
  deadline: Date | null;
  hasPaid: boolean;
}

const I20DeadlineTimer: React.FC<I20DeadlineTimerProps> = ({ deadline, hasPaid }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  // Debug log removido em produção

  // Don't render if deadline is null or already paid
  if (!deadline || hasPaid) {
    return null;
  }

  // Calculate time remaining
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const timeDiff = deadline.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  // Determine section style based on time remaining
  const getSectionStyle = () => {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (timeDiff <= 0) {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500',
        textColor: 'text-red-700',
        titleColor: 'text-red-800'
      };
    } else if (daysLeft <= 1) {
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-500',
        textColor: 'text-red-700',
        titleColor: 'text-red-800'
      };
    } else if (daysLeft <= 3) {
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        iconColor: 'text-yellow-500',
        textColor: 'text-yellow-700',
        titleColor: 'text-yellow-800'
      };
    } else {
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-500',
        textColor: 'text-blue-700',
        titleColor: 'text-blue-800'
      };
    }
  };

  // Get status message
  const getStatusMessage = () => {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (timeDiff <= 0) {
      return 'Deadline expired. Please contact support immediately.';
    } else if (daysLeft <= 1) {
      return 'Urgent: I-20 Control Fee deadline is approaching!';
    } else if (daysLeft <= 3) {
      return 'I-20 Control Fee deadline is approaching. Please pay soon.';
    } else {
      return 'I-20 Control Fee deadline is active.';
    }
  };

  // Get appropriate icon
  const getIcon = () => {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24)); 

    if (timeDiff <= 0) {
      return <AlertTriangle className="w-5 h-5" />;
    } else if (daysLeft <= 3) {
      return <AlertTriangle className="w-5 h-5" />;
    } else {
      return <Clock className="w-5 h-5" />;
    }
  };

  const styles = getSectionStyle();

  return (
    <div className={`${styles.bgColor} rounded-lg border ${styles.borderColor} p-4`}>
      <div className="flex items-center space-x-3 mb-3">
        <div className={styles.iconColor}>
          {getIcon()}
        </div>
        <h3 className={`text-lg font-semibold ${styles.titleColor}`}>
          I-20 Control Fee Deadline
        </h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${styles.textColor}`}>
              Time Remaining:
            </span>
            <span className={`text-xl font-bold ${styles.textColor}`}>
              {timeLeft}
            </span>
          </div>
          <div className={`text-sm ${styles.textColor}`}>
            {isExpired ? 'Expired' : 'Active'}
          </div>
        </div>
        
        <div className={`text-sm ${styles.textColor}`}>
          <div className="font-medium mb-1">Deadline:</div>
          <div>{deadline.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>
        
        <div className={`text-sm ${styles.textColor}`}>
          <div className="font-medium mb-1">Status:</div>
          <div>{getStatusMessage()}</div>
        </div>
      </div>
    </div>
  );
};

export default I20DeadlineTimer;