import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../lib/msalConfig';
import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';

export default function MicrosoftLoginButton() {
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Mail className="w-5 h-5" />
      )}
      {isLoading ? 'Conectando...' : 'Conectar com Microsoft'}
    </button>
  );
}
