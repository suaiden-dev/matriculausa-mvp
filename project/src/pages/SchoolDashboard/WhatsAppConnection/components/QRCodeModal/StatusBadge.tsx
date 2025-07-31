import React from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  connectionStatus: 'connecting' | 'open' | 'connected' | 'failed' | null;
  isCheckingConnection: boolean;
  qrError: string | null;
}

export const StatusBadge = ({ connectionStatus, isCheckingConnection, qrError }: StatusBadgeProps) => {
  if (connectionStatus === 'connected') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />Connected!
      </span>
    );
  }

  if (connectionStatus === 'open') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />QR Code scanned, connecting...
      </span>
    );
  }

  if (isCheckingConnection) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />Waiting for connection...
      </span>
    );
  }

  if (qrError) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertCircle className="w-3 h-3 mr-1" />Error
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      Waiting for scan
    </span>
  );
};