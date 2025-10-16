import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

// Debug logs para identificar problema
console.log('🚀 main.tsx carregado');
console.log('📱 User Agent:', navigator.userAgent);
console.log('🌐 Location:', window.location.href);

// Inicialização simplificada para evitar problemas no mobile
const rootElement = document.getElementById('root');
console.log('🎯 Root element encontrado:', !!rootElement);

if (rootElement) {
  console.log('✅ Iniciando React...');
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </StrictMode>
  );
  console.log('✅ React renderizado com sucesso');
} else {
  console.error('❌ Elemento root não encontrado');
}
