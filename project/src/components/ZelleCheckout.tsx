import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, X, Clock, Loader2, FileUp, Send, Sparkles, Info, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { usePaymentBlocked } from '../hooks/usePaymentBlocked';
import { supabase } from '../lib/supabase';
import { generateUUID } from '../utils/uuid';
import { config } from '../lib/config';

interface ZelleCheckoutProps {
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee' | 'i20_control_fee' | 'placement_fee';
  amount: number;
  scholarshipsIds?: string[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  isPendingVerification?: boolean;
  metadata?: { 
    [key: string]: any;
    discount_applied?: boolean;
    original_amount?: number;
    final_amount?: number;
  };
  onProcessingChange?: (isProcessing: boolean) => void;
  hideHeader?: boolean;
}

export const ZelleCheckout: React.FC<ZelleCheckoutProps> = ({
  feeType,
  amount,
  scholarshipsIds,
  onSuccess,
  onError,
  className = '',
  isPendingVerification = false,
  metadata = {},
  onProcessingChange,
  hideHeader = false
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const { isBlocked, pendingPayment: blockedPendingPayment, rejectedPayment: blockedRejectedPayment, approvedPayment: blockedApprovedPayment, loading: paymentBlockedLoading, refetch: refetchPaymentStatus } = usePaymentBlocked();
  
  // Localhost Test Mode
  const isLocalhost = config.isDevelopment();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'instructions' | 'analyzing' | 'success' | 'under_review' | 'rejected'>(
    (isPendingVerification || (isBlocked && blockedPendingPayment?.fee_type === feeType)) ? 'under_review' : 'instructions'
  );

  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zellePaymentId, setZellePaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'analyzing' | 'approved' | 'under_review' | 'rejected'>('analyzing');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState<'uploading' | 'sending' | 'analyzing'>('uploading');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastProcessedPaymentIdRef = useRef<string | null>(null);
  const lastProcessedRejectedIdRef = useRef<string | null>(null);
  const lastDataKeyRef = useRef<string | null>(null);
  const stepRef = useRef(step);
  const zellePaymentIdRef = useRef(zellePaymentId);
  const rejectionReasonRef = useRef(rejectionReason);
  const paymentStatusRef = useRef(paymentStatus);
  const isProcessingRef = useRef(isProcessing);
  
  // Atualizar refs quando estados mudam
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  
  useEffect(() => {
    zellePaymentIdRef.current = zellePaymentId;
  }, [zellePaymentId]);
  
  useEffect(() => {
    rejectionReasonRef.current = rejectionReason;
  }, [rejectionReason]);
  
  useEffect(() => {
    paymentStatusRef.current = paymentStatus;
  }, [paymentStatus]);
  
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const handleMockSuccess = async () => {
    setLoading(true);
    setError(null);
    setIsProcessing(true);
    onProcessingChange?.(true);
    
    try {
      if (user?.id) {
        const mockPaymentId = generateUUID();
        
        const { error: insertError } = await supabase
          .from('zelle_payments')
          .insert({
            id: mockPaymentId,
            user_id: user.id,
            fee_type: feeType,
            amount: amount,
            status: 'approved',
            scholarships_ids: scholarshipsIds || [],
            screenshot_url: 'https://placehold.co/600x400/png?text=Mock+Payment',
            admin_notes: 'Mock Payment (Localhost)',
            created_at: new Date().toISOString(),
            admin_approved_at: new Date().toISOString(),
            metadata: {
              ...metadata,
              is_mock: true
            }
          });

        if (insertError) {
          console.error('Error creating mock payment:', insertError);
        } else {
          console.log('✅ Mock payment created in database:', mockPaymentId);
          setZellePaymentId(mockPaymentId);
          zellePaymentIdRef.current = mockPaymentId;
        }

        if (feeType === 'selection_process') {
          await supabase
            .from('user_profiles')
            .update({ 
              has_paid_selection_process_fee: true,
              selection_process_fee_payment_method: 'zelle',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        } else if (feeType === 'application_fee' || feeType === 'scholarship_fee' || feeType === 'placement_fee') {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profileData?.id) {
            const fieldToUpdate = feeType === 'application_fee' 
              ? 'is_application_fee_paid' 
              : feeType === 'scholarship_fee' ? 'is_scholarship_fee_paid' : 'is_placement_fee_paid';
            
            if (scholarshipsIds && scholarshipsIds.length > 0) {
              for (const scholarshipId of scholarshipsIds) {
                await supabase
                  .from('scholarship_applications')
                  .update({ 
                    [fieldToUpdate]: true,
                    updated_at: new Date().toISOString()
                  })
                  .eq('student_id', profileData.id)
                  .eq('scholarship_id', scholarshipId);
              }
            }

            const syncData: any = { updated_at: new Date().toISOString() };
            if (feeType === 'application_fee') {
              syncData.is_application_fee_paid = true;
              syncData.application_fee_paid_at = new Date().toISOString();
            } else if (feeType === 'scholarship_fee') {
              syncData.is_scholarship_fee_paid = true;
              syncData.scholarship_fee_paid_at = new Date().toISOString();
            } else if (feeType === 'placement_fee') {
              syncData.is_placement_fee_paid = true;
            }

            await supabase
              .from('user_profiles')
              .update(syncData)
              .eq('id', profileData.id);
          }
        } else if (feeType === 'i20_control_fee') {
          await supabase
            .from('user_profiles')
            .update({ 
              has_paid_i20_control_fee: true,
              i20_control_fee_payment_method: 'zelle',
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }
      }

      setStep('success');
      setPaymentStatus('approved');
      stepRef.current = 'success';
      paymentStatusRef.current = 'approved';
      
      setTimeout(() => {
        onSuccess?.();
      }, 500);
      
    } catch (err: any) {
      setError(err.message || 'Mock failed');
    } finally {
      setLoading(false);
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  const determinePaymentState = (
    pendingPayment: any,
    rejectedPayment: any,
    approvedPayment: any,
    currentStep: string,
    currentZellePaymentId: string | null,
    currentRejectionReason: string | null
  ): any => {
    if (approvedPayment && approvedPayment.fee_type === feeType) {
      if (!pendingPayment || approvedPayment.id === pendingPayment.id) {
        return {
          step: 'success',
          paymentStatus: 'approved',
          zellePaymentId: approvedPayment.id,
          rejectionReason: null,
          isProcessing: false
        };
      }
    }

    if (currentStep === 'success') {
      return {
        step: 'success',
        paymentStatus: 'approved',
        zellePaymentId: currentZellePaymentId,
        rejectionReason: null,
        isProcessing: false
      };
    }

    if (rejectedPayment && rejectedPayment.fee_type === feeType) {
      const isNewUpload = (currentStep === 'instructions' || currentStep === 'analyzing' || currentStep === 'under_review') && 
                          currentZellePaymentId && 
                          currentZellePaymentId !== rejectedPayment.id;
      
      if (!isNewUpload) {
        if (!pendingPayment || rejectedPayment.id === pendingPayment.id) {
          return {
            step: 'rejected',
            paymentStatus: 'rejected',
            zellePaymentId: rejectedPayment.id,
            rejectionReason: rejectedPayment.admin_notes || 'Payment was rejected by admin',
            isProcessing: false
          };
        }
      }
    }

    if (currentStep === 'rejected') {
      return {
        step: 'rejected',
        paymentStatus: 'rejected',
        zellePaymentId: currentZellePaymentId,
        rejectionReason: currentRejectionReason,
        isProcessing: false
      };
    }

    if (pendingPayment && pendingPayment.fee_type === feeType) {
      const paymentId = pendingPayment.id;
      
      switch (pendingPayment.status) {
        case 'rejected':
          return {
            step: 'rejected',
            paymentStatus: 'rejected',
            zellePaymentId: paymentId,
            rejectionReason: null,
            isProcessing: false
          };
        case 'approved':
        case 'verified':
          return {
            step: 'success',
            paymentStatus: 'approved',
            zellePaymentId: paymentId,
            rejectionReason: null,
            isProcessing: false
          };
        case 'pending_verification':
          return {
            step: 'under_review',
            paymentStatus: 'under_review',
            zellePaymentId: paymentId,
            rejectionReason: null,
            isProcessing: true
          };
        case 'pending':
        default:
          return {
            step: 'analyzing',
            paymentStatus: 'analyzing',
            zellePaymentId: paymentId,
            rejectionReason: null,
            isProcessing: true
          };
      }
    }

    if (currentZellePaymentId && !pendingPayment && !rejectedPayment && (currentStep === 'analyzing' || currentStep === 'under_review')) {
      return {
        step: currentStep,
        paymentStatus: currentStep === 'under_review' ? 'under_review' : 'analyzing',
        zellePaymentId: currentZellePaymentId,
        rejectionReason: currentRejectionReason,
        isProcessing: true
      };
    }

    if (!currentZellePaymentId) {
      return {
        step: 'instructions',
        paymentStatus: 'analyzing',
        zellePaymentId: null,
        rejectionReason: null,
        isProcessing: false
      };
    }

    return {
      step: currentStep,
      paymentStatus: currentStep === 'under_review' ? 'under_review' : 'analyzing',
      zellePaymentId: currentZellePaymentId,
      rejectionReason: currentRejectionReason,
      isProcessing: currentStep === 'analyzing' || currentStep === 'under_review'
    };
  };

  useEffect(() => {
    if (!paymentBlockedLoading && step === 'instructions' && !zellePaymentId) {
      if (blockedPendingPayment && blockedPendingPayment.fee_type === feeType) {
        const newState = determinePaymentState(blockedPendingPayment, blockedRejectedPayment, blockedApprovedPayment, 'instructions', null, null);
        setStep(newState.step);
        setPaymentStatus(newState.paymentStatus);
        setZellePaymentId(newState.zellePaymentId);
        setIsProcessing(newState.isProcessing);
        onProcessingChange?.(newState.isProcessing);
        stepRef.current = newState.step;
        paymentStatusRef.current = newState.paymentStatus;
        zellePaymentIdRef.current = newState.zellePaymentId;
        isProcessingRef.current = newState.isProcessing;
      } else if (blockedApprovedPayment && blockedApprovedPayment.fee_type === feeType) {
        setStep('success');
        setPaymentStatus('approved');
        setZellePaymentId(blockedApprovedPayment.id);
        setIsProcessing(false);
        onProcessingChange?.(false);
        stepRef.current = 'success';
        paymentStatusRef.current = 'approved';
        zellePaymentIdRef.current = blockedApprovedPayment.id;
        isProcessingRef.current = false;
        onSuccess?.();
      } else if (blockedRejectedPayment && blockedRejectedPayment.fee_type === feeType) {
        setStep('rejected');
        setPaymentStatus('rejected');
        setZellePaymentId(blockedRejectedPayment.id);
        setRejectionReason(blockedRejectedPayment.admin_notes || 'Payment was rejected by admin');
        setIsProcessing(false);
        onProcessingChange?.(false);
        stepRef.current = 'rejected';
        paymentStatusRef.current = 'rejected';
        zellePaymentIdRef.current = blockedRejectedPayment.id;
        isProcessingRef.current = false;
      }
    }
  }, [paymentBlockedLoading, blockedPendingPayment?.id, blockedRejectedPayment?.id, blockedApprovedPayment?.id, feeType]);

  useEffect(() => {
    if (paymentBlockedLoading) return;

    if ((stepRef.current === 'analyzing' || stepRef.current === 'under_review') && 
        zellePaymentIdRef.current && 
        blockedRejectedPayment && 
        blockedRejectedPayment.id !== zellePaymentIdRef.current) {
      if (!blockedPendingPayment || blockedPendingPayment.id !== zellePaymentIdRef.current) return;
    }

    const currentPendingId = blockedPendingPayment?.id || null;
    const currentRejectedId = blockedRejectedPayment?.id || null;
    const currentPendingStatus = blockedPendingPayment?.status || null;
    const currentRejectedStatus = blockedRejectedPayment?.status || null;
    const dataKey = `${currentPendingId}-${currentPendingStatus}-${currentRejectedId}-${currentRejectedStatus}`;
    
    if (dataKey === lastDataKeyRef.current) {
      if ((stepRef.current === 'analyzing' || stepRef.current === 'under_review') && !blockedPendingPayment && zellePaymentIdRef.current) return;
      return;
    }

    lastDataKeyRef.current = dataKey;
    if (currentPendingId) lastProcessedPaymentIdRef.current = currentPendingId;
    if (currentRejectedId) lastProcessedRejectedIdRef.current = currentRejectedId;

    const newState = determinePaymentState(blockedPendingPayment, blockedRejectedPayment, blockedApprovedPayment, stepRef.current, zellePaymentIdRef.current, rejectionReasonRef.current);

    if (newState.step !== stepRef.current) setStep(newState.step);
    if (newState.zellePaymentId !== zellePaymentIdRef.current) setZellePaymentId(newState.zellePaymentId);
    if (newState.rejectionReason !== rejectionReasonRef.current) setRejectionReason(newState.rejectionReason);
    if (newState.paymentStatus !== paymentStatusRef.current) setPaymentStatus(newState.paymentStatus);
    if (newState.isProcessing !== isProcessingRef.current) {
      setIsProcessing(newState.isProcessing);
      onProcessingChange?.(newState.isProcessing);
    }

    if (newState.step === 'success' && stepRef.current !== 'success') onSuccess?.();

    if (newState.step === 'rejected' && !newState.rejectionReason && newState.zellePaymentId) {
      supabase.from('zelle_payments').select('admin_notes, status').eq('id', newState.zellePaymentId).maybeSingle().then(({ data }) => {
        if (data?.admin_notes) setRejectionReason(data.admin_notes);
        if (data?.status === 'rejected' && !blockedRejectedPayment) lastDataKeyRef.current = null;
      });
    }
  }, [blockedPendingPayment?.id, blockedPendingPayment?.status, blockedRejectedPayment?.id, blockedRejectedPayment?.status, blockedApprovedPayment?.id, blockedApprovedPayment?.status, paymentBlockedLoading, feeType]);

  useEffect(() => {
    if (!zellePaymentId || step === 'rejected' || step === 'success' || step === 'instructions') return;
    if (step !== 'analyzing' && step !== 'under_review') return;

    const pollPaymentStatus = async () => {
      try {
        const { data: paymentData } = await supabase.from('zelle_payments').select('id, status, admin_notes').eq('id', zellePaymentId).eq('fee_type', feeType).maybeSingle();
        if (!paymentData) return;

        if (paymentData.status === 'rejected') {
          setStep('rejected');
          setPaymentStatus('rejected');
          setRejectionReason(paymentData.admin_notes || 'Payment was rejected by admin');
          setIsProcessing(false);
          onProcessingChange?.(false);
          stepRef.current = 'rejected';
          paymentStatusRef.current = 'rejected';
          isProcessingRef.current = false;
          lastDataKeyRef.current = null;
          return;
        }

        if (paymentData.status === 'approved' || paymentData.status === 'verified') {
          setStep('success');
          setPaymentStatus('approved');
          setIsProcessing(false);
          onProcessingChange?.(false);
          stepRef.current = 'success';
          paymentStatusRef.current = 'approved';
          isProcessingRef.current = false;
          onSuccess?.();
          lastDataKeyRef.current = null;
          return;
        }
      } catch (error) {
        console.error('❌ [ZelleCheckout] Polling error:', error);
      }
    };

    pollPaymentStatus();
    const interval = setInterval(pollPaymentStatus, 10000);
    return () => clearInterval(interval);
  }, [zellePaymentId, step, feeType]);

  const copyEmail = () => {
    navigator.clipboard.writeText("pay@matriculausa.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setError(t('common:components.errors.fileSize')); return; }
      if (!file.type.startsWith('image/')) { setError(t('common:components.errors.fileType')); return; }
      setComprovanteFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => setComprovantePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadComprovante = async (): Promise<string | null> => {
    if (!comprovanteFile) return null;
    try {
      setUploadStep('uploading');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileExt = comprovanteFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${timestamp}_${feeType}.${fileExt}`;
      const filePath = `zelle-payments/${user?.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('zelle_comprovantes').upload(filePath, comprovanteFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('zelle_comprovantes').getPublicUrl(filePath);
      await new Promise(resolve => setTimeout(resolve, 300));
      return publicUrl;
    } catch (error) {
      throw new Error(t('common:components.errors.uploadFailed'));
    }
  };

  const handleSubmit = async () => {
    if (isBlocked && blockedPendingPayment) {
      setError(t('common:components.errors.alreadyPending'));
      return;
    }
    if (!comprovanteFile) {
      setError(t('common:components.errors.uploadRequired'));
      return;
    }
    
    setLoading(true);
    setError(null);
    setShowUploadModal(true);
    
    try {
      const comprovanteUrl = await uploadComprovante();
      if (!comprovanteUrl) throw new Error('Upload failed');
      
      setUploadStep('sending');
      
      const realPaymentId = generateUUID();
      setZellePaymentId(realPaymentId);
      zellePaymentIdRef.current = realPaymentId;

      // Invocamos a Edge Function para criar o registro e disparar o n8n
      // Capture the actual payment ID from the server
      const { data: functionData, error: functionError } = await supabase.functions.invoke('create-zelle-payment', {
        body: {
          fee_type: feeType,
          amount: amount,
          comprovante_url: comprovanteUrl,
          payment_id: realPaymentId,
          scholarships_ids: scholarshipsIds,
          metadata: { ...metadata, source: 'zelle_onboarding_v3' }
        }
      });

      if (functionError) throw functionError;

      if (functionData?.payment_id) {
        setZellePaymentId(functionData.payment_id);
        zellePaymentIdRef.current = functionData.payment_id;
      }

      setUploadStep('analyzing');
      
      // Trigger a refetch of the blocked state to update the global context
      refetchPaymentStatus();

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setShowUploadModal(false);
      setStep('analyzing');
      setPaymentStatus('analyzing');
      setIsProcessing(true);
      onProcessingChange?.(true);
      
    } catch (error: any) {
      setShowUploadModal(false);
      setError(error.message || 'Error processing payment');
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  const UploadModal = () => {
    if (!showUploadModal || step === 'rejected' || step === 'success') return null;
    const info = {
      uploading: { icon: FileUp, title: t('payment:zelleWaiting.actions.uploadingDocument'), message: t('payment:zelleWaiting.actions.uploadingWait'), colorClass: 'bg-blue-500', barClass: 'bg-blue-500' },
      sending: { icon: Send, title: t('payment:zelleWaiting.actions.sendingDocument'), message: t('payment:zelleWaiting.actions.sendingWait'), colorClass: 'bg-indigo-500', barClass: 'bg-indigo-500' },
      analyzing: { icon: Sparkles, title: t('payment:zelleWaiting.analyzingPayment'), message: t('payment:zelleWaiting.details.analyzingAi'), colorClass: 'bg-blue-500', barClass: 'bg-blue-500' }
    }[uploadStep] || { icon: Loader2, title: 'Processing...', message: 'Please wait', colorClass: 'bg-blue-500', barClass: 'bg-blue-500' };

    const Icon = info.icon;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden">
          <div className="relative z-10 text-center">
            <div className={`mb-6 flex justify-center`}>
              <div className={`relative w-20 h-20 ${info.colorClass} rounded-2xl flex items-center justify-center shadow-xl`}>
                <Icon className="w-10 h-10 text-white animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{info.title}</h3>
            <p className="text-gray-600 mb-2 text-sm">{info.message}</p>
          </div>
        </div>
      </div>
    );
  };

  if (step === 'analyzing') {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-[2rem] p-8 text-center shadow-lg ${className}`}>
        <div className="relative w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
          <Sparkles className="w-10 h-10 text-white animate-pulse" />
        </div>
        <h3 className="text-2xl font-black text-blue-900 mb-2 uppercase tracking-tight">{t('payment:zelleWaiting.analyzingPayment')}</h3>
        <p className="text-blue-700 font-medium mb-6">{t('payment:zelleWaiting.details.analyzingAi')}</p>
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  if (step === 'under_review') {
    return (
      <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-[2rem] p-8 shadow-lg ${className}`}>
        <div className="text-center mb-6">
          <div className="relative w-20 h-20 bg-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
            <Clock className="w-10 h-10 text-amber-600 animate-pulse" />
          </div>
          <h3 className="text-2xl font-black text-amber-800 mb-2 uppercase tracking-tight">{t('payment:zelleWaiting.messages.under_review')}</h3>
          <p className="text-amber-700 font-medium leading-relaxed text-sm">{t('payment:zelleWaiting.details.under_review')}</p>
        </div>

        {/* Bouncing Dots indicator */}
        <div className="flex justify-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-inner border border-amber-100 space-y-3">
          <div className="flex justify-between text-sm text-slate-900 font-bold">
            <span>{t('payment:zelleCheckout.amount')}</span>
            <span>${amount.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-sm text-slate-900 font-bold">
            <span>{t('payment:zelleModal.paymentId')}</span>
            <span className="font-mono text-[10px]">{zellePaymentId || blockedPendingPayment?.id}</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'rejected') {
    return (
      <div className={`bg-red-50 border-2 border-red-300 rounded-[2rem] p-8 ${className}`}>
        <div className="text-center mb-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-red-800 mb-2 uppercase tracking-tight">{t('payment:zelleWaiting.messages.rejected')}</h3>
          <p className="text-red-700 font-medium">{t('payment:zelleWaiting.details.rejected')}</p>
        </div>
        {rejectionReason && (
          <div className="bg-white rounded-2xl border-2 border-red-200 p-6 mb-6">
            <h4 className="font-bold text-gray-900 mb-2">{t('payment:zelleModal.rejectionReason')}</h4>
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-xl border border-red-100">{rejectionReason}</p>
          </div>
        )}
        <button onClick={() => { setStep('instructions'); setZellePaymentId(null); setComprovanteFile(null); }} className="w-full bg-red-600 text-white py-4 rounded-xl hover:bg-red-700 transition-all font-black uppercase tracking-widest shadow-lg active:scale-95">
          {t('payment:zelleModal.uploadNewProof')}
        </button>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className={`bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-[2rem] p-8 text-center shadow-lg ${className}`}>
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200/50 scale-110 border-4 border-white/30">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
        <h3 className="text-2xl font-black text-green-900 mb-2 uppercase tracking-tight">{t('payment:zelleWaiting.messages.approved')}</h3>
        <p className="text-green-700 font-medium mb-8 leading-relaxed font-outfit">{t('payment:zelleWaiting.details.approved')}</p>
        {!onSuccess && (
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg active:scale-95 shadow-green-200"
          >
            FECHAR
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <UploadModal />
      <div className={`bg-white rounded-[2.5rem] px-0 py-6 md:py-8 max-w-5xl mx-auto shadow-sm ${className}`}>
        {/* Header Principal */}
        {!hideHeader && (
          <div className="flex justify-between items-center mb-8 px-2">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{t('payment:zelleCheckout.title')}</h2>
            {!onSuccess && (
              <button onClick={() => window.location.reload()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            )}
          </div>
        )}
        <div className="space-y-0 border border-slate-300 rounded-[2rem] overflow-hidden shadow-sm">
          <div className="bg-white py-6 md:py-8 border-b border-slate-100 px-4 md:px-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('payment:zelleCheckout.zellePaymentDetails.paymentInstructions')}</h3>
            <p className="text-base text-gray-500 mb-8 font-medium">{t('payment:zelleCheckout.zellePaymentDetails.paymentInstructionsSubtitle')}</p>

            {/* Detalhes do Pagamento Zelle (Card Interno) */}
            <div className="bg-gray-50/50 rounded-[1.5rem] py-8 space-y-6 border border-slate-100/50 px-0">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">{t('payment:zelleCheckout.zellePaymentDetails.recipientEmail')}</label>
                  <div className="bg-white border border-slate-300 rounded-2xl px-6 py-4 font-mono text-lg text-gray-700 font-bold shadow-sm flex items-center justify-between h-16 group">
                    <span>pay@matriculausa.com</span>
                    <button 
                      onClick={copyEmail}
                      className="ml-2 p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-blue-500 relative"
                      title={t('payment:zelleCheckout.zellePaymentDetails.copiedTooltip')}
                    >
                      {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      {copied && (
                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap animate-in fade-in zoom-in duration-200">
                          {t('payment:zelleCheckout.zellePaymentDetails.copied')}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">{t('payment:zelleCheckout.zellePaymentDetails.paymentAmount')}</label>
                  <div className="bg-white border border-slate-300 rounded-2xl px-6 py-4 font-black text-xl text-gray-900 shadow-sm flex items-center h-16">
                    ${amount.toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Box Importante */}
              <div className="bg-gray-100/50 border border-slate-300 rounded-2xl p-4 flex gap-3 items-start mx-0">
                <Info className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="text-[13px] leading-relaxed text-gray-600 font-medium">
                  <span className="font-bold text-gray-700 text-sm">{t('payment:zelleCheckout.zellePaymentDetails.important')}</span><br />
                  <span dangerouslySetInnerHTML={{ __html: t('payment:zelleCheckout.zellePaymentDetails.importantMessage', { amount: amount.toFixed(2) }) }} />
                </div>
              </div>
            </div>
          </div>

          {/* Sessão: Upload do Comprovante (Agora dentro do mesmo container) */}
          <div className="bg-white px-4 md:px-6 py-10 space-y-6">
            <h3 className="font-bold text-gray-900 text-lg">{t('payment:zelleCheckout.uploadReceiptDescription')} *</h3>
            
            <div 
              className={`border-2 border-dashed rounded-[2rem] p-4 md:p-8 text-center transition-all cursor-pointer ${comprovantePreview ? 'border-blue-300 bg-blue-50/50' : 'border-slate-300 hover:border-blue-300 bg-gray-50/30'}`}
              onClick={() => !comprovantePreview && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              
              {comprovantePreview ? (
                <div className="relative inline-block">
                  <img src={comprovantePreview} className="max-h-64 rounded-2xl shadow-xl border-4 border-white" />
                  <button onClick={(e) => { e.stopPropagation(); setComprovanteFile(null); setComprovantePreview(null); }} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-xl hover:bg-red-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Upload className="w-10 h-10 text-gray-300" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-gray-700">{t('payment:zelleCheckout.dragAndDrop')}</p>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('payment:zelleCheckout.supportedFormats')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botão de Ação Principal */}
        <div className="mt-8 px-2 space-y-6">
          <button
            onClick={handleSubmit}
            disabled={loading || !comprovanteFile}
            className={`w-full ${comprovanteFile ? 'bg-blue-600 shadow-blue-200' : 'bg-[#8EADF1] shadow-blue-100'} disabled:bg-blue-200 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest hover:brightness-95 transition-all shadow-xl active:scale-[0.98] disabled:cursor-not-allowed`}
          >
            {loading ? t('payment:zelleCheckout.processing') : t('payment:zelleCheckout.submitPayment')}
          </button>

          {isLocalhost && (
            <div className="mt-8 p-6 bg-amber-50/50 border border-amber-200 rounded-[2rem] text-center">
               <p className="text-[10px] font-black text-amber-800 uppercase mb-4 tracking-tighter opacity-70">
                 TEST MODE (LOCALHOST ONLY)
               </p>
               <button 
                onClick={handleMockSuccess}
                className="w-full bg-[#D97706] text-white py-4 rounded-xl font-black text-xs hover:brightness-95 transition-all uppercase tracking-widest shadow-lg active:scale-[0.98]"
              >
                SKIP TO SUCCESS (MOCK)
              </button>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs font-bold text-red-600 flex items-center gap-3 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
