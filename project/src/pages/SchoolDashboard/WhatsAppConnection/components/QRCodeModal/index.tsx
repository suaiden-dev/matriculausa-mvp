import React from 'react';
import { X, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Timer } from './Timer';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  qrCodeUrl: string | null;
  qrLoading: boolean;
  qrError: string | null;
  isCheckingConnection: boolean;
  connectionStatus: 'connecting' | 'open' | 'connected' | 'failed' | null;
  isAutoRefreshing: boolean;
  countdown: number;
}

export const QRCodeModal = ({
  isOpen,
  onClose,
  onRefresh,
  qrCodeUrl,
  qrLoading,
  qrError,
  isCheckingConnection,
  connectionStatus,
  isAutoRefreshing,
  countdown
}: QRCodeModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Connect WhatsApp</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            title="Close modal"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-600 mb-6">
          Scan the QR Code with your phone to connect your WhatsApp account.
        </p>
        
        <div className="space-y-6">
          <div className="flex justify-center">
            <StatusBadge
              connectionStatus={connectionStatus}
              isCheckingConnection={isCheckingConnection}
              qrError={qrError}
            />
          </div>

          <div className="flex flex-col items-center space-y-4 h-56 justify-center">
            {qrLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Generating QR Code...</p>
              </>
            ) : qrError ? (
              <div className="text-center space-y-3">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <p className="text-sm text-red-600">{qrError}</p>
              </div>
            ) : qrCodeUrl ? (
              <>
                <img
                  src={`data:image/png;base64,${qrCodeUrl}`}
                  alt="QR Code for WhatsApp connection"
                  className="mx-auto"
                  style={{ width: 200, height: 200 }} 
                />
                <Timer countdown={countdown} isAutoRefreshing={isAutoRefreshing} />
              </>
            ) : null}
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={onRefresh}
              disabled={qrLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {qrLoading ? "Generating..." : "Refresh QR Code"}
            </button>
            
            <button 
              onClick={onClose} 
              className="w-full px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};