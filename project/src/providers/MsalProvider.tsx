import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '../lib/msalConfig';
import { ReactNode, useEffect, useState } from 'react';

interface MsalProviderWrapperProps {
  children: ReactNode;
}

export default function MsalProviderWrapper({ children }: MsalProviderWrapperProps) {
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);

  useEffect(() => {
    const instance = new PublicClientApplication(msalConfig);
    
    instance.initialize().then(() => {
      setMsalInstance(instance);
    }).catch((error) => {
      console.error('MSAL initialization failed:', error);
    });
  }, []);

  if (!msalInstance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  );
}
