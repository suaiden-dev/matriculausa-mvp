import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import i18nInstance from './i18n'; // ✅ OTIMIZAÇÃO: Importar instância para aguardar inicialização

// ✅ OTIMIZAÇÃO: Aguardar i18n inicializar antes de renderizar
// Isso evita bloqueio durante o carregamento inicial
const rootElement = document.getElementById('root');

if (rootElement) {
  // Remover loading do mobile quando React carregar
  const mobileLoading = document.getElementById('mobile-loading');
  if (mobileLoading) {
    mobileLoading.remove();
  }
  
  // Aguardar i18n inicializar (já é uma Promise)
  i18nInstance.then(() => {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </StrictMode>
    );
  }).catch((error) => {
    console.error('Error initializing i18n:', error);
    // Renderizar mesmo se i18n falhar
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </StrictMode>
    );
  });
} else {
  console.error('❌ Elemento root não encontrado');
}
