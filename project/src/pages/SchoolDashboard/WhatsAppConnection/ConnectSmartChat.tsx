import { useState, useEffect } from 'react';
import { 
  ExternalLink, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Mail,
  Lock
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';

interface ChatwootAccount {
  id: string;
  user_id: string;
  chatwoot_user_name: string;
  chatwoot_email: string;
  chatwoot_password: string;
  chatwoot_access_token?: string;
  chatwoot_instance_name?: string;
  chatwoot_user_id?: string;
  chatwoot_account_id?: string;
  created_at: string;
  updated_at: string;
}

const ConnectSmartChat = () => {
  const { user } = useAuth();
  const [smartchatUrl, setSmartchatUrl] = useState('https://smartchat.suaiden.com/');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [chatwootAccount, setChatwootAccount] = useState<ChatwootAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Carregar credenciais do Chatwoot do usuário
  useEffect(() => {
    const loadChatwootAccount = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('chatwoot_accounts')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar conta Chatwoot:', error);
        } else if (data) {
          setChatwootAccount(data);
        }
      } catch (error) {
        console.error('Erro ao carregar conta Chatwoot:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChatwootAccount();
  }, [user?.id]);

  const handleOpenSmartChat = async () => {
    if (!chatwootAccount?.chatwoot_user_id) {
      setMessage({ type: 'error', text: 'User ID not found. Please configure WhatsApp integration first.' });
      return;
    }

    try {
      setButtonLoading(true);
      
      const response = await fetch('https://nwh.suaiden.com/webhook/chatwoot_sso_link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id_chatwoot: chatwootAccount.chatwoot_user_id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.url || data.sso_url || data.login_url) {
        // Abre o link de SSO retornado pelo n8n
        const ssoUrl = data.url || data.sso_url || data.login_url;
        window.open(ssoUrl, '_blank');
      } else {
        // Fallback para o URL padrão se não houver link específico
        window.open(smartchatUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting SSO link:', error);
      setMessage({ type: 'error', text: 'Failed to get SSO link. Opening default SmartChat URL.' });
      // Fallback para o URL padrão em caso de erro
      window.open(smartchatUrl, '_blank');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar para clipboard:', error);
    }
  };

  // Limpar mensagens após 5 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-3xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#05294E]"></div>
            <span className="ml-4 text-gray-600 text-lg font-medium">Loading credentials...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="bg-gray-50 rounded-3xl shadow-sm border border-gray-200 p-6 md:p-8 lg:p-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4">
            <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-[#05294E]" />
            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 md:mb-3">Connect SmartChat</h2>
              <p className="text-gray-600 text-sm md:text-base lg:text-lg">Access your SmartChat dashboard and manage conversations</p>
            </div>
          </div>
          <button
            onClick={handleOpenSmartChat}
            disabled={buttonLoading}
            className="w-full md:w-auto flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 bg-[#D0151C] text-white rounded-xl md:rounded-2xl hover:bg-[#D0151C]/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          >
            {buttonLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-white"></div>
            ) : (
              <ExternalLink className="h-4 w-4 md:h-5 md:w-5" />
            )}
            {buttonLoading ? 'Getting SSO Link...' : 'Open SmartChat'}
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 md:p-6 rounded-xl md:rounded-2xl border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2 md:gap-3">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <AlertCircle className="h-4 w-4 md:h-5 md:w-5" />
            )}
            <p className="font-medium text-sm md:text-base">{message.text}</p>
          </div>
        </div>
      )}

      {/* Credentials Section */}
      {chatwootAccount ? (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-[#05294E]" />
            <div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Your SmartChat Credentials</h3>
              <p className="text-gray-600 mt-1 text-sm md:text-base">Use these credentials to log in to SmartChat (Chatwoot)</p>
            </div>
          </div>

          <div className="grid gap-6 md:gap-8">
            {/* Email */}
            <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  <Mail className="h-5 w-5 md:h-6 md:w-6 text-[#05294E]" />
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-gray-700 mb-1 md:mb-2">Email</p>
                    <p className="text-base md:text-lg lg:text-xl font-mono text-gray-900 font-medium break-words">{chatwootAccount.chatwoot_email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyToClipboard(chatwootAccount.chatwoot_email, 'email')}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-white border-2 border-gray-300 rounded-lg md:rounded-xl hover:bg-gray-50 hover:border-[#05294E] transition-all duration-200 font-medium text-sm md:text-base"
                >
                  <Copy className="h-3 w-3 md:h-4 md:w-4" />
                  {copiedField === 'email' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  <Lock className="h-5 w-5 md:h-6 md:w-6 text-[#D0151C]" />
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-gray-700 mb-1 md:mb-2">Password</p>
                    <div className="flex items-center gap-2 md:gap-3">
                      <p className="text-base md:text-lg lg:text-xl font-mono text-gray-900 font-medium">
                        {showPassword ? chatwootAccount.chatwoot_password : '••••••••••••••••'}
                      </p>
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyToClipboard(chatwootAccount.chatwoot_password, 'password')}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-white border-2 border-gray-300 rounded-lg md:rounded-xl hover:bg-gray-50 hover:border-[#D0151C] transition-all duration-200 font-medium text-sm md:text-base"
                >
                  <Copy className="h-3 w-3 md:h-4 md:w-4" />
                  {copiedField === 'password' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 md:mt-10 p-4 md:p-6 lg:p-8 bg-[#05294E]/5 border border-[#05294E]/20 rounded-xl md:rounded-2xl">
            <div className="flex items-center gap-3 text-[#05294E]">
              <CheckCircle className="h-5 w-5 md:h-6 md:w-6" />
              <div>
                <p className="font-bold text-base md:text-lg">Account Successfully Configured!</p>
                <p className="text-[#05294E]/80 mt-1 text-sm md:text-base">
                  Your credentials were automatically generated. Use them to log in to SmartChat.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 rounded-3xl border border-yellow-200 p-6 md:p-8 lg:p-10">
          <div className="flex items-center gap-3 md:gap-4 text-yellow-800">
            <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
            <div>
              <p className="font-bold text-base md:text-lg">Account Not Configured</p>
              <p className="text-yellow-700 mt-1 text-sm md:text-base">
                Your SmartChat credentials haven't been generated yet. Configure WhatsApp integration first.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 md:p-8 lg:p-10">
        <h3 className="text-lg md:text-xl font-bold text-[#05294E] mb-6 md:mb-8">How to Connect to SmartChat</h3>
        <div className="grid gap-6 md:gap-8">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-[#05294E] rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm mt-0.5 md:mt-1">1</div>
            <div>
              <p className="font-semibold text-[#05294E] text-base md:text-lg">Get SSO Link</p>
              <p className="text-gray-700 mt-1 md:mt-2 text-sm md:text-base">Click the "Open SmartChat" button to get your personalized login link.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-[#05294E] rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm mt-0.5 md:mt-1">2</div>
            <div>
              <p className="font-semibold text-[#05294E] text-base md:text-lg">Automatic Login</p>
              <p className="text-gray-700 mt-1 md:mt-2 text-sm md:text-base">The SSO link will automatically log you in to your SmartChat dashboard.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-[#05294E] rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm mt-0.5 md:mt-1">3</div>
            <div>
              <p className="font-semibold text-[#05294E] text-base md:text-lg">Manage Your Conversations</p>
              <p className="text-gray-700 mt-1 md:mt-2 text-sm md:text-base">You'll be automatically logged in and can manage all your WhatsApp conversations.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectSmartChat;