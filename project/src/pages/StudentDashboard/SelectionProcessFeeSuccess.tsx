import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CustomLoading from '../../components/CustomLoading';
import { CheckCircle } from 'lucide-react';
import { useDynamicFees } from '../../hooks/useDynamicFees';
import { useTranslation } from 'react-i18next';

const SelectionProcessFeeSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectionProcessFee } = useDynamicFees();
  const { t } = useTranslation();

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setError('Session ID not found in URL.');
        setLoading(false);
        return;
      }
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
        if (!response.ok || data.status !== 'complete') {
          throw new Error(data.error || data.message || 'Failed to verify session.');
        }
      } catch (err: any) {
        setError(err.message || 'Error verifying payment.');
      } finally {
        setLoading(false);
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
        <h1 className="text-3xl font-bold text-green-700 mb-2">{t('successPages.selectionProcessFee.title')}</h1>
        <p className="text-slate-700 mb-6 text-center">
          {t('successPages.selectionProcessFee.description', { amount: selectionProcessFee })}<br/>
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