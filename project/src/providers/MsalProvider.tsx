import { ReactNode } from 'react';

interface MsalProviderWrapperProps {
  children: ReactNode;
}

export default function MsalProviderWrapper({ children }: MsalProviderWrapperProps) {
  // Por enquanto, retornar children diretamente sem MSAL
  // Isso evita o erro de createContext que está acontecendo na staging
  return <>{children}</>;
}