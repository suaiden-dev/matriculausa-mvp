import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import './i18n'; // Importar i18n para inicializar
// DEV: captura automática de requisições sem interação do usuário
import './lib/autoRequestCapture';

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
