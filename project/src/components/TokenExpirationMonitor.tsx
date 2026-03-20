import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const TokenExpirationMonitor: React.FC = () => {
  const { user } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchTokenInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('email_configurations')
          .select('*')
          .eq('provider_type', 'microsoft')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Erro ao buscar token info:', error);
          return;
        }

        if (data && data.length > 0) {
          const token = data[0];
          setTokenInfo(token);
          
          const expiresAt = new Date(token.oauth_token_expires_at);
          const now = new Date();
          const diffMs = expiresAt.getTime() - now.getTime();
          
          if (diffMs <= 0) {
            setIsExpired(true);
            setTimeRemaining('EXPIRADO');
          } else {
            const minutes = Math.floor(diffMs / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);
            setTimeRemaining(`${minutes}m ${seconds}s`);
            setIsExpired(false);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar token info:', error);
      }
    };

    fetchTokenInfo();
    const interval = setInterval(fetchTokenInfo, 1000); // Atualizar a cada segundo

    return () => clearInterval(interval);
  }, [user]);

  if (!tokenInfo) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800">Monitor de Token Microsoft</h3>
        <p className="text-yellow-700">Carregando informações do token...</p>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg ${
      isExpired 
        ? 'bg-red-50 border-red-200' 
        : timeRemaining.includes('m') && parseInt(timeRemaining.split('m')[0]) < 5
        ? 'bg-orange-50 border-orange-200'
        : 'bg-green-50 border-green-200'
    }`}>
      <h3 className="text-lg font-semibold mb-2">
        🔍 Monitor de Token Microsoft
      </h3>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-medium">Email:</span>
          <span>{tokenInfo.email_address}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium">Refresh Token:</span>
          <span className={tokenInfo.oauth_refresh_token ? 'text-green-600' : 'text-red-600'}>
            {tokenInfo.oauth_refresh_token ? '✅ Presente' : '❌ Ausente'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium">Tempo Restante:</span>
          <span className={isExpired ? 'text-red-600 font-bold' : 'text-blue-600'}>
            {timeRemaining}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium">Status:</span>
          <span className={isExpired ? 'text-red-600 font-bold' : 'text-green-600'}>
            {isExpired ? '🔴 EXPIRADO' : '🟢 Ativo'}
          </span>
        </div>
      </div>
      
      {isExpired && (
        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
          <p className="text-red-800 font-medium">
            ⚠️ Token expirado! O sistema deve usar MSAL para renovação automática.
          </p>
        </div>
      )}
      
      {!isExpired && parseInt(timeRemaining.split('m')[0]) < 5 && (
        <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded">
          <p className="text-orange-800 font-medium">
            ⚠️ Token expira em menos de 5 minutos! Monitorando renovação automática...
          </p>
        </div>
      )}
    </div>
  );
};

export default TokenExpirationMonitor;
