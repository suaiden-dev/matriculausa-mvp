import React from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';

interface TimerProps {
  countdown: number;
  isAutoRefreshing: boolean;
}

export const Timer = ({ countdown, isAutoRefreshing }: TimerProps) => {
  return (
    <div className="mt-4 flex justify-center">
      <div className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 bg-blue-500 text-white">
        {isAutoRefreshing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Refreshing QR code...</span>
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4" />
            <span>Next refresh in <span className="font-bold">{countdown}</span>s</span>
          </>
        )}
      </div>
      <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
        <div 
          className="bg-blue-500 h-1 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${Math.max(0, ((300 - countdown) / 300) * 100)}%` }}
        />
      </div>
    </div>
  );
};