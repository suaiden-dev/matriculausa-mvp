import React from 'react';
import { Clock } from 'lucide-react';

interface I20DeadlineTimerCardProps {
  deadline: string | null;
  countdown: string;
  isPaid: boolean;
}

/**
 * I20DeadlineTimerCard - Shows I-20 payment deadline countdown
 */
const I20DeadlineTimerCard: React.FC<I20DeadlineTimerCardProps> = React.memo(({
  deadline,
  countdown,
  isPaid,
}) => {
  if (!deadline || isPaid) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-[#05294E]" />
        I-20 Payment Deadline
      </h3>
      <div className="text-center">
        <div className="text-3xl font-bold text-[#D0151C] mb-2">{countdown}</div>
        <p className="text-sm text-slate-600">Time remaining to pay I-20 Control Fee</p>
        <p className="text-xs text-slate-500 mt-2">
          Deadline: {new Date(deadline).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
});

I20DeadlineTimerCard.displayName = 'I20DeadlineTimerCard';

export default I20DeadlineTimerCard;

