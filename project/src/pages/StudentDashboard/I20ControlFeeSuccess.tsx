import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const I20ControlFeeSuccess: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    setSessionId(sessionId);
    if (!sessionId) {
      setError('Session ID not found.');
      setLoading(false);
      return;
    }
    const verifySession = async () => {
      try {
        const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Usuário não autenticado.');
        const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/verify-stripe-session-i20-control-fee`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sessionId })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'Failed to verify payment.');
        if (result.status !== 'complete') {
          navigate('/student/dashboard/i20-control-fee-error');
          return;
        }
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    verifySession();
  }, [navigate]);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${error ? 'bg-red-50' : 'bg-green-50'} px-4`}>
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full flex flex-col items-center">
        {error ? (
          <>
            <svg className="h-16 w-16 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
            </svg>
            <h1 className="text-3xl font-bold text-red-700 mb-2">Erro no pagamento do I-20 Control Fee</h1>
            <p className="text-slate-700 mb-6 text-center">
              Ocorreu um problema ao processar seu pagamento de <span className="font-bold">$900</span>.<br/>
              Por favor, tente novamente. Se o erro persistir, entre em contato com o suporte.
            </p>
            <Link to="/student/dashboard/applications" className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all duration-300">
              Voltar para Minhas Aplicações
            </Link>
          </>
        ) : loading ? (
          <>
            <svg className="h-16 w-16 text-green-600 mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
            <h1 className="text-3xl font-bold text-green-700 mb-2">Verificando Pagamento...</h1>
            <p className="text-slate-700 mb-6 text-center">Aguarde enquanto confirmamos seu pagamento.</p>
          </>
        ) : (
          <>
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h1 className="text-3xl font-bold text-green-700 mb-2">Pagamento do I-20 Control Fee realizado com sucesso!</h1>
            <p className="text-slate-700 mb-6 text-center">
              Seu pagamento de <span className="font-bold">$900</span> foi processado com sucesso.<br/>
              Agora sua aplicação seguirá para a próxima etapa.
            </p>
            <Link to="/student/dashboard/applications" className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all duration-300">
              Ir para Minhas Aplicações
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default I20ControlFeeSuccess; 