import { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import MicrosoftLoginButton from './LoginButton';
import MicrosoftUserProfile from './UserProfile';
import MicrosoftEmailList from './EmailList';
import MicrosoftEmailViewer from './EmailViewer';
import EmailCompose from './EmailCompose';
import MicrosoftLoginHandler from './LoginHandler';
import MicrosoftInbox from './MicrosoftInbox';
import MsalProviderWrapper from '../../providers/MsalProvider';
import { Mail, Shield, Zap, Plus } from 'lucide-react';

interface Email {
  id: string;
  subject: string;
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
}

// Componente interno que usa MSAL
function MicrosoftEmailContent() {
  const { accounts } = useMsal();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isAuthenticated = accounts.length > 0;
  

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email);
  };

  const handleBackToList = () => {
    setSelectedEmail(null);
  };

  const handleEmailSent = () => {
    // Opcional: recarregar a lista de emails
    setShowCompose(false);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <MicrosoftLoginHandler />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated ? (
          // Login Screen
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Conecte sua conta Microsoft
              </h2>
              
              <p className="text-lg text-gray-600 mb-8">
                Acesse sua caixa de entrada do Outlook de forma segura e integrada
              </p>

              <div className="space-y-6">
                <MicrosoftLoginButton />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
                  <div className="text-center p-4">
                    <Shield className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Seguro</h3>
                    <p className="text-sm text-gray-600">
                      Autenticação OAuth2 com Microsoft
                    </p>
                  </div>
                  
                  <div className="text-center p-4">
                    <Zap className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Rápido</h3>
                    <p className="text-sm text-gray-600">
                      Acesso instantâneo aos seus emails
                    </p>
                  </div>
                  
                  <div className="text-center p-4">
                    <Mail className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-2">Integrado</h3>
                    <p className="text-sm text-gray-600">
                      Interface moderna e intuitiva
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
            ) : (
              // Microsoft Inbox with AI Integration
              <MicrosoftInbox />
            )}

        {/* Compose Modal */}
        {showCompose && (
          <EmailCompose
            onClose={() => setShowCompose(false)}
            onSent={handleEmailSent}
          />
        )}
      </main>
    </div>
  );
}

// Componente principal que sempre usa MsalProvider
export default function MicrosoftEmailIntegration() {
  return (
    <MsalProviderWrapper>
      <MicrosoftEmailContent />
    </MsalProviderWrapper>
  );
}
