import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { validateWhatsAppConnection } from '../utils/whatsappUtils';
import { refreshQRCode } from '../services/whatsappService';

export const useQRCodeValidation = (
  instanceName: string | null,
  connectionId: string | null,
  onSuccess: () => void,
  isModalOpen: boolean
) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'open' | 'connected' | 'failed' | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(300);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllIntervals = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
      validationIntervalRef.current = null;
    }
  }, []);

  const handleValidationSuccess = useCallback(async () => {
    if (!instanceName || !connectionId) return;

    try {
      const { error: updateError } = await supabase
        .from('whatsapp_connections')
        .update({
          connection_status: 'connected',
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('instance_name', instanceName);

      if (updateError) {
        console.error('❌ Error updating connection status:', updateError);
      }

      clearAllIntervals();
      onSuccess();
    } catch (error) {
      console.error('Error handling validation success:', error);
    }
  }, [instanceName, connectionId, clearAllIntervals, onSuccess]);

  const refreshQRCodeData = useCallback(async () => {
    if (!instanceName) return;

    setIsAutoRefreshing(true);
    try {
      const qrCodeData = await refreshQRCode(instanceName);
      setQrCodeUrl(qrCodeData);
    } catch (error) {
      console.error('Error refreshing QR code:', error);
      setQrError('Failed to refresh QR code');
    } finally {
      setIsAutoRefreshing(false);
    }
  }, [instanceName]);

  // Efeito para validação periódica
  useEffect(() => {
    if (isModalOpen && instanceName && !qrLoading && connectionStatus !== 'connected') {
      validationIntervalRef.current = setInterval(async () => {
        try {
          const validationResult = await validateWhatsAppConnection(instanceName, {
            instance_name: instanceName
          });

          if (validationResult?.state === 'open' || validationResult?.state === 'connected') {
            setConnectionStatus('connected');
            await handleValidationSuccess();
          }
        } catch (error) {
          console.error('Error during validation:', error);
        }
      }, 30000);
    }

    return () => {
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
      }
    };
  }, [isModalOpen, instanceName, qrLoading, connectionStatus, handleValidationSuccess]);

  // Efeito para atualização automática do QR Code
  useEffect(() => {
    if (isModalOpen && qrCodeUrl && !qrLoading && connectionStatus !== 'connected') {
      const checkInterval = 30000; // 30 segundos
      
      setCountdown(checkInterval / 1000);
      
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return checkInterval / 1000;
          }
          return prev - 1;
        });
      }, 1000);

      intervalRef.current = setInterval(refreshQRCodeData, checkInterval);
    }

    return clearAllIntervals;
  }, [isModalOpen, qrCodeUrl, qrLoading, connectionStatus, refreshQRCodeData, clearAllIntervals]);

  return {
    qrCodeUrl,
    setQrCodeUrl,
    qrLoading,
    setQrLoading,
    qrError,
    setQrError,
    isCheckingConnection,
    setIsCheckingConnection,
    connectionStatus,
    setConnectionStatus,
    isAutoRefreshing,
    countdown,
    refreshQRCodeData
  };
};