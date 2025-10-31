import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import './i18n'; // Importar i18n para inicializar

// Ativar interceptor de requisições Supabase O MAIS CEDO POSSÍVEL
// ANTES do React renderizar, para capturar todas as requisições do carregamento inicial
if (typeof window !== 'undefined') {
  // Verificar se deve ativar automaticamente
  const shouldAutoActivate = localStorage.getItem('requestTracker:autoActivate') === 'true';
  
  if (shouldAutoActivate) {
    // Ativar de forma síncrona imediatamente
    // Os módulos já devem estar carregados ou serão carregados quando necessário
    setTimeout(() => {
      import('./lib/supabaseRequestInterceptor').then(({ activateSupabaseInterceptor }) => {
        activateSupabaseInterceptor();
        import('./lib/requestTracker').then(({ requestTracker }) => {
          requestTracker.enable();
        });
      });
    }, 0);
  }
}

// Inicialização simplificada para evitar problemas no mobile
const rootElement = document.getElementById('root');

if (rootElement) {
  // Remover loading do mobile quando React carregar
  const mobileLoading = document.getElementById('mobile-loading');
  if (mobileLoading) {
    mobileLoading.remove();
  }
  
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </StrictMode>
  );
} else {
  console.error('❌ Elemento root não encontrado');
}
