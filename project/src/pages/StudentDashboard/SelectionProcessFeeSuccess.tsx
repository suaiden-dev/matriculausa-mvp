import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomLoading from '../../components/CustomLoading';
import { CheckCircle } from 'lucide-react';
import { useDynamicFees } from '../../hooks/useDynamicFees';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

const SelectionProcessFeeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const isPixPayment = params.get('pix_payment') === 'true';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectionProcessFeeAmount } = useDynamicFees();
  const { t } = useTranslation();

  // Função para fazer polling do status do PIX (otimizada para webhook)
  const pollPixPaymentStatus = async () => {
    const maxAttempts = 30; // 5 minutos (10s * 30)
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      console.log(`[PIX] Tentativa ${attempts}/${maxAttempts} - Verificando se webhook processou PIX...`);
      
      try {
        const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
        const EDGE_FUNCTION_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-selection-process-fee`;
        let token = null;
        try {
          const raw = localStorage.getItem(`sb-${SUPABASE_PROJECT_URL.split('//')[1].split('.')[0]}-auth-token`);
          if (raw) {
            const tokenObj = JSON.parse(raw);
            token = tokenObj?.access_token || null;
          }
        } catch (e) {
          token = null;
        }
        
        const response = await fetch(EDGE_FUNCTION_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ sessionId }),
        });
        
        const data = await response.json();
        console.log(`[PIX] Resposta da API (tentativa ${attempts}):`, data);
        
        // Se for PIX e estiver completo, redirecionar imediatamente
        if (data.payment_method === 'pix' && data.status === 'complete') {
          console.log('[PIX] ✅ Webhook processou PIX! Redirecionando...');
          localStorage.removeItem('last_payment_method');
          navigate('/student/dashboard/scholarships');
          return;
        }
        
        // Se não for PIX, processar normalmente
        if (data.payment_method !== 'pix' && data.status === 'complete') {
          console.log('[PIX] Pagamento não-PIX confirmado, processando normalmente...');
          setLoading(false);
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.log('[PIX] ⏰ Timeout após 5 minutos - Redirecionando mesmo assim...');
          localStorage.removeItem('last_payment_method');
          navigate('/student/dashboard/scholarships');
          return;
        }
        
        // Aguardar 10 segundos antes da próxima tentativa
        console.log(`[PIX] ⏳ Aguardando webhook processar... (${attempts}/${maxAttempts})`);
        setTimeout(poll, 10000);
        
      } catch (error) {
        console.error('[PIX] ❌ Erro no polling:', error);
        if (attempts >= maxAttempts) {
          console.log('[PIX] ❌ Erro persistente - Redirecionando para dashboard...');
          localStorage.removeItem('last_payment_method');
          navigate('/student/dashboard/scholarships');
        } else {
          console.log(`[PIX] ⏳ Tentando novamente em 10s... (${attempts}/${maxAttempts})`);
          setTimeout(poll, 10000);
        }
      }
    };
    
    poll();
  };

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setError('Session ID not found in URL.');
        setLoading(false);
        return;
      }

      // Verificar se é pagamento PIX
      if (isPixPayment) {
        console.log('[PIX] Pagamento PIX detectado - iniciando polling para webhook...');
        // Iniciar polling para verificar se webhook já processou
        await pollPixPaymentStatus();
        return;
      }

      // Verificar imediatamente se PIX já foi pago
      console.log('[PIX] Verificando status imediato do PIX...');
      try {
        const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
        const EDGE_FUNCTION_ENDPOINT = `${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-selection-process-fee`;
        let token = null;
        try {
          const raw = localStorage.getItem(`sb-${SUPABASE_PROJECT_URL.split('//')[1].split('.')[0]}-auth-token`);
          if (raw) {
            const tokenObj = JSON.parse(raw);
            token = tokenObj?.access_token || null;
          }
        } catch (e) {
          token = null;
        }
        
        const response = await fetch(EDGE_FUNCTION_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ sessionId }),
        });
        
        const data = await response.json();
        console.log('[PIX] Resposta da verificação:', data);
        
        // Se PIX já foi pago, redirecionar imediatamente
        if (data.payment_method === 'pix' && data.status === 'complete') {
          console.log('[PIX] PIX já foi pago! Redirecionando imediatamente...');
          localStorage.removeItem('last_payment_method');
          const redirectUrl = data.redirect_url || '/student/dashboard/scholarships';
          console.log('[PIX] Redirecionando para:', redirectUrl);
          navigate(redirectUrl);
          return;
        }
        
        // Se não for PIX, processar normalmente
        if (data.payment_method !== 'pix' && data.status === 'complete') {
          console.log('[PIX] Pagamento não-PIX confirmado, processando normalmente...');
          setLoading(false);
          return;
        }
        
        // Se ainda não foi pago, iniciar polling
        console.log('[PIX] PIX ainda não foi pago, iniciando polling...');
        await pollPixPaymentStatus();
        
      } catch (error) {
        console.error('[PIX] Erro na verificação inicial:', error);
        // Em caso de erro, iniciar polling mesmo assim
        await pollPixPaymentStatus();
      }
    };
    verifySession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <CustomLoading 
            color="green" 
            title={t('successPages.selectionProcessFee.verifying')} 
            message={t('successPages.selectionProcessFee.pleaseWait')} 
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-red-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
          <svg className="h-16 w-16 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
          </svg>
          <h1 className="text-3xl font-bold text-red-700 mb-2">{t('successPages.selectionProcessFee.errorTitle')}</h1>
          <p className="text-slate-700 mb-6 text-center">
            {t('successPages.selectionProcessFee.errorMessage')}<br/>
            {t('successPages.selectionProcessFee.errorRetry')}
          </p>
          <button 
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300" 
            onClick={() => navigate('/student/dashboard/scholarships')}
          >
            {t('successPages.selectionProcessFee.button')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
        <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
        <h1 className="text-3xl font-bold text-green-700 mb-2 text-center">{t('successPages.selectionProcessFee.title')}</h1>
        <p className="text-slate-700 mb-6 text-center">
          Seu pagamento de ${selectionProcessFeeAmount?.toFixed(2) || '400.00'} foi processado com sucesso.<br/>
          {t('successPages.selectionProcessFee.message')}
        </p>
        <button
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300"
          onClick={() => navigate('/student/dashboard/scholarships')}
        >
          {t('successPages.selectionProcessFee.button')}
        </button>
      </div>
    </div>
  );
};

export default SelectionProcessFeeSuccess; 