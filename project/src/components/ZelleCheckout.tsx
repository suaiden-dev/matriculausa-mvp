import React, { useState, useRef } from 'react';
import { Upload, DollarSign, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface ZelleCheckoutProps {
  feeType: 'selection_process' | 'application_fee' | 'enrollment_fee' | 'scholarship_fee';
  amount: number;
  scholarshipsIds?: string[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  metadata?: { 
    [key: string]: any;
    discount_applied?: boolean;
    original_amount?: number;
    final_amount?: number;
  };
}

export const ZelleCheckout: React.FC<ZelleCheckoutProps> = ({
  feeType,
  amount,
  scholarshipsIds,
  onSuccess,
  onError,
  className = '',
  metadata = {}
}) => {
  const { user } = useAuth();
  
  console.log('🔍 [ZelleCheckout] Componente renderizado com props:', {
    feeType,
    amount,
    metadata,
    discount_applied: metadata?.discount_applied,
    original_amount: metadata?.original_amount,
    final_amount: metadata?.final_amount
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'instructions' | 'upload' | 'success'>('instructions');
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovantePreview, setComprovantePreview] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    confirmationCode: '',
    paymentDate: '',
    recipientEmail: '',
    recipientName: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [zellePaymentId, setZellePaymentId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (JPG, PNG, etc.)');
        return;
      }
      
      setComprovanteFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setComprovantePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setPaymentDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validatePaymentDetails = () => {
    if (!paymentDetails.confirmationCode.trim()) {
      setError('Confirmation code is required');
      return false;
    }
    if (!paymentDetails.paymentDate) {
      setError('Payment date is required');
      return false;
    }
    if (!paymentDetails.recipientEmail.trim()) {
      setError('Recipient email is required');
      return false;
    }
    if (!paymentDetails.recipientName.trim()) {
      setError('Recipient name is required');
      return false;
    }
    if (!comprovanteFile) {
      setError('Please upload a screenshot of your payment confirmation');
      return false;
    }
    return true;
  };

  const uploadComprovante = async (): Promise<string | null> => {
    if (!comprovanteFile) return null;
    
    try {
      // Usar nome de arquivo organizado: timestamp_fee_type.extension
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileExt = comprovanteFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${timestamp}_${feeType}.${fileExt}`;
      const filePath = `zelle-payments/${user?.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('zelle_comprovantes')
        .upload(filePath, comprovanteFile);
      
      if (uploadError) {
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('zelle_comprovantes')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading comprovante:', error);
      throw new Error('Failed to upload payment confirmation');
    }
  };

  const sendToN8n = async (comprovanteUrl: string) => {
    try {
      // Gerar ID temporário para o n8n
      const tempPaymentId = `temp_${Date.now()}_${user?.id}`;
      
      // Payload para o n8n
      const webhookPayload = {
        user_id: user?.id,
        image_url: comprovanteUrl,
        value: amount.toString(),
        currency: 'USD',
        fee_type: feeType,
        timestamp: new Date().toISOString(),
        temp_payment_id: tempPaymentId,
        confirmation_code: paymentDetails.confirmationCode,
        payment_date: paymentDetails.paymentDate,
        recipient_email: paymentDetails.recipientEmail,
        recipient_name: paymentDetails.recipientName,
        scholarships_ids: scholarshipsIds,
        metadata: {
          ...metadata,
          payment_method: 'zelle',
          comprovante_uploaded_at: new Date().toISOString()
        }
      };

      console.log('📤 [ZelleCheckout] Enviando para n8n:', webhookPayload);

      const response = await fetch('https://nwh.suaiden.com/webhook/zelle-global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ [ZelleCheckout] Enviado para n8n com sucesso');
      return tempPaymentId;
    } catch (error) {
      console.error('Error sending to n8n:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!validatePaymentDetails()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Upload comprovante
      const comprovanteUrl = await uploadComprovante();
      if (!comprovanteUrl) {
        throw new Error('Failed to upload payment confirmation');
      }
      
      // Enviar apenas para n8n - sem INSERT direto no banco
      const tempPaymentId = await sendToN8n(comprovanteUrl);
      setZellePaymentId(tempPaymentId);
      
      // Move to success step
      setStep('success');
      onSuccess?.();
      
    } catch (error: any) {
      setError(error.message || 'An error occurred while processing your payment');
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setComprovanteFile(null);
    setComprovantePreview(null);
    setPaymentDetails({
      confirmationCode: '',
      paymentDate: '',
      recipientEmail: '',
      recipientName: ''
    });
    setError(null);
    setStep('instructions');
  };

  if (step === 'success') {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-6 text-center ${className}`}>
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-800 mb-2">
          Payment Submitted Successfully!
        </h3>
        <p className="text-green-700 mb-4">
          Your Zelle payment has been submitted and is being automatically validated. 
          You will receive access to your requested features once validation is complete.
        </p>
        <div className="bg-white rounded-lg p-4 mb-4 text-left">
          <h4 className="font-semibold text-gray-800 mb-2">Payment Details:</h4>
          <div className="space-y-1 text-sm text-gray-600">
            {metadata?.discount_applied && metadata?.original_amount ? (
              <div className="space-y-1">
                <div><strong>Original Amount:</strong> ${metadata.original_amount.toFixed(2)} USD</div>
                <div><strong>Discount Applied:</strong> -$50.00 USD</div>
                <div><strong>Final Amount:</strong> <span className="font-bold text-green-700">${amount.toFixed(2)} USD</span></div>
                <div className="text-green-600 font-medium">🎉 You saved $50.00!</div>
              </div>
            ) : (
              <div><strong>Amount:</strong> ${amount.toFixed(2)} USD</div>
            )}
            <div><strong>Fee Type:</strong> {feeType.replace('_', ' ')}</div>
            <div><strong>Confirmation Code:</strong> {paymentDetails.confirmationCode}</div>
            <div><strong>Payment Date:</strong> {paymentDetails.paymentDate}</div>
            <div><strong>Payment ID:</strong> {zellePaymentId}</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-blue-800 mb-2">What happens next?</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>✅ Payment confirmation uploaded</div>
            <div>⏳ Automatic validation in progress</div>
            <div>🚀 Access will be granted automatically</div>
            <div>📧 You'll receive confirmation once complete</div>
          </div>
        </div>
        <button
          onClick={resetForm}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Submit Another Payment
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {step === 'instructions' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Zelle Payment Instructions
            </h3>
            <p className="text-gray-600">
              Follow these steps to complete your payment via Zelle
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Step 1: Make the Zelle Payment
            </h4>
            <div className="space-y-2 text-sm text-blue-700">
              {(() => {
                console.log('🔍 [ZelleCheckout] Verificando condições de desconto:', {
                  discount_applied: metadata?.discount_applied,
                  original_amount: metadata?.original_amount,
                  condition: metadata?.discount_applied && metadata?.original_amount
                });
                return metadata?.discount_applied && metadata?.original_amount ? (
                  <div className="space-y-1">
                    <p><strong>Original Amount:</strong> ${metadata.original_amount.toFixed(2)} USD</p>
                    <p><strong>Discount Applied:</strong> -$50.00 USD</p>
                    <p><strong>Final Amount:</strong> <span className="font-bold text-green-700">${amount.toFixed(2)} USD</span></p>
                    <p className="text-green-600 font-medium">🎉 You saved $50.00!</p>
                  </div>
                ) : (
                  <p><strong>Amount:</strong> ${amount.toFixed(2)} USD</p>
                );
              })()}
              <p><strong>Recipient:</strong> [Zelle recipient details will be provided]</p>
              <p><strong>Note:</strong> Include your confirmation code in the payment note</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-3 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Important Requirements
            </h4>
            <div className="space-y-2 text-sm text-amber-700">
              <p>Your payment confirmation must include:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Confirmation code</li>
                <li>Payment date</li>
                <li>Amount paid</li>
                <li>Recipient information</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setStep('upload')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            I've Made the Payment - Continue
          </button>
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Upload Payment Confirmation
            </h3>
            <p className="text-gray-600">
              Please provide the payment details and upload a screenshot
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <X className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmation Code *
              </label>
              <input
                type="text"
                value={paymentDetails.confirmationCode}
                onChange={(e) => handleInputChange('confirmationCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the confirmation code from your Zelle payment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDetails.paymentDate}
                onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email *
              </label>
              <input
                type="email"
                value={paymentDetails.recipientEmail}
                onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address of the Zelle recipient"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Name *
              </label>
              <input
                type="text"
                value={paymentDetails.recipientName}
                onChange={(e) => handleInputChange('recipientName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full name of the Zelle recipient"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Confirmation Screenshot *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                {comprovantePreview ? (
                  <div className="space-y-4">
                    <img
                      src={comprovantePreview}
                      alt="Payment confirmation preview"
                      className="max-w-full h-48 object-contain mx-auto rounded-lg border border-gray-200"
                    />
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => {
                          setComprovanteFile(null);
                          setComprovantePreview(null);
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                      <span className="text-gray-500">|</span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Change File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG up to 5MB
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Select File
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep('instructions')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Submit Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
